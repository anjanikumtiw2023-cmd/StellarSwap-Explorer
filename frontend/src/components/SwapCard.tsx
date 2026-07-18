import { useMemo, useState } from 'react'
import { TESTNET_USDC, XLM, otherAsset, type AssetConfig } from '../config/assets'
import { useOrderbook } from '../hooks/useOrderbook'
import { calculateQuote, slippagePercentToBps } from '../services/quote'
import type { WalletViewModel } from '../types/stellar'
import { AssetSelector } from './AssetSelector'
import { OrderbookPanel } from './OrderbookPanel'
import { SlippageSelector, type Slippage } from './SlippageSelector'
import { SwapQuote } from './SwapQuote'

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

  return <>
    <section className="card swap-card" aria-labelledby="swap-title">
      <div className="card-heading"><div><p className="card-kicker">Classic DEX preview</p><h2 id="swap-title">Swap assets</h2></div><span className="phase-pill">Phase 2</span></div>
      <div className="asset-field"><AssetSelector id="from-asset" label="From asset" value={from} excluded={to} onChange={selectFrom} /><div><input aria-label="Swap amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /><span className="asset-code">{from.code}</span></div><small>Balance: {balance(from) ?? '—'} {from.code}</small></div>
      <button className="switch-button" type="button" onClick={switchDirection} aria-label="Switch swap direction">⇅</button>
      <div className="asset-field"><AssetSelector id="to-asset" label="To asset" value={to} excluded={from} onChange={selectTo} /><div><input aria-label="Estimated output" value={quote?.expectedOutput ?? ''} placeholder="0.00" readOnly /><span className="asset-code">{to.code}</span></div><small>Balance: {balance(to) ?? '—'} {to.code}</small></div>
      <SlippageSelector value={slippage} onChange={setSlippage} />
      <SwapQuote quote={quote} outputCode={to.code} />
      <button className="review-button" type="button" disabled>Review Swap</button>
      <p className="phase-notice"><span aria-hidden="true">i</span> Read-only estimate. Swap execution will be enabled in Phase 3.</p>
    </section>
    <OrderbookPanel market={market} />
  </>
}
