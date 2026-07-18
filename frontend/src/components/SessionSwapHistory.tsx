import type { ConfirmedSwap } from '../types/swap'
export function SessionSwapHistory({ swaps }: { swaps: ConfirmedSwap[] }) {
  return <section className="card session-history" aria-labelledby="history-title"><div className="card-heading"><div><p className="card-kicker">Not permanent analytics</p><h2 id="history-title">Current-session swaps</h2></div><span className="phase-pill">{swaps.length}</span></div>
    {swaps.length === 0 ? <p className="status-message">Confirmed Testnet swaps from this browser session will appear here. History is not saved to localStorage.</p> : <ul>{swaps.map((swap) => <li key={swap.hash}><div><strong>{swap.sentAmount} {swap.fromCode} → {swap.receivedAmount ?? 'confirmed amount unavailable'} {swap.toCode}</strong><small>{swap.timestamp.toLocaleString()} · success</small></div><a href={swap.explorerUrl} target="_blank" rel="noreferrer">View Testnet transaction</a><code>{swap.hash.slice(0, 8)}…{swap.hash.slice(-8)}</code></li>)}</ul>}
  </section>
}
