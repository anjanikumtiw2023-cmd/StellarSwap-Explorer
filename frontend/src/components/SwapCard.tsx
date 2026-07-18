import { useMemo, useState } from 'react'
import { TESTNET_USDC, XLM, otherAsset, type AssetConfig } from '../config/assets'
import { useOrderbook } from '../hooks/useOrderbook'
import { calculateQuote, slippagePercentToBps } from '../services/quote'
import type { WalletViewModel } from '../types/stellar'
import { AssetSelector } from './AssetSelector'
import { OrderbookPanel } from './OrderbookPanel'
import { SlippageSelector, type Slippage } from './SlippageSelector'
import { SwapQuote } from './SwapQuote'
import { useSwapExecution } from '../hooks/useSwapExecution'
import { validateSwap, maxSpendable } from '../services/swapValidation'
import { ReviewSwapDialog } from './ReviewSwapDialog'
import { TransactionStatus } from './TransactionStatus'
import { SessionSwapHistory } from './SessionSwapHistory'

export function SwapCard({ wallet }: { wallet: WalletViewModel }) {
  const [from, setFrom] = useState<AssetConfig>(XLM)
  const [to, setTo] = useState<AssetConfig>(TESTNET_USDC)
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState<Slippage>('0.5')
  const market = useOrderbook(from, to)
  const quote = useMemo(() => calculateQuote(amount, market.book?.bids ?? [], slippagePercentToBps(slippage)), [amount, market.book, slippage])
  const balance = (asset: AssetConfig) => asset.type === 'native' ? wallet.xlmBalance : wallet.usdcBalance
  const selectFrom = (asset: AssetConfig) => { setFrom(asset); if (asset.id === to.id) setTo(otherAsset(asset)) }
  const selectTo = (asset: AssetConfig) => { setTo(asset); if (asset.id === from.id) setFrom(otherAsset(asset)) }
  const switchDirection = () => { setFrom(to); setTo(from) }
  const execution = useSwapExecution(wallet, market.retry, () => setAmount(''))
  const draft = { from, to, amount, slippage, quote, quotedAt: market.book?.refreshedAt ?? null }
  const validation = validateSwap({ wallet, ...draft, inProgress: execution.inProgress })
  const spendable = maxSpendable(wallet, from)

  return <>
    <section className="card swap-card" aria-labelledby="swap-title">
      <div className="card-heading"><div><p className="card-kicker">Classic DEX execution</p><h2 id="swap-title">Swap assets</h2></div><span className="phase-pill">Phase 3</span></div>
      <div className="asset-field"><AssetSelector id="from-asset" label="From asset" value={from} excluded={to} onChange={selectFrom} /><div><input aria-label="Swap amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /><span className="asset-code">{from.code}</span><button type="button" className="max-button" onClick={() => setAmount(spendable)}>Max</button></div><small>Total: {balance(from) ?? '—'} · Spendable: {spendable} {from.code}</small></div>
      <button className="switch-button" type="button" onClick={switchDirection} aria-label="Switch swap direction">⇅</button>
      <div className="asset-field"><AssetSelector id="to-asset" label="To asset" value={to} excluded={from} onChange={selectTo} /><div><input aria-label="Estimated output" value={quote?.expectedOutput ?? ''} placeholder="0.00" readOnly /><span className="asset-code">{to.code}</span></div><small>Balance: {balance(to) ?? '—'} {to.code}</small></div>
      <SlippageSelector value={slippage} onChange={setSlippage} />
      <SwapQuote quote={quote} outputCode={to.code} />
      <button className="review-button" type="button" disabled={!validation.valid} onClick={() => void execution.requestReview(draft)}>Review Swap</button>
      {!validation.valid && <p className="validation-message" aria-live="polite">{validation.message}</p>}
      <TransactionStatus status={execution.status} message={execution.message} />
      <p className="phase-notice"><span aria-hidden="true">i</span> TESTNET educational swap. These assets have no real monetary value.</p>
    </section>
    <OrderbookPanel market={market} />
    <SessionSwapHistory swaps={execution.history} />
    {execution.review && wallet.address && <ReviewSwapDialog review={execution.review} address={wallet.address} status={execution.status} message={execution.message} onCancel={execution.cancelReview} onConfirm={() => void execution.confirm()} />}
  </>
}
