# StellarSwap Explorer

StellarSwap Explorer is a Testnet-first Stellar Classic DEX interface with Soroban-backed pair configuration and user-authorized analytics. The repository separates on-chain metadata and analytics from Classic transaction execution.

> **Testnet only:** the frontend rejects Freighter accounts on Public Network or unsupported networks. Do not use production funds or enter a secret key anywhere in this application.

## Current status

The contract phase is complete:

- `pair_registry` maintains validated supported-pair configuration, status, administration, and a listable pair index.
- `swap_analytics` stores user-authorized post-swap analytics and validates active pairs through Pair Registry.
- Classic DEX settlement remains outside Soroban.

Frontend Phase 1 provides:

- Responsive, accessible swap-interface foundation.
- Freighter installation detection, access request, address display, Testnet validation, and supported wallet-change watching.
- Connected Testnet account loading through Horizon and native XLM balance display.
- Friendly disconnected, loading, funded, unfunded, wrong-network, error, and retry states.
- A non-transactional swap preview. Review and submission are intentionally disabled.

Frontend Phase 2 adds verified Testnet asset and market support:

- Native XLM and official Testnet USDC only. The USDC issuer is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Account trustline detection distinguishes missing, active, unauthorized/frozen, unfunded, loading, and Horizon error states.
- A missing USDC trustline can be created as a Classic `changeTrust` transaction signed by Freighter and submitted to Testnet Horizon. No secret key is requested or handled.
- Live XLM/USDC orderbook bids and asks refresh from Horizon every ten seconds, with best prices, spread, depth, and explicit empty/error states.
- Read-only quotes consume actual visible ask levels using decimal-safe integer arithmetic and show average price, price impact, insufficient depth, selectable preview slippage, and estimated minimum received.

Quotes are estimates, not executable swaps or guaranteed prices. The application never invents liquidity: an empty or shallow Testnet orderbook is shown as empty or insufficient rather than replaced with sample values.

Frontend Phase 3 enables educational Testnet execution:

- Every swap is reviewed with a prominent `TESTNET / NO REAL VALUE` warning and refreshed against the direct XLM/official-USDC orderbook before signing.
- Swaps use Stellar Classic `PathPaymentStrictSend`: the exact source amount is sent through an empty path (direct orderbook route), while `destMin` provides slippage protection.
- Freighter signs the transaction and Horizon submits it. A changed account sequence is rebuilt and re-signed once; signed XDR is never blindly resubmitted.
- XLM Max uses a conservative spendable balance after minimum reserve, account subentries, sponsorships, selling liabilities, and a fee allowance. USDC Max subtracts selling liabilities.
- Confirmed swaps appear only in current in-memory browser-session history. They are not stored in localStorage and are not permanent analytics.
- Pair Registry and Swap Analytics remain undeployed, so Phase 3 does not record swaps in Soroban.

Testnet XLM and USDC have no real monetary value. Execution supports only the direct XLM/official-Testnet-USDC pair; arbitrary issuers, Mainnet, routed paths, and order placement are rejected.

No contracts are deployed yet, and the example environment file intentionally contains empty contract IDs.

## Local development

Requirements: Node.js supported by Vite 8, npm, Rust with the `wasm32v1-none` target, and Stellar CLI 27.

```sh
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Use `cp .env.example .env.local` instead of `copy` on macOS or Linux. Then open the local URL printed by Vite and connect Freighter configured for Stellar Testnet.

Frontend verification:

```sh
npm test -- --run
npm run lint
npm run build
```

Contract verification:

```sh
cd contracts
cargo test
stellar contract build
```

## Future phases

- Load supported pairs from deployed Pair Registry configuration.
- Deploy contracts and record user-authorized analytics after verified settlement.

Phase 2 can submit only an explicitly approved USDC trustline transaction. It does not submit swaps, place orderbook offers, deploy contracts, record analytics, or request secret keys.
