import { create } from 'zustand'
import type { ChatMessage, SessionDetail, SessionSummary } from '../../shared/types'
import { api } from '@/utils/api'

interface AppState {
  sessions: SessionSummary[]
  activeSessionId: string | null
  activeSession: SessionDetail | null
  messages: ChatMessage[]
  streamingText: string
  loading: boolean
  sending: boolean
  bootstrap: () => Promise<void>
  newSession: () => Promise<void>
  selectSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  sendMessage: (text: string, imageUrl?: string) => Promise<void>
  regenerate: (messageId?: string) => Promise<void>
  resetToMessage: (messageId: string) => Promise<void>
  stopStream: () => void
}

export const useAppStore = create<AppState>((set, get) => {
  let abortController: AbortController | null = null

  return {
    sessions: [],
    activeSessionId: null,
    activeSession: null,
    messages: [],
    streamingText: '',
    loading: false,
    sending: false,

    async bootstrap() {
      set({ loading: true })
      try {
        const { sessions } = await api.getSessions()
        set({ sessions, loading: false })
        if (sessions.length > 0) {
          await get().selectSession(sessions[0].id)
        }
      } catch {
        set({ loading: false })
      }
    },

    async newSession() {
      set({ loading: true })
      try {
        const session = await api.createSession()
        set(state => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          activeSession: { ...session, messages: [] },
          messages: [],
          streamingText: '',
          loading: false,
        }))
      } catch {
        set({ loading: false })
      }
    },

    async selectSession(id: string) {
      set({ loading: true })
      try {
        const session = await api.getSession(id)
        set({
          activeSessionId: id,
          activeSession: session,
          messages: session.messages,
          streamingText: '',
          loading: false,
        })
      } catch {
        set({ loading: false })
      }
    },

    async deleteSession(id: string) {
      try {
        await api.deleteSession(id)
        const { sessions, activeSessionId } = get()
        const filtered = sessions.filter(s => s.id !== id)
        set({ sessions: filtered })
        if (activeSessionId === id) {
          if (filtered.length > 0) {
            await get().selectSession(filtered[0].id)
          } else {
            set({ activeSessionId: null, activeSession: null, messages: [], streamingText: '' })
          }
        }
      } catch { /* ignore */ }
    },

    stopStream() {
      if (abortController) {
        abortController.abort()
        abortController = null
      }
    },

    async regenerate(messageId?: string) {
      const { activeSessionId, messages } = get()
      if (!activeSessionId) return
      // 先从前端删除该消息及其之后的所有消息
      if (messageId) {
        const idx = messages.findIndex(m => m.id === messageId)
        if (idx !== -1) {
          const remaining = messages.slice(0, idx)
          set({ messages: remaining, streamingText: '' })
        }
      }
      set({ sending: true })
      try {
        const controller = await api.regenerateStream(
          activeSessionId,
          messageId,
          (chunk) => {
            set(state => ({ streamingText: state.streamingText + chunk }))
          },
          () => {
            set({ sending: false })
            api.getSession(activeSessionId!).then(session => {
              set({ activeSession: session, messages: session.messages, streamingText: '' })
            }).catch(() => {})
            api.getSessions().then(({ sessions }) => set({ sessions })).catch(() => {})
          },
        )
        abortController = controller
      } catch {
        set({ sending: false })
        const { activeSessionId } = get()
        if (activeSessionId) {
          api.getSession(activeSessionId).then(session => {
            set({ activeSession: session, messages: session.messages, streamingText: '' })
          }).catch(() => {})
        }
      }
    },

    async resetToMessage(messageId: string) {
      const { activeSessionId } = get()
      if (!activeSessionId) return
      set({ loading: true })
      try {
        const session = await api.resetToMessage(activeSessionId, messageId)
        set({
          activeSession: session,
          messages: session.messages,
          streamingText: '',
          loading: false,
        })
      } catch {
        set({ loading: false })
      }
    },

    async sendMessage(text: string, imageUrl?: string) {
      const { activeSessionId, messages } = get()
      const tempUserMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        imageUrl,
        createdAt: new Date().toISOString(),
      }

      set(state => ({
        messages: [...state.messages, tempUserMsg],
        sending: true,
        streamingText: '',
      }))

      try {
        const controller = await api.sendMessageStream(
          { sessionId: activeSessionId ?? undefined, message: text, imageUrl, useSearch: true },
          (chunk) => {
            set(state => ({ streamingText: state.streamingText + chunk }))
          },
          (newSessionId) => {
            const { sessions } = get()
            set({ sending: false })
            if (!get().activeSessionId) {
              set({ activeSessionId: newSessionId })
            }
            api.getSessions().then(({ sessions: updated }) => set({ sessions: updated })).catch(() => {})
            api.getSession(newSessionId).then(session => {
              set({
                activeSessionId: newSessionId,
                activeSession: session,
                messages: session.messages,
                streamingText: '',
              })
            }).catch(() => {})
          },
        )
        abortController = controller
      } catch {
        set({ sending: false })
      }
    },
  }
})
