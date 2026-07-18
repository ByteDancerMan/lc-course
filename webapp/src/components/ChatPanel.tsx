import { useState } from 'react'
import { CornerDownLeft, GitBranchPlus, LoaderCircle } from 'lucide-react'
import type { SessionTurn } from '../../shared/types'
import { formatTime } from '@/utils/format'

interface ChatPanelProps {
  turns: SessionTurn[]
  chatLoading: boolean
  onSend: (message: string) => Promise<void>
  onRevert: (turnId: string) => Promise<void>
}

export function ChatPanel({
  turns,
  chatLoading,
  onSend,
  onRevert,
}: ChatPanelProps) {
  const [message, setMessage] = useState('我不想吃辣，帮我改成更清淡一点')

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">多轮记忆</p>
          <h3 className="mt-2 font-serif text-2xl text-stone-100">继续追问或回退某一轮</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
          {turns.length} 条记录
        </div>
      </div>

      <div className="mt-6 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            生成第一轮菜谱后，这里会出现完整对话历史和回退入口。
          </div>
        ) : null}

        {turns.map((turn) => (
          <article
            key={turn.id}
            className={`rounded-[22px] border p-4 ${
              turn.role === 'assistant'
                ? 'border-lime-400/20 bg-lime-500/5'
                : 'border-white/10 bg-black/15'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-stone-100">
                {turn.role === 'assistant' ? '厨房助手' : '你'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{formatTime(turn.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => onRevert(turn.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-orange-400/35 hover:text-orange-50"
                >
                  <GitBranchPlus className="h-3.5 w-3.5" />
                  回退到此
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-300">{turn.message}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="w-full resize-none bg-transparent text-sm leading-6 text-stone-100 outline-none placeholder:text-zinc-500"
          placeholder="例如：我想改成清淡一点、适合孩子吃、用空气炸锅做。"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            继续追问会基于当前会话记忆生成新结果，回退则从旧节点重新分支。
          </p>
          <button
            type="button"
            onClick={() => onSend(message)}
            disabled={chatLoading}
            className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {chatLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CornerDownLeft className="h-4 w-4" />
            )}
            {chatLoading ? '生成中...' : '继续追问'}
          </button>
        </div>
      </div>
    </section>
  )
}
