import type { PricingEntry } from '@/types'

// Pure pricing helpers extracted from the obs aggregate route so they can be
// unit-tested in isolation. Unit-tested in lib/__tests__/pricing.test.ts.

export function lookupLlmPrice(
  model: string,
  provider: string,
  pricing: PricingEntry[],
): { input: number; output: number } | null {
  const m = model.toLowerCase().trim()
  const p = provider.toLowerCase().trim()
  // 精确匹配 model
  let entry = pricing.find(e => e.type === 'llm' && e.model.toLowerCase() === m)
  // 前缀匹配（应对带日期版本号如 qwen-turbo-2025-04-28）
  if (!entry) entry = pricing.find(e => e.type === 'llm' && m.startsWith(e.model.toLowerCase()))
  // provider 匹配兜底
  if (!entry) entry = pricing.find(e => e.type === 'llm' && e.provider.toLowerCase() === p)
  return entry ? { input: entry.inputPer1k, output: entry.outputPer1k } : null
}

export function calcModelCost(
  inputTokens: number | null,
  outputTokens: number | null,
  model: string,
  provider: string,
  pricing: PricingEntry[],
  fallbackCost: number | null,
): number | null {
  if (pricing.length > 0) {
    const price = lookupLlmPrice(model, provider, pricing)
    if (price && inputTokens != null && outputTokens != null) {
      return (inputTokens / 1000 * price.input) + (outputTokens / 1000 * price.output)
    }
    // 有定价表但没匹配到 → 返回 null（显示"未知"比用 0 有意义）
    return null
  }
  // 没有定价表 → 用 Python 端记录的 fallback
  return fallbackCost
}
