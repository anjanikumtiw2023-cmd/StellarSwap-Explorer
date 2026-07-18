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
- Add Classic DEX/path-payment quotes and configurable slippage.
- Add transaction review, Freighter signing, and swap submission.
- Add trustline workflows where explicitly approved by the user.
- Deploy contracts and record user-authorized analytics after verified settlement.

Phase 1 does not create trustlines, submit swaps, trade on orderbooks, deploy contracts, or request secret keys.
