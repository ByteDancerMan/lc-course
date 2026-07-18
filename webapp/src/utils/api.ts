import type {
  RecognitionResponse,
  RecipeGenerationResponse,
  SessionDetail,
  SessionSummary,
  SystemStatus,
  UploadedImage,
} from '../../shared/types'

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(error?.error ?? '请求失败')
  }

  return (await response.json()) as T
}

export const api = {
  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)

    return request<UploadedImage>('/api/upload-image', {
      method: 'POST',
      body: formData,
    })
  },
  recognize(imageUrl: string) {
    return request<RecognitionResponse>('/api/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    })
  },
  generateRecipe(payload: {
    sessionId?: string
    image: UploadedImage
    ingredients: RecognitionResponse['ingredients']
    userPrompt?: string
  }) {
    return request<RecipeGenerationResponse>('/api/recipes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },
  chat(sessionId: string, message: string) {
    return request<{
      turnId: string
      assistantMessage: string
      recommended?: RecipeGenerationResponse['recommended']
    }>('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, message }),
    })
  },
  getSessions() {
    return request<{ sessions: SessionSummary[] }>('/api/sessions')
  },
  getSession(sessionId: string) {
    return request<SessionDetail>(`/api/sessions/${sessionId}`)
  },
  revertSession(sessionId: string, targetTurnId: string) {
    return request<{ activeTurnId: string }>(`/api/sessions/${sessionId}/revert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetTurnId }),
    })
  },
  getSystemStatus() {
    return request<SystemStatus>('/api/system/status')
  },
}
