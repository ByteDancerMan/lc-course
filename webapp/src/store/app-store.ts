import { create } from 'zustand'
import type {
  ChatMessage,
  IngredientItem,
  RecipeCandidate,
  RecipeDetail,
  SessionDetail,
  SessionSummary,
  SystemStatus,
  UploadedImage,
} from '../../shared/types'
import { api } from '@/utils/api'

interface AppState {
  sessions: SessionSummary[]
  activeSessionId: string | null
  activeSession: SessionDetail | null
  uploadedImage: UploadedImage | null
  ingredients: IngredientItem[]
  candidates: RecipeCandidate[]
  recommended: RecipeDetail | null
  visualSummary: string
  systemStatus: SystemStatus | null
  loading: boolean
  chatLoading: boolean
  error: string | null
  bootstrap: () => Promise<void>
  uploadAndAnalyze: (file: File, prompt?: string) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  sendChat: (message: string) => Promise<void>
  revertSession: (targetTurnId: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  uploadedImage: null,
  ingredients: [],
  candidates: [],
  recommended: null,
  visualSummary: '',
  systemStatus: null,
  loading: false,
  chatLoading: false,
  error: null,

  async bootstrap() {
    set({ loading: true, error: null })

    try {
      const [sessionResponse, systemStatus] = await Promise.all([
        api.getSessions(),
        api.getSystemStatus(),
      ])

      set({
        sessions: sessionResponse.sessions,
        systemStatus,
        loading: false,
      })

      if (sessionResponse.sessions[0]) {
        await get().loadSession(sessionResponse.sessions[0].id)
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '初始化失败',
        loading: false,
      })
    }
  },

  async uploadAndAnalyze(file, prompt) {
    set({ loading: true, error: null })

    try {
      const uploadedImage = await api.uploadImage(file)
      const recognized = await api.recognize(uploadedImage.imageUrl)
      const generated = await api.generateRecipe({
        image: uploadedImage,
        ingredients: recognized.ingredients,
        userPrompt: prompt,
      })
      const [sessionResponse, systemStatus] = await Promise.all([
        api.getSession(generated.sessionId),
        api.getSystemStatus(),
      ])

      set({
        uploadedImage,
        ingredients: recognized.ingredients,
        visualSummary: recognized.visualSummary,
        candidates: generated.candidates,
        recommended: generated.recommended,
        activeSessionId: generated.sessionId,
        activeSession: sessionResponse,
        systemStatus,
        loading: false,
      })

      const sessions = await api.getSessions()
      set({ sessions: sessions.sessions })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '上传分析失败',
        loading: false,
      })
    }
  },

  async loadSession(sessionId) {
    set({ loading: true, error: null })

    try {
      const session = await api.getSession(sessionId)
      const latestRecipeTurn = [...session.turns].reverse().find((turn) => turn.recommended)
      const latestIngredientTurn = [...session.turns].reverse().find((turn) => turn.ingredients?.length)

      set({
        activeSessionId: session.id,
        activeSession: session,
        uploadedImage: session.coverImageUrl
          ? {
              imageId: 'existing',
              objectKey: session.coverImageUrl,
              imageUrl: session.coverImageUrl,
              fileName: 'history-image',
              contentType: 'image/jpeg',
            }
          : null,
        candidates: latestRecipeTurn?.candidates ?? [],
        recommended: latestRecipeTurn?.recommended ?? null,
        ingredients: latestIngredientTurn?.ingredients ?? [],
        visualSummary: latestRecipeTurn?.message ?? '',
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '读取会话失败',
        loading: false,
      })
    }
  },

  async sendChat(message) {
    const sessionId = get().activeSessionId

    if (!sessionId) {
      set({ error: '请先上传食材图片并生成一轮菜谱' })
      return
    }

    set({ chatLoading: true, error: null })

    try {
      const response = await api.chat(sessionId, message)
      const session = await api.getSession(sessionId)
      const messages: ChatMessage[] = [
        ...(get().activeSession?.messages ?? []),
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          createdAt: new Date().toISOString(),
        },
        {
          id: response.turnId,
          role: 'assistant',
          content: response.assistantMessage,
          createdAt: new Date().toISOString(),
        },
      ]

      set({
        activeSession: {
          ...session,
          messages,
        },
        recommended: response.recommended ?? get().recommended,
        chatLoading: false,
      })

      const sessions = await api.getSessions()
      set({ sessions: sessions.sessions })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '继续对话失败',
        chatLoading: false,
      })
    }
  },

  async revertSession(targetTurnId) {
    const sessionId = get().activeSessionId

    if (!sessionId) {
      return
    }

    set({ loading: true, error: null })

    try {
      await api.revertSession(sessionId, targetTurnId)
      await get().loadSession(sessionId)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '回退会话失败',
        loading: false,
      })
    }
  },
}))
