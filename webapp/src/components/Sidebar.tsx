import { useState } from 'react'
import { BookOpen, MessageSquarePlus, Search, Trash2 } from 'lucide-react'
import type { SessionSummary } from '../../shared/types'
import { KnowledgeModal } from './KnowledgeModal'

interface SidebarProps {
  sessions: SessionSummary[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export function Sidebar({ sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession }: SidebarProps) {
  const [search, setSearch] = useState('')
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)

  const filtered = search
    ? sessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.lastMessage.toLowerCase().includes(search.toLowerCase()))
    : sessions

  return (
    <aside className="flex h-full flex-col bg-[#f7f7f8] border-r border-[#e5e5e5] w-[280px] min-w-[280px]">
      <div className="p-3 pb-2 space-y-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d9d9e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[#f0f0f5] transition-colors"
        >
          <MessageSquarePlus className="h-4 w-4" />
          开启新对话
        </button>
        <button
          onClick={() => setKnowledgeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d9d9e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[#f0f0f5] transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          企业知识库
        </button>
        <KnowledgeModal open={knowledgeOpen} onClose={() => setKnowledgeOpen(false)} />
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8ea0]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索历史对话"
            className="w-full rounded-lg border border-[#e5e5e5] bg-white py-2 pl-9 pr-3 text-sm text-[#1f1f1f] placeholder:text-[#8e8ea0] outline-none focus:border-[#10a37f] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-1">
        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-[#8e8ea0]">
            {search ? '没有找到匹配的对话' : '暂无历史对话'}
          </div>
        )}
        {filtered.map(session => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              className={`group relative flex cursor-pointer items-start rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-[#e8e8ee]' : 'hover:bg-[#efeff1]'
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1f1f1f] truncate">{session.title}</div>
                {session.lastMessage && (
                  <div className="text-xs text-[#8e8ea0] mt-0.5 line-clamp-1">{session.lastMessage}</div>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDeleteSession(session.id) }}
                className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center h-6 w-6 rounded hover:bg-[#d9d9e3] text-[#8e8ea0] hover:text-[#ef4444] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
