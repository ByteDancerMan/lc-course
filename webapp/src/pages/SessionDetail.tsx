import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { ChatPanel } from '@/components/ChatPanel'
import { IngredientPanel } from '@/components/IngredientPanel'
import { RecipePanel } from '@/components/RecipePanel'
import { useAppStore } from '@/store/app-store'
import { formatTime } from '@/utils/format'

export default function SessionDetail() {
  const { sessionId } = useParams()
  const {
    activeSession,
    ingredients,
    candidates,
    recommended,
    chatLoading,
    loadSession,
    sendChat,
    revertSession,
  } = useAppStore()

  useEffect(() => {
    if (sessionId) {
      void loadSession(sessionId)
    }
  }, [loadSession, sessionId])

  return (
    <div className="min-h-screen bg-[#111315] px-4 py-4 text-stone-100 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-orange-100"
              >
                <ArrowLeft className="h-4 w-4" />
                返回工作台
              </Link>
              <h1 className="mt-3 font-serif text-4xl text-stone-100">
                {activeSession?.title ?? '会话详情'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                这里保留了该次做菜会话的图片、识别结果、对话轮次与可回退节点。
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
              <div className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-orange-300" />
                最近更新 {formatTime(activeSession?.updatedAt)}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {activeSession?.coverImageUrl ? (
              <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4">
                <img
                  src={activeSession.coverImageUrl}
                  alt={activeSession.title}
                  className="h-[340px] w-full rounded-[24px] object-cover"
                />
              </section>
            ) : null}
            <IngredientPanel
              ingredients={ingredients}
              visualSummary={activeSession?.lastMessage ?? ''}
            />
          </div>

          <div className="space-y-4">
            <RecipePanel candidates={candidates} recommended={recommended} />
            <ChatPanel
              turns={activeSession?.turns ?? []}
              chatLoading={chatLoading}
              onSend={sendChat}
              onRevert={revertSession}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
