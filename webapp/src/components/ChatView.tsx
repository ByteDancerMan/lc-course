import { useEffect, useRef } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { ChatMessage as ChatMessageType } from '../../shared/types'
import { ChatMessage } from './ChatMessage'

interface ChatViewProps {
  messages: ChatMessageType[]
  streamingText: string
  sending: boolean
  onRegenerate: (messageId: string) => void
  onResetToHere: (messageId: string) => void
}

export function ChatView({ messages, streamingText, sending, onRegenerate, onResetToHere }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  if (messages.length === 0 && !sending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0f0f5]">
          <Bot className="h-8 w-8 text-[#10a37f]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1f1f1f] mb-2">有什么可以帮忙的？</h1>
        <p className="text-sm text-[#8e8ea0] text-center max-w-md">
          我可以帮你回答问题、搜索信息、处理文档等，试试问我任何问题吧！
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
          {[
            { icon: Sparkles, text: '帮我写一份周报总结' },
            { icon: Sparkles, text: '搜索最近的科技新闻' },
            { icon: Sparkles, text: '解释什么是微服务架构' },
            { icon: Sparkles, text: '给一份Python学习计划' },
          ].map((item, i) => (
            <button
              key={i}
              className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#1f1f1f] hover:bg-[#f7f7f8] transition-colors text-left"
            >
              <item.icon className="h-4 w-4 text-[#10a37f] shrink-0" />
              <span className="line-clamp-1">{item.text}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {messages.map((msg, idx) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          messageIndex={idx}
          totalMessages={messages.length}
          onRegenerate={onRegenerate}
          onResetToHere={onResetToHere}
        />
      ))}
      {sending && (
        <div className="flex gap-3 px-4 py-5 bg-[#f7f7f8]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10a37f]">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {streamingText ? (
              <MarkdownRenderer content={streamingText} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-[#8e8ea0]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block h-2 w-2 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="inline-block h-2 w-2 rounded-full bg-[#10a37f] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-1">正在思考...</span>
              </div>
            )}
            {streamingText && (
              <span className="inline-block w-2 h-4 bg-[#10a37f] ml-0.5 animate-pulse" />
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
