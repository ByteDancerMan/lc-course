import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SystemOverview } from '@/components/SystemOverview'
import { useAppStore } from '@/store/app-store'
import { formatTime } from '@/utils/format'

export default function SystemPage() {
  const { sessions, systemStatus, bootstrap } = useAppStore()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <div className="min-h-screen bg-[#111315] px-4 py-4 text-stone-100 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] px-6 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-orange-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
          <h1 className="mt-3 font-serif text-4xl text-stone-100">系统状态与能力说明</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            这里展示当前模型、存储模式、会话统计和最近活动，用于快速确认系统是走真实能力还是降级策略。
          </p>
        </section>

        <SystemOverview status={systemStatus} />

        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">最近活动</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-100">最近生成的厨房档案</h2>
          <div className="mt-6 space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="block rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-orange-400/30 hover:bg-black/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium text-stone-100">{session.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{session.lastMessage}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{formatTime(session.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
