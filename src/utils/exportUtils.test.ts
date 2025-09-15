import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, exportToJSON } from './exportUtils'
import { TokenData } from '../types/test-task-types'

// Mock DOM
globalThis.URL = { createObjectURL: vi.fn(() => 'mock-url'), revokeObjectURL: vi.fn() } as unknown as typeof URL
globalThis.Blob = vi.fn() as unknown as typeof Blob
globalThis.alert = vi.fn()

describe('exportUtils', () => {
  let mockLink: HTMLAnchorElement
  let mockTokens: TokenData[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockLink = { href: '', download: '', style: { display: '' }, click: vi.fn() }
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

    mockTokens = [{
      id: '1',
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      priceUsd: 1.5,
      volumeUsd: 50000,
      mcap: 1000000,
      priceChangePcs: { '5M': 2.5, '1H': -1.2, '6H': 5.8, '24H': -3.4 },
      transactions: { buys: 15, sells: 8 },
      liquidity: { current: 10000, changePc: 5.5 },
      audit: { mintable: false, freezable: false, honeypot: false, contractVerified: true },
      tokenCreatedTimestamp: new Date(),
      socialLinks: {},
      lastUpdated: new Date(),
    }] as TokenData[]
  })

  describe('CSV export', () => {
    it('should export CSV with correct data', () => {
      exportToCSV(mockTokens)
      
      expect(mockLink.click).toHaveBeenCalled()
      expect(globalThis.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Test Token')],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should handle empty data', () => {
      exportToCSV([])
      expect(globalThis.alert).toHaveBeenCalledWith('No data to export')
    })
  })

  describe('JSON export', () => {
    it('should export JSON with correct structure', () => {
      exportToJSON(mockTokens)
      
      expect(mockLink.click).toHaveBeenCalled()
      expect(globalThis.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('"exportedAt"')],
        { type: 'application/json;charset=utf-8;' }
      )
    })
  })
})
