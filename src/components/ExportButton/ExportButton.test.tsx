import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportButton } from './ExportButton'
import { TokenData } from '../../types/test-task-types'
import * as exportUtils from '../../utils/exportUtils'

vi.mock('../../utils/exportUtils')

describe('ExportButton', () => {
  let mockTokens: TokenData[]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(exportUtils, 'exportTokens').mockImplementation(() => {})
    mockTokens = [{ id: '1', tokenName: 'Test Token' }] as TokenData[]
  })

  it('should render with token count', () => {
    render(<ExportButton tokens={mockTokens} />)
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByTitle('Export 1 tokens')).toBeInTheDocument()
  })

  it('should disable when no tokens', () => {
    render(<ExportButton tokens={[]} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should open dropdown with export options', async () => {
    const user = userEvent.setup()
    render(<ExportButton tokens={mockTokens} />)
    
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })
})
