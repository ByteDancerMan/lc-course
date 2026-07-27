export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  createdAt: string
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessage: string
}

export interface SessionDetail {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface UploadedImage {
  imageId: string
  imageUrl: string
  fileName: string
  contentType: string
}

export interface KnowledgeDocument {
  id: string
  filename: string
  fileType: string
  chunkCount: number
  createdAt: string
}
