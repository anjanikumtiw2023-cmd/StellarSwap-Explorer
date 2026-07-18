import { Account, Networks, StrKey, Transaction, type TransactionBuilder } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import type { SwapExecutionStatus } from '../types/swap'
import { executePathPayment, horizonFailureMessage, pathPaymentOperationArgs, type PathPaymentDeps } from './pathPayment'

const address = StrKey.encodeEd25519PublicKey(new Uint8Array(32))
const input = { address, from: XLM, to: TESTNET_USDC, amount: '1.0000000', destMin: '1.9000000' }
function deps(overrides: Partial<PathPaymentDeps> = {}): PathPaymentDeps {
  return {
    loadAccount: vi.fn(async () => new Account(address, '1') as never),
    network: vi.fn(async () => ({ network: 'TESTNET', networkPassphrase: Networks.TESTNET })),
    sign: vi.fn(async (xdr) => ({ signedTxXdr: xdr, signerAddress: address })),
    submit: vi.fn(async () => ({ hash: 'abc123' })), findReceived: vi.fn(async () => '1.95'), ...overrides,
  }
}
describe('PathPaymentStrictSend execution', () => {
  it('builds the exact direct operation arguments', () => {
    const args = pathPaymentOperationArgs(input)
    expect(args.sendAsset.isNative()).toBe(true); expect(args.sendAmount).toBe('1.0000000'); expect(args.destination).toBe(address)
    expect(args.destAsset.getCode()).toBe('USDC'); expect(args.destMin).toBe('1.9000000'); expect(args.path).toEqual([])
  })
  it('maps signing rejection without submitting', async () => {
    const d = deps({ sign: vi.fn(async () => ({ signedTxXdr: '', signerAddress: '', error: { message: 'rejected' } as never })) }); const states: SwapExecutionStatus[] = []
    expect(await executePathPayment(input, (state) => states.push(state), d)).toBeNull(); expect(states).toContain('rejected'); expect(d.submit).not.toHaveBeenCalled()
  })
  it('maps Horizon submission failure', async () => {
    const d = deps({ submit: vi.fn(async () => { throw new Error('transport detail') }) }); const states: SwapExecutionStatus[] = []
    await executePathPayment(input, (state) => states.push(state), d); expect(states.at(-1)).toBe('failed')
  })
  it('maps Horizon result codes to friendly messages', () => {
    const error = { response: { data: { extras: { result_codes: { operations: ['op_under_destmin'] } } } } }
    expect(horizonFailureMessage(error)).toContain('slippage-protected minimum')
  })
  it('rebuilds and re-signs exactly once for tx_bad_seq', async () => {
    let calls = 0; const d = deps({ submit: vi.fn(async (_tx: ReturnType<typeof TransactionBuilder.fromXDR>) => { calls += 1; if (calls === 1) throw { response: { data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } } } }; return { hash: 'fresh' } }) })
    const result = await executePathPayment(input, () => undefined, d)
    expect(result?.hash).toBe('fresh'); expect(d.loadAccount).toHaveBeenCalledTimes(2); expect(d.sign).toHaveBeenCalledTimes(2); expect(d.submit).toHaveBeenCalledTimes(2)
  })
  it('creates a classic transaction rather than exposing XDR', async () => {
    const d = deps({ submit: vi.fn(async (tx) => { expect(tx).toBeInstanceOf(Transaction); expect(tx.operations[0].type).toBe('pathPaymentStrictSend'); return { hash: 'ok' } }) })
    await executePathPayment(input, () => undefined, d); expect(d.submit).toHaveBeenCalledOnce()
  })
})
