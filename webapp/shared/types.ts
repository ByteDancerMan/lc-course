export type IngredientCategory =
  | '蔬菜'
  | '肉类'
  | '海鲜'
  | '调味料'
  | '主食'
  | '菌菇'
  | '水果'
  | '其他'

export type DifficultyLevel = '简单' | '中等' | '进阶'

export interface IngredientItem {
  id: string
  name: string
  confidence: number
  estimatedAmount: string
  category: IngredientCategory
}

export interface ReferenceLink {
  title: string
  url: string
}

export interface RecipeCandidate {
  id: string
  title: string
  summary: string
  difficulty: DifficultyLevel
  timeCost: string
  extraIngredients: string[]
}

export interface RecipeDetail {
  title: string
  summary: string
  tips: string[]
  steps: string[]
  references: ReferenceLink[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface UploadedImage {
  imageId: string
  objectKey: string
  imageUrl: string
  fileName: string
  contentType: string
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessage: string
  coverImageUrl?: string
}

export interface SessionTurn {
  id: string
  parentTurnId: string | null
  role: 'user' | 'assistant'
  message: string
  createdAt: string
  isActive: boolean
  imageUrl?: string
  ingredients?: IngredientItem[]
  recommended?: RecipeDetail | null
  candidates?: RecipeCandidate[]
}

export interface SessionDetail extends SessionSummary {
  threadId: string
  messages: ChatMessage[]
  turns: SessionTurn[]
}

export interface RecognitionResponse {
  ingredients: IngredientItem[]
  visualSummary: string
}

export interface RecipeGenerationResponse {
  sessionId: string
  turnId: string
  candidates: RecipeCandidate[]
  recommended: RecipeDetail
  assistantMessage: string
}

export interface RevertResponse {
  sessionId: string
  activeTurnId: string
  branchFromTurnId: string
}

export interface SystemStatus {
  storageMode: 'oss' | 'local'
  visionModel: string
  recipeModel: string
  tavilyEnabled: boolean
  sessionCount: number
  turnCount: number
  latestActivity: SessionSummary[]
}
