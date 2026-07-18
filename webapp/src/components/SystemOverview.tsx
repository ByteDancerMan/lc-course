import { BrainCircuit, Database, Search, UploadCloud } from 'lucide-react'
import type { SystemStatus } from '../../shared/types'

interface SystemOverviewProps {
  status: SystemStatus | null
}

export function SystemOverview({
  status,
}: SystemOverviewProps) {
  const items = [
    {
      icon: UploadCloud,
      title: '图片存储',
      value: status?.storageMode === 'oss' ? 'OSS 已接入' : '本地存储回退',
    },
    {
      icon: BrainCircuit,
      title: '视觉模型',
      value: status?.visionModel ?? '--',
    },
    {
      icon: Search,
      title: '搜索增强',
      value: status?.tavilyEnabled ? 'Tavily 已启用' : '未配置，走降级策略',
    },
    {
      icon: Database,
      title: '会话记录',
      value: `${status?.sessionCount ?? 0} 个会话 / ${status?.turnCount ?? 0} 轮`,
    },
  ]

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">系统状态</p>
      <h3 className="mt-2 font-serif text-2xl text-stone-100">当前运行能力</h3>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[22px] border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <item.icon className="h-4 w-4 text-orange-300" />
              {item.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-100">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
