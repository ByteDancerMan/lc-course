import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Sparkles } from 'lucide-react'
import type { UploadedImage } from '../../shared/types'

interface UploadPanelProps {
  image: UploadedImage | null
  loading: boolean
  onUpload: (file: File, prompt: string) => Promise<void>
}

const promptSuggestions = ['偏家常一点', '适合减脂晚餐', '想做下饭菜', '用空气炸锅也能做']

export function UploadPanel({
  image,
  loading,
  onUpload,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [prompt, setPrompt] = useState('偏家常一点，步骤写详细一些')

  return (
    <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(232,106,51,0.18),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 01</p>
          <h3 className="mt-2 font-serif text-3xl text-stone-100">上传食材照片</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            拍一张冰箱现有食材或台面原材料照片，系统会先识别关键原料，再搜索并整理成可执行菜谱。
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/15 px-5 py-3 text-sm font-medium text-orange-50 transition hover:-translate-y-0.5 hover:bg-orange-500/20"
        >
          <ImagePlus className="h-4 w-4" />
          选择图片
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (file) {
            await onUpload(file, prompt)
          }
        }}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative overflow-hidden rounded-[30px] border border-dashed border-white/15 bg-black/20 p-4 text-left transition hover:border-orange-400/35 hover:bg-black/30"
        >
          <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-0 transition duration-500 group-hover:opacity-100" />
          {image ? (
            <img
              src={image.imageUrl}
              alt="上传预览"
              className="h-[320px] w-full rounded-[24px] object-cover"
            />
          ) : (
            <div className="flex h-[320px] flex-col items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.02] text-center">
              <ImagePlus className="h-10 w-10 text-orange-300" />
              <p className="mt-4 font-serif text-2xl text-stone-100">把食材摆进镜头里</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
                支持桌面摆拍、冰箱拍照和袋装原料拍摄。画面越干净，识别效果越稳定。
              </p>
            </div>
          )}
        </button>

        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-orange-300" />
            给大模型一点偏好提示
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={6}
            className="mt-4 w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-stone-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-orange-400/40"
            placeholder="例如：我想做孩子也能吃的、清淡一点、步骤写详细些。"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {promptSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrompt(item)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 transition hover:border-orange-400/30 hover:text-orange-50"
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? '正在识别与生成菜谱...' : '开始分析这张图片'}
          </button>
        </div>
      </div>
    </section>
  )
}
