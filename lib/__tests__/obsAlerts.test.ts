import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import { evaluateRules } from '@/lib/obsAlerts'
import type { AlertRule } from '@/types'

const rule = (over: Partial<AlertRule> = {}): AlertRule => ({
  id: 'r1', name: 'high error', metric: 'error_rate', operator: '>',
  threshold: 0.1, serviceIds: [], enabled: true, cooldownMs: 60000, ...over,
})

const svc = (error_rate: number) => ({
  id: 's1', name: 'svc-a', summary: { error_rate, avg_latency_ms: 0, total_cost_cny: 0 },
})

describe('evaluateRules', () => {
  beforeEach(() => {
    // No alert history on disk → cooldown never suppresses
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
  })
  afterEach(() => vi.restoreAllMocks())

  it('fires when threshold breached', () => {
    const fired = evaluateRules([rule()], [svc(0.5)])
    expect(fired).toHaveLength(1)
    expect(fired[0]).toMatchObject({ ruleId: 'r1', serviceId: 's1', value: 0.5, threshold: 0.1 })
  })

  it('does not fire when below threshold', () => {
    expect(evaluateRules([rule()], [svc(0.05)])).toHaveLength(0)
  })

  it('">" is strict — equal does not fire', () => {
    expect(evaluateRules([rule({ threshold: 0.5, operator: '>' })], [svc(0.5)])).toHaveLength(0)
  })

  it('">=" fires on equal', () => {
    expect(evaluateRules([rule({ threshold: 0.5, operator: '>=' })], [svc(0.5)])).toHaveLength(1)
  })

  it('disabled rule never fires', () => {
    expect(evaluateRules([rule({ enabled: false })], [svc(0.9)])).toHaveLength(0)
  })

  it('serviceIds scopes which services are evaluated', () => {
    const fired = evaluateRules([rule({ serviceIds: ['other'] })], [svc(0.9)])
    expect(fired).toHaveLength(0)
  })

  it('missing metric value is skipped', () => {
    const fired = evaluateRules([rule({ metric: 'daily_calls' })], [svc(0.9)])
    expect(fired).toHaveLength(0)
  })

  it('respects cooldown when a recent event exists in history', () => {
    const nowSec = Date.now() / 1000
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([
      { id: 'x', ts: nowSec - 5, ruleId: 'r1', serviceId: 's1', metric: 'error_rate', value: 0.9, threshold: 0.1 },
    ]))
    // cooldown 60s, last fired 5s ago → suppressed
    expect(evaluateRules([rule()], [svc(0.9)])).toHaveLength(0)
  })
})
