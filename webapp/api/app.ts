import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import multer from 'multer'
import path from 'path'
import {
  continueRecipeConversation,
  generateRecipePlan,
  recognizeIngredients,
  suggestSessionTitle,
} from './services/agent-service.js'
import { config } from './config.js'
import {
  createSession,
  getActiveConversation,
  getSession,
  getSessionCounts,
  getSessions,
  revertSession,
  saveImage,
  saveRecipe,
  saveTurn,
  saveTurnIngredients,
} from './database.js'
import { getStorageMode, storeImage } from './services/storage-service.js'

const app: express.Application = express()
// #region debug-point A-C:reporter
const reportDebug = (
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown> = {},
) => {
  void fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'upload-image-500',
      runId: 'post-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(path.join(config.projectRoot, 'storage', 'uploads')))

// #region debug-point C-E:process-errors
process.on('unhandledRejection', (reason) => {
  reportDebug('C', 'api/app.ts:process.unhandledRejection', 'unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  })
})
process.on('uncaughtException', (error) => {
  reportDebug('C', 'api/app.ts:process.uncaughtException', 'uncaught exception', {
    error: error.message,
    stack: error.stack,
  })
})
// #endregion

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

app.post('/api/upload-image', upload.single('image'), async (req: Request, res: Response) => {
  // #region debug-point A-D:upload-entry
  reportDebug('A', 'api/app.ts:/api/upload-image:entry', 'upload route entered', {
    hasFile: Boolean(req.file),
    fileName: req.file?.originalname,
    mimeType: req.file?.mimetype,
    size: req.file?.size,
    storageMode: getStorageMode(),
  })
  // #endregion
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: '未检测到上传图片',
    })
    return
  }

  const uploaded = await storeImage(req.file)
  // #region debug-point A:upload-success
  reportDebug('A', 'api/app.ts:/api/upload-image:success', 'upload route completed', {
    imageId: uploaded.imageId,
    objectKey: uploaded.objectKey,
    imageUrl: uploaded.imageUrl,
  })
  // #endregion

  res.status(200).json(uploaded)
})

app.post('/api/recognize', async (req: Request, res: Response) => {
  const { imageUrl } = req.body as { imageUrl?: string }
  // #region debug-point B:recognize-entry
  reportDebug('B', 'api/app.ts:/api/recognize:entry', 'recognize route entered', {
    hasImageUrl: Boolean(imageUrl),
    imageUrl,
  })
  // #endregion

  if (!imageUrl) {
    res.status(400).json({
      success: false,
      error: '缺少 imageUrl',
    })
    return
  }

  const result = await recognizeIngredients(imageUrl)
  // #region debug-point B:recognize-success
  reportDebug('B', 'api/app.ts:/api/recognize:success', 'recognize route completed', {
    ingredientCount: result.ingredients.length,
    visualSummary: result.visualSummary,
  })
  // #endregion
  res.status(200).json(result)
})

app.post('/api/recipes/generate', async (req: Request, res: Response) => {
  const {
    sessionId,
    image,
    ingredients,
    userPrompt,
  } = req.body as {
    sessionId?: string
    image?: {
      imageId: string
      objectKey: string
      imageUrl: string
      fileName: string
      contentType: string
    }
    ingredients?: any[]
    userPrompt?: string
  }
  // #region debug-point B-C:generate-entry
  reportDebug('B', 'api/app.ts:/api/recipes/generate:entry', 'generate route entered', {
    sessionId,
    hasImage: Boolean(image?.imageUrl),
    ingredientCount: Array.isArray(ingredients) ? ingredients.length : -1,
    hasPrompt: Boolean(userPrompt?.trim()),
  })
  // #endregion

  if (!image?.imageUrl || !Array.isArray(ingredients) || ingredients.length === 0) {
    res.status(400).json({
      success: false,
      error: '缺少生成菜谱所需的图片或食材信息',
    })
    return
  }

  const normalizedSessionId = sessionId || crypto.randomUUID()
  const threadId = `thread-${normalizedSessionId}`
  const conversationHistory = sessionId ? getActiveConversation(normalizedSessionId) : []

  if (!sessionId) {
    createSession(normalizedSessionId, suggestSessionTitle(ingredients), threadId)
    saveImage({
      imageId: image.imageId,
      sessionId: normalizedSessionId,
      objectKey: image.objectKey,
      imageUrl: image.imageUrl,
      fileName: image.fileName,
      contentType: image.contentType,
    })
  }

  const userTurnId = crypto.randomUUID()
  const assistantTurnId = crypto.randomUUID()
  const userMessage = userPrompt?.trim()
    ? userPrompt.trim()
    : `请根据这些食材推荐能做的菜：${ingredients.map((item) => item.name).join('、')}`

  saveTurn({
    id: userTurnId,
    sessionId: normalizedSessionId,
    parentTurnId: conversationHistory.at(-1)?.id ?? null,
    role: 'user',
    message: userMessage,
  })
  saveTurnIngredients(userTurnId, ingredients)

  const plan = await generateRecipePlan({
    imageUrl: image.imageUrl,
    ingredients,
    userPrompt,
    history: conversationHistory,
  })

  saveTurn({
    id: assistantTurnId,
    sessionId: normalizedSessionId,
    parentTurnId: userTurnId,
    role: 'assistant',
    message: plan.assistantMessage,
  })
  saveTurnIngredients(assistantTurnId, ingredients)
  saveRecipe(
    assistantTurnId,
    plan.recommended,
    plan.candidates,
    plan.recommended.summary,
    plan.candidates[0]?.difficulty ?? '简单',
    plan.candidates[0]?.timeCost ?? '15 分钟',
  )
  // #region debug-point B:generate-success
  reportDebug('B', 'api/app.ts:/api/recipes/generate:success', 'generate route completed', {
    sessionId: normalizedSessionId,
    turnId: assistantTurnId,
    candidateCount: plan.candidates.length,
    recommendedTitle: plan.recommended.title,
  })
  // #endregion

  res.status(200).json({
    ...plan,
    sessionId: normalizedSessionId,
    turnId: assistantTurnId,
  })
})

app.post('/api/chat', async (req: Request, res: Response) => {
  const { sessionId, message } = req.body as {
    sessionId?: string
    message?: string
  }

  if (!sessionId || !message?.trim()) {
    res.status(400).json({
      success: false,
      error: '缺少 sessionId 或 message',
    })
    return
  }

  const session = getSession(sessionId)

  if (!session) {
    res.status(404).json({
      success: false,
      error: '未找到对应会话',
    })
    return
  }

  const history = getActiveConversation(sessionId)
  const userTurnId = crypto.randomUUID()
  const assistantTurnId = crypto.randomUUID()

  saveTurn({
    id: userTurnId,
    sessionId,
    parentTurnId: history.at(-1)?.id ?? null,
    role: 'user',
    message: message.trim(),
  })

  const result = await continueRecipeConversation({
    message: message.trim(),
    session,
    history,
  })

  saveTurn({
    id: assistantTurnId,
    sessionId,
    parentTurnId: userTurnId,
    role: 'assistant',
    message: result.assistantMessage,
  })

  if (result.recommended) {
    saveRecipe(
      assistantTurnId,
      result.recommended,
      [],
      result.recommended.summary,
      '中等',
      '20 分钟',
    )
  }

  res.status(200).json({
    turnId: assistantTurnId,
    assistantMessage: result.assistantMessage,
    recommended: result.recommended,
  })
})

app.get('/api/sessions', (_req: Request, res: Response) => {
  res.status(200).json({
    sessions: getSessions(),
  })
})

app.get('/api/sessions/:sessionId', (req: Request, res: Response) => {
  const session = getSession(req.params.sessionId)

  if (!session) {
    res.status(404).json({
      success: false,
      error: '未找到对应会话',
    })
    return
  }

  res.status(200).json(session)
})

app.post('/api/sessions/:sessionId/revert', (req: Request, res: Response) => {
  const { targetTurnId } = req.body as { targetTurnId?: string }

  if (!targetTurnId) {
    res.status(400).json({
      success: false,
      error: '缺少 targetTurnId',
    })
    return
  }

  revertSession(req.params.sessionId, targetTurnId)

  res.status(200).json({
    sessionId: req.params.sessionId,
    activeTurnId: targetTurnId,
    branchFromTurnId: targetTurnId,
  })
})

app.get('/api/system/status', (_req: Request, res: Response) => {
  const counts = getSessionCounts()

  res.status(200).json({
    storageMode: getStorageMode(),
    visionModel: config.visionModel,
    recipeModel: config.recipeModel,
    tavilyEnabled: Boolean(config.tavilyApiKey),
    sessionCount: counts.sessionCount,
    turnCount: counts.turnCount,
    latestActivity: getSessions().slice(0, 3),
  })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  // #region debug-point C:error-middleware
  reportDebug('C', 'api/app.ts:error-middleware', 'express error middleware triggered', {
    error: error.message,
    stack: error.stack,
  })
  // #endregion
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
