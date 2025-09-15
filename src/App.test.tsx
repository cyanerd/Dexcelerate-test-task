import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock the heavy components
vi.mock('./components/TokenTable', () => ({
  TokenTable: () => <div data-testid="token-table">Token Table</div>
}))

vi.mock('./components/FilterControls', () => ({
  FilterControls: () => <div data-testid="filter-controls">Filter Controls</div>
}))

vi.mock('./components/ExportButton', () => ({
  ExportButton: () => <div data-testid="export-button">Export Button</div>
}))

// Mock the hook
vi.mock('./hooks/useTokenData', () => ({
  useTokenData: () => ({
    tokens: [],
    loading: false,
    error: null,
    totalRows: 0,
    connected: true,
    loadMore: vi.fn(),
    hasMore: false,
    refreshData: vi.fn(),
  })
}))

describe('App', () => {
  it('should render main layout with all components', () => {
    render(<App />)
    
    expect(screen.getByText('Trending Tokens')).toBeInTheDocument()
    expect(screen.getAllByTestId('filter-controls')).toHaveLength(2)
    expect(screen.getAllByTestId('token-table')).toHaveLength(2)
    expect(screen.getAllByTestId('export-button')).toHaveLength(2)
  })

  it('should have trending and new sections', () => {
    render(<App />)
    
    expect(screen.getByText('Trending Tokens')).toBeInTheDocument()
    expect(screen.getByText('New Tokens')).toBeInTheDocument()
  })
})
