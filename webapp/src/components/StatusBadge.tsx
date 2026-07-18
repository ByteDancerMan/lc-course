interface StatusBadgeProps {
  label: string
  tone?: 'warm' | 'green' | 'neutral'
}

const toneClassMap = {
  warm: 'border-orange-400/30 bg-orange-500/10 text-orange-100',
  green: 'border-lime-400/30 bg-lime-500/10 text-lime-100',
  neutral: 'border-white/15 bg-white/5 text-zinc-200',
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${toneClassMap[tone]}`}
    >
      {label}
    </span>
  )
}
