import { Networks } from '@stellar/stellar-sdk'

const env = import.meta.env

export const stellarConfig = Object.freeze({
  network: env.VITE_STELLAR_NETWORK || 'TESTNET',
  networkPassphrase: env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET,
  horizonUrl: env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  pairRegistryContractId: env.VITE_PAIR_REGISTRY_CONTRACT_ID || '',
  swapAnalyticsContractId: env.VITE_SWAP_ANALYTICS_CONTRACT_ID || '',
})

export function isTestnetNetwork(network: string, passphrase?: string): boolean {
  return network.trim().toUpperCase() === 'TESTNET' && (!passphrase || passphrase === Networks.TESTNET)
}
