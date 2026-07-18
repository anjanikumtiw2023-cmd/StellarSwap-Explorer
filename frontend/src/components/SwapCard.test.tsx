import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletViewModel } from '../types/stellar'
import { SwapCard } from './SwapCard'

vi.mock('../hooks/useOrderbook', () => ({ useOrderbook: () => ({ status: 'empty', book: null, message: 'No offers are available for this pair.', retry: vi.fn() }) }))
const wallet: WalletViewModel = {
  status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success',
  xlmBalance: '10', usdcBalance: '4', trustlineStatus: 'present', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn(),
}

describe('SwapCard asset selection', () => {
  beforeEach(() => vi.clearAllMocks())
  it('prevents selecting the same asset on both sides', () => {
    render(<SwapCard wallet={wallet} />)
    const from = screen.getByLabelText('From asset') as HTMLSelectElement
    const usdc = Array.from(from.options).find((option) => option.textContent?.startsWith('USDC'))
    expect(usdc).toBeDisabled()
  })
  it('switches direction and preserves wallet balances', async () => {
    render(<SwapCard wallet={wallet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch swap direction' }))
    expect((screen.getByLabelText('From asset') as HTMLSelectElement).value).toContain('credit:USDC')
    expect(screen.getByLabelText('To asset')).toHaveValue('native:XLM')
    expect(screen.getByText('Balance: 4 USDC')).toBeInTheDocument()
  })
})
