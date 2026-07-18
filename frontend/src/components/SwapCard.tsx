import { useState } from 'react'

export function SwapCard({ connected }: { connected: boolean }) {
  const [reversed, setReversed] = useState(false)
  const from = reversed ? 'USDC' : 'XLM'
  const to = reversed ? 'XLM' : 'USDC'
  return (
    <section className="card swap-card" aria-labelledby="swap-title">
      <div className="card-heading"><div><p className="card-kicker">Classic DEX preview</p><h2 id="swap-title">Swap assets</h2></div><span className="phase-pill">Phase 1</span></div>
      <div className="asset-field">
        <label htmlFor="from-amount">From</label>
        <div><input id="from-amount" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" /><button type="button" className="asset-select" aria-label={`From asset ${from}`}>{from}<span>⌄</span></button></div>
        <small>{connected ? 'Balance shown in wallet panel' : 'Connect wallet to view balance'}</small>
      </div>
      <button className="switch-button" type="button" onClick={() => setReversed((value) => !value)} aria-label="Switch swap direction">⇅</button>
      <div className="asset-field">
        <label htmlFor="to-amount">To</label>
        <div><input id="to-amount" type="text" placeholder="0.00" readOnly /><button type="button" className="asset-select" aria-label={`To asset ${to}`}>{to}<span>⌄</span></button></div>
        <small>Estimated amount</small>
      </div>
      <dl className="quote-details"><div><dt>Quote</dt><dd>Available next phase</dd></div><div><dt>Slippage</dt><dd>Not configured</dd></div></dl>
      <button className="review-button" type="button" disabled>Review Swap</button>
      <p className="phase-notice"><span aria-hidden="true">i</span> Swap execution will be enabled in the next phase. No transaction can be submitted yet.</p>
    </section>
  )
}
