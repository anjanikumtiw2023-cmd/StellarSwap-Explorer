import { Networks } from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { isTestnetNetwork } from './stellar'

describe('isTestnetNetwork', () => {
  it('accepts only Testnet with its expected passphrase', () => {
    expect(isTestnetNetwork('TESTNET', Networks.TESTNET)).toBe(true)
    expect(isTestnetNetwork('testnet')).toBe(true)
  })
  it('rejects public and unsupported networks', () => {
    expect(isTestnetNetwork('PUBLIC', Networks.PUBLIC)).toBe(false)
    expect(isTestnetNetwork('FUTURENET')).toBe(false)
    expect(isTestnetNetwork('TESTNET', Networks.PUBLIC)).toBe(false)
  })
})
