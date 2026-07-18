import { useEffect } from 'react'
import { AlertTriangle, CookingPot, LayoutDashboard, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChatPanel } from '@/components/ChatPanel'
import { IngredientPanel } from '@/components/IngredientPanel'
import { RecipePanel } from '@/components/RecipePanel'
import { SessionSidebar } from '@/components/SessionSidebar'
import { StatusBadge } from '@/components/StatusBadge'
import { SystemOverview } from '@/components/SystemOverview'
import { UploadPanel } from '@/components/UploadPanel'
import { useAppStore } from '@/store/app-store'

export default function Home() {
  const {
    sessions,
    activeSessionId,
    activeSession,
    uploadedImage,
    ingredients,
    candidates,
    recommended,
    visualSummary,
    systemStatus,
    loading,
    chatLoading,
    error,
    bootstrap,
    uploadAndAnalyze,
    sendChat,
    revertSession,
  } = useAppStore()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <div className="min-h-screen bg-[#111315] px-4 py-4 text-stone-100 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1680px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SessionSidebar sessions={sessions} activeSessionId={activeSessionId} />

        <main className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.32)] md:p-6">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(232,106,51,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(136,176,75,0.12),_transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.14),rgba(255,255,255,0.02))] px-6 py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label="Vision To Table" tone="warm" />
                  <StatusBadge label="Memory Enabled" tone="green" />
                </div>
                <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-tight text-stone-100 md:text-6xl">
                  拍下你的食材，把它变成一份有记忆的可执行菜谱。
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                  这不是普通的“做菜推荐页”，而是一套持续记住上下文的厨房工作台。它会识别图片中的原材料、搜索公开菜谱线索、生成详细步骤，并允许你回退到任意一轮重新分支。
                </p>
              </div>

              <div className="grid gap-3 md:min-w-[280px]">
                <Link
                  to="/system"
                  className="inline-flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 transition hover:border-orange-400/35 hover:text-orange-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    查看系统状态
                  </span>
                  <Sparkles className="h-4 w-4" />
                </Link>

                {activeSessionId ? (
                  <Link
                    to={`/sessions/${activeSessionId}`}
                    className="inline-flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CookingPot className="h-4 w-4" />
                      打开当前会话详情
                    </span>
                    <Sparkles className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 2xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <UploadPanel
                image={uploadedImage}
                loading={loading}
                onUpload={uploadAndAnalyze}
              />
              <ChatPanel
                turns={activeSession?.turns ?? []}
                chatLoading={chatLoading}
                onSend={sendChat}
                onRevert={revertSession}
              />
            </div>

            <div className="space-y-4">
              <IngredientPanel ingredients={ingredients} visualSummary={visualSummary} />
              <RecipePanel candidates={candidates} recommended={recommended} />
              <SystemOverview status={systemStatus} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
