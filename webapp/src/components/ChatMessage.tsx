import { useState } from 'react'
import { Bot, User, Copy, Check, RefreshCw, Undo2 } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { ChatMessage as ChatMessageType } from '../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
  messageIndex: number
  totalMessages: number
  onRegenerate?: () => void
  onResetToHere?: (messageId: string) => void
}

export function ChatMessage({ message, messageIndex, totalMessages, onRegenerate, onResetToHere }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isLastAssistant = !isUser && messageIndex === totalMessages - 1
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className={`group flex gap-3 px-4 py-5 ${isUser ? '' : 'bg-[#f7f7f8]'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-[#5436da]' : 'bg-[#10a37f]'}`}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {message.imageUrl && (
          <img src={message.imageUrl} alt="upload" className="mb-2 max-h-48 rounded-lg object-cover border border-[#e5e5e5]" />
        )}
        {isUser ? (
          <div className="text-sm leading-8 text-[#1f1f1f] whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <MarkdownRenderer content={message.content || '...'} />
        )}

        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#8e8ea0] hover:text-[#1f1f1f] hover:bg-[#e5e5e5] transition-colors"
            title="复制消息"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#10a37f]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>

          {!isUser && isLastAssistant && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#8e8ea0] hover:text-[#1f1f1f] hover:bg-[#e5e5e5] transition-colors"
              title="重新生成"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>重新生成</span>
            </button>
          )}

          {onResetToHere && (
            <button
              onClick={() => onResetToHere(message.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#8e8ea0] hover:text-[#1f1f1f] hover:bg-[#e5e5e5] transition-colors"
              title="重置到此处"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>重置到此处</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
