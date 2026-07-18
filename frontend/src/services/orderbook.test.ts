import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import { normalizeOrderbook } from './orderbook'

describe('orderbook normalization', () => {
  it('normalizes prices, levels, spread, and depth without floating point math', () => {
    const book = normalizeOrderbook({ bids: [{ price: '0.9', amount: '3' }], asks: [{ price: '1.1', amount: '2' }, { price: '1.2', amount: '4' }] }, XLM, TESTNET_USDC)
    expect(book.bestBid).toBe('0.9'); expect(book.bestAsk).toBe('1.1'); expect(book.spread).toBe('0.2'); expect(book.depth).toBe('3')
    expect(book.asks[0].priceScaled).toBe(11_000_000n)
  })
})
