import { Horizon } from '@stellar/stellar-sdk'
import { stellarConfig } from '../config/stellar'
import type { AccountBalanceResult } from '../types/stellar'

type Balance = { asset_type: string; balance: string }
type AccountLike = { balances: Balance[] }
type AccountLoader = { loadAccount: (address: string) => Promise<AccountLike> }

export function extractXlmBalance(account: AccountLike): string | null {
  return account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? null
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { response?: { status?: number }; status?: number }
  return candidate.response?.status === 404 || candidate.status === 404
}

export async function loadXlmBalance(address: string, server: AccountLoader = new Horizon.Server(stellarConfig.horizonUrl)): Promise<AccountBalanceResult> {
  try {
    const account = await server.loadAccount(address)
    return { kind: 'funded', xlmBalance: extractXlmBalance(account) ?? '0.0000000' }
  } catch (error) {
    if (isNotFoundError(error)) return { kind: 'unfunded' }
    throw new Error('Horizon is temporarily unavailable. Please try again.')
  }
}
