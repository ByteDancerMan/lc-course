import type { IngredientItem } from '../../shared/types'
import { percentage } from '@/utils/format'

interface IngredientPanelProps {
  ingredients: IngredientItem[]
  visualSummary: string
}

export function IngredientPanel({
  ingredients,
  visualSummary,
}: IngredientPanelProps) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">识别结果</p>
          <h3 className="mt-2 font-serif text-2xl text-stone-100">原材料结构化提取</h3>
        </div>
        <span className="rounded-full border border-lime-400/30 bg-lime-500/10 px-3 py-1 text-xs text-lime-100">
          {ingredients.length} 项食材
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {visualSummary || '上传图片后，系统会在这里展示识别摘要与食材结构化结果。'}
      </p>

      <div className="mt-6 space-y-3">
        {ingredients.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
            还没有识别数据。
          </div>
        ) : null}

        {ingredients.map((ingredient) => (
          <div
            key={ingredient.id}
            className="rounded-[22px] border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-medium text-stone-100">{ingredient.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">
                  {ingredient.category} · 约 {ingredient.estimatedAmount}
                </div>
              </div>
              <div className="text-sm text-orange-100">
                {percentage(ingredient.confidence)}
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white/5">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-lime-400"
                style={{ width: percentage(ingredient.confidence) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
