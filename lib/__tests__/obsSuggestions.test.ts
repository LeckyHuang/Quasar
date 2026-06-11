import { describe, it, expect } from 'vitest'
import { generateSuggestions } from '@/lib/obsSuggestions'

const okSvc = (over: Partial<{ error_rate: number; total_calls: number; avg_latency_ms: number }> = {}) => ({
  id: 's1', name: 'svc-a', status: 'ok' as const,
  data: {
    summary: {
      total_calls: 100, error_count: 0, error_rate: 0,
      avg_latency_ms: 1000, total_cost_cny: 1, total_tokens: 1000, ...over,
    },
    by_model: [],
    recent_calls: [],
  },
})

describe('generateSuggestions', () => {
  it('no issues → no suggestions', () => {
    const out = generateSuggestions({
      summary: { total_calls: 100, error_count: 0, error_rate: 0, avg_latency_ms: 1000, total_cost_cny: 1 },
      services: [okSvc()],
      days: 7,
    })
    expect(out).toEqual([])
  })

  it('global error rate > 15% → critical', () => {
    const out = generateSuggestions({
      summary: { total_calls: 100, error_count: 20, error_rate: 0.2, avg_latency_ms: 1000, total_cost_cny: 1 },
      services: [okSvc()],
      days: 7,
    })
    expect(out.some(s => s.level === 'critical' && s.category === 'error')).toBe(true)
  })

  it('global error rate 5-15% → warn, not critical', () => {
    const out = generateSuggestions({
      summary: { total_calls: 100, error_count: 8, error_rate: 0.08, avg_latency_ms: 1000, total_cost_cny: 1 },
      services: [okSvc()],
      days: 7,
    })
    const err = out.find(s => s.category === 'error')
    expect(err?.level).toBe('warn')
  })

  it('down service → critical availability', () => {
    const out = generateSuggestions({
      summary: null,
      services: [{ id: 's1', name: 'svc-a', status: 'down', error: 'ECONNREFUSED' }],
      days: 7,
    })
    expect(out[0]).toMatchObject({ level: 'critical', category: 'availability', service: 'svc-a' })
  })

  it('zero calls → info', () => {
    const out = generateSuggestions({
      summary: null,
      services: [okSvc({ total_calls: 0 })],
      days: 7,
    })
    expect(out.some(s => s.level === 'info' && /无调用/.test(s.title))).toBe(true)
  })

  it('sorts critical before warn before info', () => {
    const out = generateSuggestions({
      summary: { total_calls: 100, error_count: 20, error_rate: 0.2, avg_latency_ms: 35000, total_cost_cny: 1 },
      services: [okSvc({ total_calls: 0 })],
      days: 7,
    })
    const levels = out.map(s => s.level)
    const rank = { critical: 0, warn: 1, info: 2 } as const
    const ranks = levels.map(l => rank[l])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })
})
