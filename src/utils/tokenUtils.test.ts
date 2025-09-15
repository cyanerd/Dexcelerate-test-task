import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  chainIdToName,
  calculateMarketCap,
  generateMockPriceHistory,
  scannerResultToToken,
} from './tokenUtils'
import { ScannerResult } from '../types/test-task-types'

describe('tokenUtils', () => {
  describe('chainIdToName', () => {
    it('should convert known chain IDs to names', () => {
      expect(chainIdToName(1)).toBe('ETH')
      expect(chainIdToName(56)).toBe('BSC')
      expect(chainIdToName(8453)).toBe('BASE')
      expect(chainIdToName(900)).toBe('SOL')
    })

    it('should default to ETH for unknown chain IDs', () => {
      expect(chainIdToName(999)).toBe('ETH')
      expect(chainIdToName(0)).toBe('ETH')
      expect(chainIdToName(-1)).toBe('ETH')
    })
  })

  describe('calculateMarketCap', () => {
    it('should prioritize currentMcap', () => {
      const result = {
        currentMcap: '1000000',
        initialMcap: '500000',
        pairMcapUsd: '750000',
        pairMcapUsdInitial: '250000',
        token1TotalSupplyFormatted: '1000000',
        price: '0.5',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(1000000)
    })

    it('should fall back to initialMcap when currentMcap is unavailable', () => {
      const result = {
        currentMcap: null,
        initialMcap: '500000',
        pairMcapUsd: '750000',
        pairMcapUsdInitial: '250000',
        token1TotalSupplyFormatted: '1000000',
        price: '0.5',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(500000)
    })

    it('should fall back to pairMcapUsd when currentMcap and initialMcap are unavailable', () => {
      const result = {
        currentMcap: null,
        initialMcap: null,
        pairMcapUsd: '750000',
        pairMcapUsdInitial: '250000',
        token1TotalSupplyFormatted: '1000000',
        price: '0.5',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(750000)
    })

    it('should fall back to pairMcapUsdInitial', () => {
      const result = {
        currentMcap: null,
        initialMcap: null,
        pairMcapUsd: null,
        pairMcapUsdInitial: '250000',
        token1TotalSupplyFormatted: '1000000',
        price: '0.5',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(250000)
    })

    it('should calculate from total supply and price as last resort', () => {
      const result = {
        currentMcap: null,
        initialMcap: null,
        pairMcapUsd: null,
        pairMcapUsdInitial: null,
        token1TotalSupplyFormatted: '1000000',
        price: '0.5',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(500000) // 1000000 * 0.5
    })

    it('should handle invalid values gracefully', () => {
      const result = {
        currentMcap: 'invalid',
        initialMcap: '',
        pairMcapUsd: null,
        pairMcapUsdInitial: undefined,
        token1TotalSupplyFormatted: '1000000',
        price: '0.1',
      } as ScannerResult

      expect(calculateMarketCap(result)).toBe(100000) // Falls back to calculation
    })
  })

  describe('generateMockPriceHistory', () => {
    beforeEach(() => {
      // Mock Math.random to make tests deterministic
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should generate price history with correct length', () => {
      const currentPrice = 1.0
      const tokenAge = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      
      const history = generateMockPriceHistory(currentPrice, tokenAge)
      
      expect(history.length).toBeGreaterThanOrEqual(10)
      expect(history.length).toBeLessThanOrEqual(50)
    })

    it('should ensure last price matches current price', () => {
      const currentPrice = 2.5
      const tokenAge = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      const history = generateMockPriceHistory(currentPrice, tokenAge)
      
      expect(history[history.length - 1].price).toBe(currentPrice)
    })

    it('should generate positive prices', () => {
      const currentPrice = 0.001
      const tokenAge = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      const history = generateMockPriceHistory(currentPrice, tokenAge)
      
      history.forEach(point => {
        expect(point.price).toBeGreaterThan(0)
        expect(point.timestamp).toBeGreaterThanOrEqual(tokenAge.getTime())
      })
    })

    it('should have chronological timestamps', () => {
      const currentPrice = 1.0
      const tokenAge = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      const history = generateMockPriceHistory(currentPrice, tokenAge)
      
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i - 1].timestamp)
      }
    })

    it('should handle very recent tokens', () => {
      const currentPrice = 1.0
      const tokenAge = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      
      const history = generateMockPriceHistory(currentPrice, tokenAge)
      
      expect(history.length).toBeGreaterThanOrEqual(10)
      expect(history[0].timestamp).toBeGreaterThanOrEqual(tokenAge.getTime())
    })
  })

  describe('scannerResultToToken', () => {
    const mockScannerResult: ScannerResult = {
      pairAddress: '0xpair123',
      token1Name: 'Test Token',
      token1Symbol: 'TEST',
      token1Address: '0xtoken123',
      chainId: 1,
      virtualRouterType: 'UniswapV2',
      price: '1.5',
      volume: '50000',
      currentMcap: '1000000',
      initialMcap: null,
      pairMcapUsd: null,
      pairMcapUsdInitial: null,
      token1TotalSupplyFormatted: '666667',
      diff5M: '2.5',
      diff1H: '-1.2',
      diff6H: '5.8',
      diff24H: '-3.4',
      buys: 15,
      sells: 8,
      isMintAuthDisabled: true,
      isFreezeAuthDisabled: false,
      honeyPot: false,
      contractVerified: true,
      age: '2024-01-01T10:00:00Z',
      liquidity: '100000',
      percentChangeInLiquidity: '15.5',
      migrationProgress: '75.0',
      discordLink: 'https://discord.gg/test',
      telegramLink: 'https://t.me/test',
      twitterLink: 'https://twitter.com/test',
      webLink: 'https://test.com',
      dexPaid: true,
    } as ScannerResult

    it('should convert scanner result to token data correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.id).toBe('0xpair123')
      expect(token.tokenName).toBe('Test Token')
      expect(token.tokenSymbol).toBe('TEST')
      expect(token.tokenAddress).toBe('0xtoken123')
      expect(token.pairAddress).toBe('0xpair123')
      expect(token.chain).toBe('ETH')
      expect(token.exchange).toBe('UniswapV2')
      expect(token.priceUsd).toBe(1.5)
      expect(token.volumeUsd).toBe(50000)
      expect(token.mcap).toBe(1000000)
      expect(token.totalSupply).toBe(666667)
    })

    it('should map price changes correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.priceChangePcs['5M']).toBe(2.5)
      expect(token.priceChangePcs['1H']).toBe(-1.2)
      expect(token.priceChangePcs['6H']).toBe(5.8)
      expect(token.priceChangePcs['24H']).toBe(-3.4)
    })

    it('should map transactions correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.transactions.buys).toBe(15)
      expect(token.transactions.sells).toBe(8)
    })

    it('should map audit information correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.audit.mintable).toBe(false) // isMintAuthDisabled: true means not mintable
      expect(token.audit.freezable).toBe(true) // isFreezeAuthDisabled: false means freezable
      expect(token.audit.honeypot).toBe(false)
      expect(token.audit.contractVerified).toBe(true)
    })

    it('should parse timestamps correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.tokenCreatedTimestamp).toEqual(new Date('2024-01-01T10:00:00Z'))
      expect(token.lastUpdated).toBeInstanceOf(Date)
    })

    it('should map liquidity information correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.liquidity.current).toBe(100000)
      expect(token.liquidity.changePc).toBe(15.5)
    })

    it('should map social links correctly', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.socialLinks.discord).toBe('https://discord.gg/test')
      expect(token.socialLinks.telegram).toBe('https://t.me/test')
      expect(token.socialLinks.twitter).toBe('https://twitter.com/test')
      expect(token.socialLinks.website).toBe('https://test.com')
    })

    it('should handle missing data gracefully', () => {
      const incompleteResult = {
        pairAddress: '0xpair456',
        chainId: 999, // Unknown chain
        age: '2024-01-01T10:00:00Z',
        price: 'invalid',
      } as ScannerResult

      const token = scannerResultToToken(incompleteResult)

      expect(token.id).toBe('0xpair456')
      expect(token.tokenName).toBe('Unknown Token')
      expect(token.tokenSymbol).toBe('UNK')
      expect(token.chain).toBe('ETH') // Default for unknown chain
      expect(token.priceUsd).toBe(0) // Safe parsing of invalid price
      expect(token.exchange).toBe('Router') // Default
    })

    it('should generate price history', () => {
      const token = scannerResultToToken(mockScannerResult)

      expect(token.priceHistory).toBeDefined()
      expect(Array.isArray(token.priceHistory)).toBe(true)
      expect(token.priceHistory!.length).toBeGreaterThan(0)
      
      // Last price should match current price
      const lastPrice = token.priceHistory![token.priceHistory!.length - 1].price
      expect(lastPrice).toBe(token.priceUsd)
    })

    it('should handle migration progress correctly', () => {
      const token = scannerResultToToken(mockScannerResult)
      expect(token.migrationPc).toBe(75.0)

      const resultWithoutMigration = {
        ...mockScannerResult,
        migrationProgress: null,
      } as ScannerResult

      const tokenWithoutMigration = scannerResultToToken(resultWithoutMigration)
      expect(tokenWithoutMigration.migrationPc).toBeUndefined()
    })
  })
})
