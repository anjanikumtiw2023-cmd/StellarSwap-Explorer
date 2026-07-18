import { describe, expect, it } from 'vitest'
import { extractXlmBalance, loadXlmBalance } from './horizon'

describe('Horizon balance helpers', () => {
  it('extracts only the native XLM balance', () => {
    expect(extractXlmBalance({ balances: [
      { asset_type: 'credit_alphanum4', balance: '200.0000000' },
      { asset_type: 'native', balance: '42.5000000' },
    ] })).toBe('42.5000000')
  })

  it('returns an unfunded state for Horizon 404 responses', async () => {
    const server = { loadAccount: async () => { throw { response: { status: 404 } } } }
    await expect(loadXlmBalance('GTEST', server)).resolves.toEqual({ kind: 'unfunded' })
  })

  it('replaces unexpected Horizon failures with a safe message', async () => {
    const server = { loadAccount: async () => { throw new Error('private transport detail') } }
    await expect(loadXlmBalance('GTEST', server)).rejects.toThrow('Horizon is temporarily unavailable')
  })
})
