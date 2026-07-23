import { Bot, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 px-4 py-5 ${isUser ? '' : 'bg-[#f7f7f8]'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-[#5436da]' : 'bg-[#10a37f]'}`}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {message.imageUrl && (
          <img src={message.imageUrl} alt="upload" className="mb-2 max-h-48 rounded-lg object-cover border border-[#e5e5e5]" />
        )}
        <div className="text-sm leading-7 text-[#1f1f1f] whitespace-pre-wrap">
          {message.content || '...'}
        </div>
      </div>
    </div>
  )
}
