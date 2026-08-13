import type { KnowledgeDocument, SessionDetail, SessionSummary, UploadedImage } from '../../shared/types'

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(error?.error ?? '请求失败')
  }
  return (await response.json()) as T
}

export const api = {
  getSessions() {
    return request<{ sessions: SessionSummary[] }>('/api/sessions')
  },

  createSession() {
    return request<SessionSummary>('/api/sessions', { method: 'POST' })
  },

  getSession(sessionId: string) {
    return request<SessionDetail>(`/api/sessions/${sessionId}`)
  },

  deleteSession(sessionId: string) {
    return request<{ success: boolean }>(`/api/sessions/${sessionId}`, { method: 'DELETE' })
  },

  resetToMessage(sessionId: string, messageId: string) {
    return request<SessionDetail>(`/api/sessions/${sessionId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
  },

  updateSessionTitle(sessionId: string, title: string) {
    return request<{ success: boolean }>(`/api/sessions/${sessionId}/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  },

  sendMessage(params: { sessionId?: string; message: string; imageUrl?: string; useSearch?: boolean }) {
    return request<{ sessionId: string; messageId: string; content: string }>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: false }),
    })
  },

  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request<UploadedImage>('/api/upload', { method: 'POST', body: formData })
  },

  async sendMessageStream(
    params: { sessionId?: string; message: string; imageUrl?: string; useSearch?: boolean },
    onChunk: (text: string) => void,
    onDone: (sessionId: string) => void,
  ): Promise<AbortController> {
    const controller = new AbortController()
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: true }),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error('Stream request failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const read = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) {
                onDone(data.sessionId)
                return
              }
              if (data.content) {
                onChunk(data.content)
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    }
    read().catch((err) => {
      // 用户主动停止（AbortError）时也通知完成，避免前端状态卡住
      if (err instanceof DOMException && err.name === 'AbortError') {
        onDone(params.sessionId ?? '')
      }
    })

    return controller
  },

  async regenerateStream(
    sessionId: string,
    messageId: string | undefined,
    onChunk: (text: string) => void,
    onDone: (sessionId: string) => void,
  ): Promise<AbortController> {
    const controller = new AbortController()
    const response = await fetch('/api/chat/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messageId, useSearch: true }),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error('Regenerate stream failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const read = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) {
                onDone(data.sessionId)
                return
              }
              if (data.content) {
                onChunk(data.content)
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    }
    read().catch(() => {})

    return controller
  },

  uploadKnowledge(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ success: boolean; document: KnowledgeDocument }>('/api/knowledge/upload', { method: 'POST', body: formData })
  },

  listKnowledge() {
    return request<{ success: boolean; documents: KnowledgeDocument[] }>('/api/knowledge/list')
  },

  deleteKnowledge(documentId: string) {
    return request<{ success: boolean }>('/api/knowledge/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })
  },
}
