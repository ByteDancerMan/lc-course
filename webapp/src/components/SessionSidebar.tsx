import { Link, useLocation } from 'react-router-dom'
import { Clock3, Flame, Layers3, Soup } from 'lucide-react'
import type { SessionSummary } from '../../shared/types'
import { formatTime } from '@/utils/format'
import { StatusBadge } from '@/components/StatusBadge'

interface SessionSidebarProps {
  sessions: SessionSummary[]
  activeSessionId: string | null
}

export function SessionSidebar({
  sessions,
  activeSessionId,
}: SessionSidebarProps) {
  const location = useLocation()

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="space-y-3 border-b border-white/10 pb-5">
        <StatusBadge label="Kitchen Memory" tone="green" />
        <div>
          <h2 className="font-serif text-2xl text-stone-100">本轮厨房档案</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            保留历史图片、推荐菜谱和对话分支，支持从任意轮次继续推演。
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-zinc-500">
        <span>最近会话</span>
        <span>{sessions.length}</span>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm leading-6 text-zinc-500">
            还没有历史记录。上传一张食材照片，系统就会自动生成第一份“厨房档案”。
          </div>
        ) : null}

        {sessions.map((session) => {
          const active = activeSessionId === session.id
          const href = `/sessions/${session.id}`

          return (
            <Link
              key={session.id}
              to={href}
              className={`block rounded-[24px] border p-4 transition duration-300 ${
                active
                  ? 'border-orange-400/50 bg-orange-400/10 shadow-[0_20px_40px_rgba(232,106,51,0.18)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Soup className="h-4 w-4 text-orange-300" />
                  <span className="text-sm font-medium text-stone-100">{session.title}</span>
                </div>
                {location.pathname === href ? (
                  <StatusBadge label="当前" tone="warm" />
                ) : null}
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
                {session.lastMessage}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTime(session.updatedAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers3 className="h-3.5 w-3.5" />
                  档案
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-lime-400/20 bg-lime-500/5 p-4">
        <div className="flex items-center gap-2 text-sm text-lime-100">
          <Flame className="h-4 w-4" />
          今日建议
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          如果你想让推荐更准确，追问时可以补充“我不吃辣”“我只有空气炸锅”“想做低脂版本”。
        </p>
      </div>
    </aside>
  )
}
