export function formatTime(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function percentage(value: number) {
  return `${Math.round(value * 100)}%`
}
