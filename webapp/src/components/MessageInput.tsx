import { useRef, useState } from 'react'
import { ImagePlus, SendHorizonal, Square, LoaderCircle } from 'lucide-react'

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => void
  onStop: () => void
  sending: boolean
}

export function MessageInput({ onSend, onStop, sending }: MessageInputProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (sending) {
      onStop()
      return
    }
    const msg = text.trim()
    if (!msg && !preview) return
    onSend(msg, preview ?? undefined)
    setText('')
    setPreview(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const resp = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await resp.json() as { imageUrl: string }
      setPreview(data.imageUrl)
    } catch {
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">
      {preview && (
        <div className="relative mb-2 inline-block">
          <img src={preview} alt="preview" className="h-20 w-20 rounded-lg object-cover border border-[#e5e5e5]" />
          <button
            onClick={() => setPreview(null)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#8e8ea0] text-white text-xs hover:bg-[#6b6b7b]"
          >
            ×
          </button>
        </div>
      )}

      {sending && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#f7f7f8] px-4 py-2.5 text-sm text-[#8e8ea0]">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#10a37f]" />
          <span>系统正在处理中，请稍候...</span>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-[#d9d9e3] bg-white px-3 py-2 focus-within:border-[#10a37f] transition-colors">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[#f0f0f5] text-[#8e8ea0] hover:text-[#1f1f1f] transition-colors disabled:opacity-40"
        >
          {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，按 Enter 发送，Shift+Enter 换行"
          rows={1}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm text-[#1f1f1f] outline-none placeholder:text-[#8e8ea0] max-h-[200px]"
          style={{ minHeight: '36px' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`
          }}
        />
        <button
          onClick={handleSend}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#10a37f] text-white hover:bg-[#0e8c6b] transition-colors disabled:opacity-40"
          disabled={(!text.trim() && !preview) || uploading}
        >
          {sending ? <Square className="h-4 w-4" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1.5 text-center text-xs text-[#8e8ea0]">
        使用 Tavily 搜索来获取最新信息
      </p>
    </div>
  )
}
