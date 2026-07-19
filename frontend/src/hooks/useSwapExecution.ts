import { useCallback, useRef, useState } from 'react'
import type { AssetConfig } from '../config/assets'
import { fetchOrderbook } from '../services/orderbook'
import { slippagePercentToBps } from '../services/quote'
import { fetchDirectQuote } from '../services/directQuote'
import { isQuoteFresh, validateSwap } from '../services/swapValidation'
import type { QuoteResult } from '../types/market'
import type { ConfirmedSwap, ReviewDetails, SwapExecutionStatus } from '../types/swap'
import type { WalletViewModel } from '../types/stellar'
import type { Slippage } from '../components/SlippageSelector'
import { parseDecimal } from '../utils/decimal'
import { decimalToI128, PAIR_ID } from '../services/contractValues'
import { friendlySorobanError, submitAnalytics } from '../services/soroban'
import type { AnalyticsRecordInput, AnalyticsStatus } from '../types/contracts'

type Draft = { from: AssetConfig; to: AssetConfig; amount: string; slippage: Slippage; quote: QuoteResult | null; quotedAt: Date | null }
function materialChange(oldQuote: QuoteResult, newQuote: QuoteResult): boolean {
  const oldValue = parseDecimal(oldQuote.expectedOutput) ?? 0n; const newValue = parseDecimal(newQuote.expectedOutput) ?? 0n
  return oldValue === 0n || (oldValue > newValue ? oldValue - newValue : newValue - oldValue) * 10_000n / oldValue > 10n
}
export function useSwapExecution(wallet: WalletViewModel, refreshMarket: () => void, clearAmount: () => void, registryReady = true, analyticsConfirmed?: () => void) {
  const [status, setStatus] = useState<SwapExecutionStatus>('idle')
  const [message, setMessage] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [review, setReview] = useState<ReviewDetails | null>(null)
  const [history, setHistory] = useState<ConfirmedSwap[]>([])
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus>('idle')
  const [analyticsMessage, setAnalyticsMessage] = useState('')
  const pendingAnalytics = useRef(new Map<string, AnalyticsRecordInput>())
  const inFlight = useRef(false)
  const progress = (next: SwapExecutionStatus, nextMessage: string) => { setStatus(next); setMessage(nextMessage) }
  const clearTransientMessages = useCallback(() => {
    if (inFlight.current) return
    setStatus('idle'); setMessage(''); setReviewMessage(''); setAnalyticsStatus('idle'); setAnalyticsMessage('')
  }, [])
  const resetDraftState = useCallback(() => { if (!inFlight.current) { setReview(null); clearTransientMessages() } }, [clearTransientMessages])

  const recordAnalytics = useCallback(async (input: AnalyticsRecordInput) => {
    setAnalyticsStatus('preparing'); setAnalyticsMessage('Swap confirmed; preparing analytics recording…')
    try {
      const result = await submitAnalytics(input, (next, nextMessage) => { setAnalyticsStatus(next); setAnalyticsMessage(nextMessage) })
      setAnalyticsStatus('confirmed'); setAnalyticsMessage(result.duplicate ? 'Analytics record already exists on Soroban.' : 'Analytics confirmed on Soroban Testnet.')
      pendingAnalytics.current.delete(input.transactionHash)
      setHistory((items) => items.map((item) => item.hash === input.transactionHash ? { ...item, analyticsStatus: 'confirmed', analyticsHash: result.hash || item.analyticsHash, analyticsExplorerUrl: result.explorerUrl || item.analyticsExplorerUrl, analyticsMessage: result.duplicate ? 'Already recorded' : 'Recorded' } : item))
      analyticsConfirmed?.()
    } catch (error) {
      const friendly = friendlySorobanError(error)
      setAnalyticsStatus('failed'); setAnalyticsMessage(friendly)
      setHistory((items) => items.map((item) => item.hash === input.transactionHash ? { ...item, analyticsStatus: 'failed', analyticsMessage: friendly } : item))
    }
  }, [analyticsConfirmed])

  const authoritativeQuote = useCallback(async (draft: Draft) => {
    const book = await fetchOrderbook(draft.from, draft.to)
    const quote = await fetchDirectQuote(draft.from, draft.to, draft.amount, slippagePercentToBps(draft.slippage), book.bestBid)
    return { quote, quotedAt: quote ? new Date() : book.refreshedAt }
  }, [])

  const requestReview = useCallback(async (draft: Draft) => {
    if (inFlight.current) return
    setReview(null); clearTransientMessages()
    if (!registryReady) { progress('failed', 'Pair Registry must confirm an active XLM_USDC pair before swapping.'); return }
    progress('validating', 'Validating account, assets, balance, and trustline…')
    const initial = validateSwap({ wallet, ...draft, inProgress: false })
    if (!initial.valid && !initial.message.includes('stale')) { progress('failed', initial.message); return }
    progress('refreshing-quote', 'Refreshing the authoritative direct Testnet quote…')
    try {
      const fresh = await authoritativeQuote(draft)
      const validated = validateSwap({ wallet, ...draft, ...fresh, inProgress: false })
      if (!validated.valid) { progress('failed', validated.message); return }
      setReview({ from: draft.from, to: draft.to, amount: draft.amount, slippage: draft.slippage, quote: fresh.quote!, quotedAt: fresh.quotedAt })
      progress('idle', 'Authoritative Testnet quote ready for review.'); setReviewMessage('')
    } catch { progress('failed', 'Horizon could not refresh the direct Testnet quote. Please retry.') }
  }, [wallet, authoritativeQuote, registryReady, clearTransientMessages])

  const confirm = useCallback(async () => {
    if (!review || inFlight.current) return
    inFlight.current = true
    try {
      const reviewProgress = (next: SwapExecutionStatus, nextMessage: string) => { progress(next, nextMessage); setReviewMessage(nextMessage) }
      reviewProgress('refreshing-quote', 'Checking the quote again before submission…')
      const fresh = await authoritativeQuote(review)
      if (!fresh.quote || !isQuoteFresh(fresh.quotedAt)) { reviewProgress('failed', 'The authoritative quote is unavailable or stale.'); return }
      if (materialChange(review.quote, fresh.quote)) {
        setReview({ ...review, quote: fresh.quote, quotedAt: fresh.quotedAt })
        reviewProgress('idle', 'The quote changed materially. Review the updated amounts and confirm again.')
        return
      }
      const transaction = await import('../services/pathPayment')
      const result = await transaction.executePathPayment({ address: wallet.address!, from: review.from, to: review.to, amount: review.amount, destMin: fresh.quote.minimumReceived }, reviewProgress)
      if (!result) return
      if (!result.receivedAmount || !result.confirmedAt) {
        const warning = 'Classic swap confirmed, but Horizon did not return an authoritative path-payment amount. Analytics was not started.'
        const confirmedWithoutParsing: ConfirmedSwap = { fromCode: review.from.code, toCode: review.to.code, sentAmount: result.sentAmount, receivedAmount: null, timestamp: new Date(), hash: result.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`, status: 'success', analyticsStatus: 'not-started', analyticsMessage: warning }
        setHistory((items) => [confirmedWithoutParsing, ...items]); setReview(null); setReviewMessage(''); progress('confirmed', warning)
        clearAmount(); await wallet.refreshAccount(); refreshMarket()
        return
      }
      const confirmed: ConfirmedSwap = {
        fromCode: review.from.code, toCode: review.to.code, sentAmount: result.sentAmount, receivedAmount: result.receivedAmount,
        timestamp: result.confirmedAt, hash: result.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`, status: 'success', analyticsStatus: 'pending',
      }
      setHistory((items) => [confirmed, ...items]); setReview(null); progress('confirmed', `TESTNET swap confirmed: ${result.hash}`)
      const analytics: AnalyticsRecordInput = { user: wallet.address!, transactionHash: result.hash, pairId: PAIR_ID, sentAmount: decimalToI128(result.sentAmount), receivedAmount: decimalToI128(result.receivedAmount), timestamp: BigInt(Math.floor(result.confirmedAt.valueOf() / 1000)) }
      pendingAnalytics.current.set(result.hash, analytics)
      clearAmount(); await wallet.refreshAccount(); refreshMarket()
      await recordAnalytics(analytics)
    } finally { inFlight.current = false }
  }, [review, wallet, authoritativeQuote, clearAmount, refreshMarket, recordAnalytics])

  const retryAnalytics = useCallback(async (hash: string) => { const input = pendingAnalytics.current.get(hash); if (!input || inFlight.current) return; inFlight.current = true; try { await recordAnalytics(input) } finally { inFlight.current = false } }, [recordAnalytics])
  return { status, message, reviewMessage, review, history, analyticsStatus, analyticsMessage, retryAnalytics, resetDraftState, clearTransientMessages, inProgress: inFlight.current || !['idle', 'confirmed', 'rejected', 'failed', 'timed-out'].includes(status), requestReview, confirm, cancelReview: () => { if (!inFlight.current) { setReview(null); setReviewMessage('') } } }
}
