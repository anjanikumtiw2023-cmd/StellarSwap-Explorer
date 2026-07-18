export type WalletStatus = 'checking' | 'disconnected' | 'connecting' | 'connected' | 'not-installed' | 'wrong-network' | 'error'
export type HorizonStatus = 'idle' | 'loading' | 'success' | 'unfunded' | 'error'

export interface WalletViewModel {
  status: WalletStatus
  address: string | null
  shortAddress: string
  network: string | null
  message: string
  horizonStatus: HorizonStatus
  xlmBalance: string | null
  connect: () => Promise<void>
  retryBalance: () => Promise<void>
}

export type AccountBalanceResult =
  | { kind: 'funded'; xlmBalance: string }
  | { kind: 'unfunded' }
