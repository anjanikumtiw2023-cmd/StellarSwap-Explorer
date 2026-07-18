import { describe, expect, it } from 'vitest'
import { detectUsdcTrustline, extractXlmBalance, loadXlmBalance } from './horizon'
import { TESTNET_USDC_ISSUER } from '../config/assets'

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

  it('detects present, missing, and unauthorized USDC trustlines', () => {
    expect(detectUsdcTrustline({ balances: [] }).status).toBe('missing')
    expect(detectUsdcTrustline({ balances: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: TESTNET_USDC_ISSUER, balance: '5.0', is_authorized: true }] })).toEqual({ status: 'present', balance: '5.0' })
    expect(detectUsdcTrustline({ balances: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: TESTNET_USDC_ISSUER, balance: '0', is_authorized: false }] }).status).toBe('unauthorized')
  })

  it('replaces unexpected Horizon failures with a safe message', async () => {
    const server = { loadAccount: async () => { throw new Error('private transport detail') } }
    await expect(loadXlmBalance('GTEST', server)).rejects.toThrow('Horizon is temporarily unavailable')
  })
})
