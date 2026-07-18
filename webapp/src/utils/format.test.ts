import { describe, expect, it } from 'vitest'
import { formatTime, percentage } from './format'

describe('format utilities', () => {
  it('formats valid ISO time into zh-CN style timestamp', () => {
    expect(formatTime('2026-07-18T12:30:00.000Z')).toMatch(/\d{2}\/\d{2}\s\d{2}:\d{2}/)
  })

  it('returns placeholder when time is missing', () => {
    expect(formatTime()).toBe('--')
  })

  it('converts decimal to percentage string', () => {
    expect(percentage(0.826)).toBe('83%')
  })
})
