import { Clock3, ExternalLink, Sparkles } from 'lucide-react'
import type { RecipeCandidate, RecipeDetail } from '../../shared/types'

interface RecipePanelProps {
  candidates: RecipeCandidate[]
  recommended: RecipeDetail | null
}

export function RecipePanel({
  candidates,
  recommended,
}: RecipePanelProps) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">菜谱推理</p>
          <h3 className="mt-2 font-serif text-2xl text-stone-100">候选菜与详细步骤</h3>
        </div>
        <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-100">
          推荐引擎
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {candidates.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
              生成菜谱后，这里会先展示 3 个候选方向。
            </div>
          ) : null}

          {candidates.map((candidate, index) => (
            <article
              key={candidate.id}
              className={`rounded-[24px] border p-4 ${
                index === 0
                  ? 'border-orange-400/35 bg-orange-500/10'
                  : 'border-white/10 bg-black/15'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-medium text-stone-100">{candidate.title}</h4>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">
                    {candidate.difficulty}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  {candidate.timeCost}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{candidate.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {candidate.extraIngredients.map((item) => (
                  <span
                    key={`${candidate.id}-${item}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-[28px] border border-lime-400/20 bg-[linear-gradient(180deg,rgba(136,176,75,0.08),rgba(255,255,255,0.02))] p-5">
          {recommended ? (
            <>
              <div className="flex items-center gap-2 text-sm text-lime-100">
                <Sparkles className="h-4 w-4" />
                主推荐菜谱
              </div>
              <h4 className="mt-3 font-serif text-3xl text-stone-100">{recommended.title}</h4>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{recommended.summary}</p>

              <div className="mt-5 space-y-3">
                {recommended.steps.map((step, index) => (
                  <div
                    key={`${recommended.title}-step-${index + 1}`}
                    className="rounded-[20px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      Step {index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-200">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">烹饪提示</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommended.tips.map((tip) => (
                    <span
                      key={tip}
                      className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-50"
                    >
                      {tip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {recommended.references.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 transition hover:border-lime-400/30 hover:bg-white/[0.06]"
                  >
                    <span className="line-clamp-1">{item.title}</span>
                    <ExternalLink className="h-4 w-4 text-zinc-500" />
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 text-sm text-zinc-500">
              还没有主推荐菜谱。
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
