import { Horizon } from '@stellar/stellar-sdk'
import { stellarConfig } from '../config/stellar'
import type { AccountBalanceResult } from '../types/stellar'
import { TESTNET_USDC_ISSUER } from '../config/assets'

type Balance = { asset_type: string; balance: string; asset_code?: string; asset_issuer?: string; is_authorized?: boolean; is_authorized_to_maintain_liabilities?: boolean }
type AccountLike = { balances: Balance[] }
type AccountLoader = { loadAccount: (address: string) => Promise<AccountLike> }

export function extractXlmBalance(account: AccountLike): string | null {
  return account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? null
}

export function detectUsdcTrustline(account: AccountLike): { status: 'present' | 'missing' | 'unauthorized'; balance: string | null } {
  const line = account.balances.find((balance) => balance.asset_code === 'USDC' && balance.asset_issuer === TESTNET_USDC_ISSUER)
  if (!line) return { status: 'missing', balance: null }
  if (line.is_authorized === false || line.is_authorized_to_maintain_liabilities === false) return { status: 'unauthorized', balance: line.balance }
  return { status: 'present', balance: line.balance }
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { response?: { status?: number }; status?: number }
  return candidate.response?.status === 404 || candidate.status === 404
}

export async function loadXlmBalance(address: string, server: AccountLoader = new Horizon.Server(stellarConfig.horizonUrl)): Promise<AccountBalanceResult> {
  try {
    const account = await server.loadAccount(address)
    const trustline = detectUsdcTrustline(account)
    return { kind: 'funded', xlmBalance: extractXlmBalance(account) ?? '0.0000000', usdcBalance: trustline.balance, trustlineStatus: trustline.status }
  } catch (error) {
    if (isNotFoundError(error)) return { kind: 'unfunded' }
    throw new Error('Horizon is temporarily unavailable. Please try again.')
  }
}
