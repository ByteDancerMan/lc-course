import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import type {
  ChatMessage,
  IngredientItem,
  RecipeCandidate,
  RecipeDetail,
  SessionDetail,
  SessionSummary,
  SessionTurn,
} from '../shared/types.js'
import { config } from './config.js'

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })

const db = new Database(config.dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_session_id ON images(session_id);

CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  parent_turn_id TEXT,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  checkpoint_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_parent_turn_id ON turns(parent_turn_id);

CREATE TABLE IF NOT EXISTS turn_ingredients (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL,
  name TEXT NOT NULL,
  confidence REAL NOT NULL,
  estimated_amount TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turn_ingredients_turn_id ON turn_ingredients(turn_id);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL,
  recommended_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  time_cost TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  candidates_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_turn_id ON recipes(turn_id);
`)

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function buildSessionTurns(rows: any[]): SessionTurn[] {
  return rows.map((row) => ({
    id: row.id,
    parentTurnId: row.parent_turn_id,
    role: row.role,
    message: row.message,
    createdAt: row.created_at,
    isActive: Boolean(row.is_active),
    imageUrl: row.image_url ?? undefined,
    ingredients: row.ingredients_json
      ? parseJson<IngredientItem[]>(row.ingredients_json, [])
      : undefined,
    recommended: row.detail_json
      ? parseJson<RecipeDetail | null>(row.detail_json, null)
      : null,
    candidates: row.candidates_json
      ? parseJson<RecipeCandidate[]>(row.candidates_json, [])
      : [],
  }))
}

export function createSession(sessionId: string, title: string, threadId: string) {
  const now = new Date().toISOString()

  db.prepare(
    `
    INSERT INTO sessions (id, title, thread_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(sessionId, title, threadId, now, now)
}

export function touchSession(sessionId: string) {
  db.prepare(
    `
    UPDATE sessions
    SET updated_at = ?
    WHERE id = ?
  `,
  ).run(new Date().toISOString(), sessionId)
}

export function saveImage(params: {
  imageId: string
  sessionId: string
  objectKey: string
  imageUrl: string
  fileName: string
  contentType: string
}) {
  db.prepare(
    `
    INSERT INTO images (id, session_id, object_key, image_url, file_name, content_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    params.imageId,
    params.sessionId,
    params.objectKey,
    params.imageUrl,
    params.fileName,
    params.contentType,
    new Date().toISOString(),
  )
  touchSession(params.sessionId)
}

export function saveTurn(params: {
  id: string
  sessionId: string
  parentTurnId: string | null
  role: 'user' | 'assistant'
  message: string
  checkpointId?: string | null
  isActive?: boolean
}) {
  db.prepare(
    `
    INSERT INTO turns (id, session_id, parent_turn_id, role, message, checkpoint_id, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    params.id,
    params.sessionId,
    params.parentTurnId,
    params.role,
    params.message,
    params.checkpointId ?? null,
    params.isActive === false ? 0 : 1,
    new Date().toISOString(),
  )
  touchSession(params.sessionId)
}

export function saveTurnIngredients(turnId: string, ingredients: IngredientItem[]) {
  const statement = db.prepare(
    `
    INSERT INTO turn_ingredients (id, turn_id, name, confidence, estimated_amount, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  )

  const transaction = db.transaction((items: IngredientItem[]) => {
    db.prepare('DELETE FROM turn_ingredients WHERE turn_id = ?').run(turnId)

    for (const item of items) {
      statement.run(
        `${turnId}:${item.id}`,
        turnId,
        item.name,
        item.confidence,
        item.estimatedAmount,
        item.category,
      )
    }
  })

  transaction(ingredients)
}

export function saveRecipe(
  turnId: string,
  recipe: RecipeDetail,
  candidates: RecipeCandidate[],
  summary: string,
  difficulty: string,
  timeCost: string,
) {
  db.prepare(
    `
    INSERT INTO recipes (id, turn_id, recommended_title, summary, difficulty, time_cost, detail_json, candidates_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    crypto.randomUUID(),
    turnId,
    recipe.title,
    summary,
    difficulty,
    timeCost,
    JSON.stringify(recipe),
    JSON.stringify(candidates),
    new Date().toISOString(),
  )
}

export function getSessions(): SessionSummary[] {
  const rows = db
    .prepare(
      `
      SELECT
        s.id,
        s.title,
        s.created_at,
        s.updated_at,
        COALESCE(
          (
            SELECT message
            FROM turns t
            WHERE t.session_id = s.id
            ORDER BY t.created_at DESC
            LIMIT 1
          ),
          '还没有生成结果'
        ) AS last_message,
        (
          SELECT image_url
          FROM images i
          WHERE i.session_id = s.id
          ORDER BY i.created_at DESC
          LIMIT 1
        ) AS cover_image_url
      FROM sessions s
      ORDER BY s.updated_at DESC
    `,
    )
    .all() as any[]

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage: row.last_message,
    coverImageUrl: row.cover_image_url ?? undefined,
  }))
}

export function getSession(sessionId: string): SessionDetail | null {
  const sessionRow = db
    .prepare(
      `
      SELECT *
      FROM sessions
      WHERE id = ?
    `,
    )
    .get(sessionId) as any

  if (!sessionRow) {
    return null
  }

  const turnRows = db
    .prepare(
      `
      SELECT
        t.*,
        i.image_url,
        (
          SELECT json_group_array(
            json_object(
              'id', ti.id,
              'name', ti.name,
              'confidence', ti.confidence,
              'estimatedAmount', ti.estimated_amount,
              'category', ti.category
            )
          )
          FROM turn_ingredients ti
          WHERE ti.turn_id = t.id
        ) AS ingredients_json,
        (
          SELECT detail_json
          FROM recipes r
          WHERE r.turn_id = t.id
          LIMIT 1
        ) AS detail_json,
        (
          SELECT candidates_json
          FROM recipes r
          WHERE r.turn_id = t.id
          LIMIT 1
        ) AS candidates_json
      FROM turns t
      LEFT JOIN images i ON i.session_id = t.session_id
      WHERE t.session_id = ?
      ORDER BY t.created_at ASC
    `,
    )
    .all(sessionId) as any[]

  const turns = buildSessionTurns(turnRows)
  const messages: ChatMessage[] = turns.map((turn) => ({
    id: turn.id,
    role: turn.role,
    content: turn.message,
    createdAt: turn.createdAt,
  }))

  const lastMessage = messages.at(-1)?.content ?? '还没有生成结果'
  const coverImageUrl = turnRows.find((row) => row.image_url)?.image_url ?? undefined

  return {
    id: sessionRow.id,
    title: sessionRow.title,
    threadId: sessionRow.thread_id,
    createdAt: sessionRow.created_at,
    updatedAt: sessionRow.updated_at,
    lastMessage,
    coverImageUrl,
    messages,
    turns,
  }
}

export function getActiveConversation(sessionId: string): ChatMessage[] {
  const rows = db
    .prepare(
      `
      SELECT id, role, message, created_at
      FROM turns
      WHERE session_id = ? AND is_active = 1
      ORDER BY created_at ASC
    `,
    )
    .all(sessionId) as any[]

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.message,
    createdAt: row.created_at,
  }))
}

export function getSessionCounts() {
  const sessions = db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as any
  const turns = db.prepare('SELECT COUNT(*) AS count FROM turns').get() as any

  return {
    sessionCount: Number(sessions.count ?? 0),
    turnCount: Number(turns.count ?? 0),
  }
}

export function revertSession(sessionId: string, targetTurnId: string) {
  const clearStatement = db.prepare(
    `
    UPDATE turns
    SET is_active = 0
    WHERE session_id = ?
  `,
  )
  const activateStatement = db.prepare(
    `
    UPDATE turns
    SET is_active = 1
    WHERE session_id = ?
      AND created_at <= (
        SELECT created_at
        FROM turns
        WHERE id = ?
      )
  `,
  )

  const transaction = db.transaction(() => {
    clearStatement.run(sessionId)
    activateStatement.run(sessionId, targetTurnId)
    touchSession(sessionId)
  })

  transaction()
}
