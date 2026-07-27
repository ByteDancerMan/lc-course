import { useState, useEffect, useCallback } from 'react'
import { FileText, Trash2, Upload, X, LoaderCircle } from 'lucide-react'
import { api } from '@/utils/api'
import type { KnowledgeDocument } from '../../shared/types'

interface KnowledgeModalProps {
  open: boolean
  onClose: () => void
}

const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'

export function KnowledgeModal({ open, onClose }: KnowledgeModalProps) {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listKnowledge()
      setDocs(res.documents)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.uploadKnowledge(file)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteKnowledge(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[500px] w-[560px] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-base font-semibold text-[#1f1f1f]">企业知识库</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8e8ea0] hover:bg-[#f0f0f5] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoaderCircle className="h-6 w-6 animate-spin text-[#10a37f]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#8e8ea0]">
              暂无文档，点击下方按钮上传
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-[#e5e5e5] px-4 py-3">
                <FileText className="h-5 w-5 shrink-0 text-[#10a37f]" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-[#1f1f1f]">{doc.filename}</div>
                  <div className="text-xs text-[#8e8ea0]">{doc.chunkCount} 个片段 · {doc.createdAt}</div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 rounded-lg p-1.5 text-[#8e8ea0] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#e5e5e5] px-5 py-4">
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#d9d9e3] px-4 py-3 text-sm text-[#8e8ea0] hover:border-[#10a37f] hover:text-[#10a37f] transition-colors ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            {uploading ? (
              <><LoaderCircle className="h-4 w-4 animate-spin" /> 正在上传处理...</>
            ) : (
              <><Upload className="h-4 w-4" /> 点击上传文档（PDF/Word/PPT/Excel）</>
            )}
            <input type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  )
}
