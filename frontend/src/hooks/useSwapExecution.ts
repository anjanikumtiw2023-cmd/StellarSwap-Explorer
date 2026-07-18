import { useCallback, useRef, useState } from 'react'
import type { AssetConfig } from '../config/assets'
import { fetchOrderbook } from '../services/orderbook'
import { calculateQuote, slippagePercentToBps } from '../services/quote'
import { isQuoteFresh, validateSwap } from '../services/swapValidation'
import type { QuoteResult } from '../types/market'
import type { ConfirmedSwap, ReviewDetails, SwapExecutionStatus } from '../types/swap'
import type { WalletViewModel } from '../types/stellar'
import type { Slippage } from '../components/SlippageSelector'
import { parseDecimal } from '../utils/decimal'

type Draft = { from: AssetConfig; to: AssetConfig; amount: string; slippage: Slippage; quote: QuoteResult | null; quotedAt: Date | null }
function materialChange(oldQuote: QuoteResult, newQuote: QuoteResult): boolean {
  const oldValue = parseDecimal(oldQuote.expectedOutput) ?? 0n; const newValue = parseDecimal(newQuote.expectedOutput) ?? 0n
  return oldValue === 0n || (oldValue > newValue ? oldValue - newValue : newValue - oldValue) * 10_000n / oldValue > 10n
}
export function useSwapExecution(wallet: WalletViewModel, refreshMarket: () => void, clearAmount: () => void) {
  const [status, setStatus] = useState<SwapExecutionStatus>('idle')
  const [message, setMessage] = useState('')
  const [review, setReview] = useState<ReviewDetails | null>(null)
  const [history, setHistory] = useState<ConfirmedSwap[]>([])
  const inFlight = useRef(false)
  const progress = (next: SwapExecutionStatus, nextMessage: string) => { setStatus(next); setMessage(nextMessage) }

  const authoritativeQuote = useCallback(async (draft: Draft) => {
    const book = await fetchOrderbook(draft.from, draft.to)
    return { quote: calculateQuote(draft.amount, book.bids, slippagePercentToBps(draft.slippage)), quotedAt: book.refreshedAt }
  }, [])

  const requestReview = useCallback(async (draft: Draft) => {
    if (inFlight.current) return
    progress('validating', 'Validating account, assets, balance, and trustline…')
    const initial = validateSwap({ wallet, ...draft, inProgress: false })
    if (!initial.valid && !initial.message.includes('stale')) { progress('failed', initial.message); return }
    progress('refreshing-quote', 'Refreshing the authoritative direct Testnet quote…')
    try {
      const fresh = await authoritativeQuote(draft)
      const validated = validateSwap({ wallet, ...draft, ...fresh, inProgress: false })
      if (!validated.valid) { progress('failed', validated.message); return }
      setReview({ from: draft.from, to: draft.to, amount: draft.amount, slippage: draft.slippage, quote: fresh.quote!, quotedAt: fresh.quotedAt })
      progress('idle', 'Authoritative Testnet quote ready for review.')
    } catch { progress('failed', 'Horizon could not refresh the direct Testnet quote. Please retry.') }
  }, [wallet, authoritativeQuote])

  const confirm = useCallback(async () => {
    if (!review || inFlight.current) return
    inFlight.current = true
    try {
      progress('refreshing-quote', 'Checking the quote again before submission…')
      const fresh = await authoritativeQuote(review)
      if (!fresh.quote || !isQuoteFresh(fresh.quotedAt)) { progress('failed', 'The authoritative quote is unavailable or stale.'); return }
      if (materialChange(review.quote, fresh.quote)) {
        setReview({ ...review, quote: fresh.quote, quotedAt: fresh.quotedAt })
        progress('idle', 'The quote changed materially. Review the updated amounts and confirm again.')
        return
      }
      const transaction = await import('../services/pathPayment')
      const result = await transaction.executePathPayment({ address: wallet.address!, from: review.from, to: review.to, amount: review.amount, destMin: fresh.quote.minimumReceived }, progress)
      if (!result) return
      const confirmed: ConfirmedSwap = {
        fromCode: review.from.code, toCode: review.to.code, sentAmount: review.amount, receivedAmount: result.receivedAmount,
        timestamp: new Date(), hash: result.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`, status: 'success',
      }
      setHistory((items) => [confirmed, ...items]); setReview(null); progress('confirmed', `TESTNET swap confirmed: ${result.hash}`)
      clearAmount(); await wallet.refreshAccount(); refreshMarket()
    } finally { inFlight.current = false }
  }, [review, wallet, authoritativeQuote, clearAmount, refreshMarket])

  return { status, message, review, history, inProgress: inFlight.current || !['idle', 'confirmed', 'rejected', 'failed', 'timed-out'].includes(status), requestReview, confirm, cancelReview: () => { if (!inFlight.current) setReview(null) } }
}
