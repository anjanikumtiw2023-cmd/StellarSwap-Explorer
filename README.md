# StellarSwap Explorer

StellarSwap Explorer is a Testnet-only interface for native XLM and official Testnet USDC. Stellar Classic settles swaps with `PathPaymentStrictSend`; two deployed Soroban contracts separately provide pair policy and user-authorized post-settlement analytics.

> **Testnet only:** these assets have no monetary value. The app rejects Public Network, never requests a secret key, and never stores signed XDR or wallet data.

## Architecture and current features

```text
Pair Registry ── active pair + slippage policy ──> Frontend
      │                                             │
      └──── active-pair validation ───────┐         ├─ Classic PathPaymentStrictSend ──> Horizon
                                         v         │
                                  Swap Analytics <─┘ separate user-authorized record
```

- Contracts: production `pair_registry` and `swap_analytics` contracts with validation, authorization, events, TTL extension, stable errors, and tests.
- Frontend Phases 1–3: Freighter Testnet connection, balances/trustlines, live orderbook and direct strict-send quotes, review, signing, submission, authoritative Horizon confirmation, and current-session history.
- Frontend Phase 4: deployed Pair Registry validation and execution gating, registry maximum-slippage enforcement, persistent aggregate stats, and a second Soroban transaction built only from confirmed Horizon values.

Classic settlement and analytics are non-atomic. A confirmed Classic swap remains successful if analytics fails. The UI retains its immutable confirmed amounts, time, user, direction, and hash for **Retry analytics**; retry never repeats the swap.

Swap Analytics stores aggregates and records keyed by `(user, transaction_hash)`. Its current schema cannot reliably enumerate full per-user history without an external indexer, so the UI shows persistent aggregates plus explicitly current-session detail.

## Testnet deployment

| Item | Value | Explorer |
|---|---|---|
| Pair Registry | `CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB` | [Contract](https://stellar.expert/explorer/testnet/contract/CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB) |
| Pair Registry deployment | `ef6ab62eaf3b52e6e016b03ead1b4d00d956e655aa8649e4f438a025a32ae9e1` | [Transaction](https://stellar.expert/explorer/testnet/tx/ef6ab62eaf3b52e6e016b03ead1b4d00d956e655aa8649e4f438a025a32ae9e1) |
| Swap Analytics | `CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M` | [Contract](https://stellar.expert/explorer/testnet/contract/CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M) |
| Swap Analytics deployment | `2283c853b0d629b6c93bc24ccaf7cb03985c668036551001258e91179255f260` | [Transaction](https://stellar.expert/explorer/testnet/tx/2283c853b0d629b6c93bc24ccaf7cb03985c668036551001258e91179255f260) |
| XLM_USDC registration | `6a0b4e67aed3fd9fa23eec30915cd8d063f708fbc0025c2c2c668c01abc21835` | [Transaction](https://stellar.expert/explorer/testnet/tx/6a0b4e67aed3fd9fa23eec30915cd8d063f708fbc0025c2c2c668c01abc21835) |

`XLM_USDC` is active with a 500 bps maximum and official Testnet USDC issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Swap Analytics calls Pair Registry to require the pair to remain active.

Verified Classic swap example: [4bf84dea63cf11808d90ec66a44cf0f533f717742f2c58e241fc332dc830ed53](https://stellar.expert/explorer/testnet/tx/4bf84dea63cf11808d90ec66a44cf0f533f717742f2c58e241fc332dc830ed53).

## Local development

```sh
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

On Windows, use `copy .env.example .env.local`. Public deployed IDs are in `.env.example`; local environment files remain ignored.

```sh
# frontend
npm test -- --run
npm run lint
npm run build

# contracts
cd ../contracts
cargo fmt --all --check
cargo test
stellar contract build
```

Future work may add an indexer for complete history, more registry-approved pairs, and richer aggregate presentation. Mainnet, arbitrary assets, secret-key handling, and automatic Classic-swap retries remain out of scope.
