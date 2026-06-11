import { describe, it, expect } from 'vitest'
import { lookupLlmPrice, calcModelCost } from '@/lib/pricing'
import type { PricingEntry } from '@/types'

const pricing: PricingEntry[] = [
  { id: '1', type: 'llm', provider: 'moonshot', model: 'moonshot-v1-128k', inputPer1k: 0.06, outputPer1k: 0.06 },
  { id: '2', type: 'llm', provider: 'qwen', model: 'qwen-turbo', inputPer1k: 0.003, outputPer1k: 0.006 },
]

describe('lookupLlmPrice', () => {
  it('exact model match', () => {
    expect(lookupLlmPrice('moonshot-v1-128k', 'moonshot', pricing)).toEqual({ input: 0.06, output: 0.06 })
  })

  it('prefix match for dated model versions', () => {
    expect(lookupLlmPrice('qwen-turbo-2025-04-28', 'qwen', pricing)).toEqual({ input: 0.003, output: 0.006 })
  })

  it('case-insensitive', () => {
    expect(lookupLlmPrice('QWEN-TURBO', 'QWEN', pricing)).toEqual({ input: 0.003, output: 0.006 })
  })

  it('falls back to provider match', () => {
    expect(lookupLlmPrice('unknown-model', 'moonshot', pricing)).toEqual({ input: 0.06, output: 0.06 })
  })

  it('returns null when nothing matches', () => {
    expect(lookupLlmPrice('gpt-4', 'openai', pricing)).toBeNull()
  })
})

describe('calcModelCost', () => {
  it('computes from pricing table', () => {
    // 1000 in + 2000 out at qwen-turbo (0.003 / 0.006 per 1k)
    expect(calcModelCost(1000, 2000, 'qwen-turbo', 'qwen', pricing, null)).toBeCloseTo(0.003 + 0.012, 6)
  })

  it('returns null when pricing table present but model unmatched', () => {
    expect(calcModelCost(1000, 1000, 'gpt-4', 'openai', pricing, 5)).toBeNull()
  })

  it('returns null when tokens missing even with a price', () => {
    expect(calcModelCost(null, 1000, 'qwen-turbo', 'qwen', pricing, 5)).toBeNull()
  })

  it('uses fallback cost when no pricing table', () => {
    expect(calcModelCost(1000, 1000, 'qwen-turbo', 'qwen', [], 0.42)).toBe(0.42)
  })
})
