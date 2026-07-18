import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import { normalizeOrderbook } from '../services/orderbook'
import { calculateQuote } from '../services/quote'
import type { WalletViewModel } from '../types/stellar'
import { useSwapExecution } from './useSwapExecution'

const { executeMock, fetchMock } = vi.hoisted(() => ({ executeMock: vi.fn(), fetchMock: vi.fn() }))
const book = normalizeOrderbook({ bids: [{ price: '2', amount: '100' }], asks: [{ price: '2.1', amount: '100' }] }, XLM, TESTNET_USDC)
vi.mock('../services/orderbook', async (original) => ({ ...await original<typeof import('../services/orderbook')>(), fetchOrderbook: fetchMock }))
vi.mock('../services/pathPayment', () => ({ executePathPayment: (...args: unknown[]) => executeMock(...args) }))
const wallet: WalletViewModel = { status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success', xlmBalance: '10', usdcBalance: '5', spendableXlm: '8', spendableUsdc: '5', receivableUsdc: '1000', trustlineStatus: 'present', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn(async () => undefined) }
const draft = { from: XLM, to: TESTNET_USDC, amount: '1', slippage: '0.5' as const, quote: calculateQuote('1', book.bids, 50n), quotedAt: new Date() }

describe('useSwapExecution', () => {
  beforeEach(() => { vi.clearAllMocks(); fetchMock.mockResolvedValue({ ...book, refreshedAt: new Date() }); executeMock.mockResolvedValue({ hash: 'confirmedhash', receivedAmount: '2.0000000' }) })
  it('refreshes balances/market, clears amount, and adds successful history', async () => {
    const refresh = vi.fn(); const clear = vi.fn(); const { result } = renderHook(() => useSwapExecution(wallet, refresh, clear))
    await act(() => result.current.requestReview(draft)); expect(result.current.review).not.toBeNull()
    await act(() => result.current.confirm())
    expect(wallet.refreshAccount).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce(); expect(clear).toHaveBeenCalledOnce()
    expect(result.current.history[0].hash).toBe('confirmedhash'); expect(result.current.status).toBe('confirmed')
  })
  it('prevents duplicate confirm clicks while execution is in flight', async () => {
    let resolve!: (value: { hash: string; receivedAmount: string }) => void
    executeMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft))
    let first!: Promise<void>; await act(async () => { first = result.current.confirm(); void result.current.confirm(); await Promise.resolve() })
    expect(executeMock).toHaveBeenCalledOnce()
    await act(async () => { resolve({ hash: 'once', receivedAmount: '2' }); await first })
  })
})
