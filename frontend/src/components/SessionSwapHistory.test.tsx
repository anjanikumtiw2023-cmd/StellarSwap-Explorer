import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionSwapHistory } from './SessionSwapHistory'

describe('SessionSwapHistory', () => {
  it('labels and renders successful current-session swaps', () => {
    render(<SessionSwapHistory swaps={[{ fromCode: 'XLM', toCode: 'USDC', sentAmount: '1', receivedAmount: '2', timestamp: new Date('2026-01-01T00:00:00Z'), hash: 'abcdef1234567890', explorerUrl: 'https://stellar.expert/explorer/testnet/tx/abcdef1234567890', status: 'success' }]} />)
    expect(screen.getByText('Current-session swaps')).toBeInTheDocument(); expect(screen.getByText(/1 XLM → 2 USDC/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Testnet transaction' })).toHaveAttribute('href', expect.stringContaining('/testnet/tx/'))
  })
})
