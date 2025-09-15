/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTokenData } from './useTokenData'
import { apiService } from '../services/api'
import { wsService } from '../services/websocket'
import { ScannerApiResponse, IncomingWebSocketMessage } from '../types/test-task-types'

// Mock services
vi.mock('../services/api')
vi.mock('../services/websocket')

const mockApiService = vi.mocked(apiService)
const mockWsService = vi.mocked(wsService)

describe('useTokenData', () => {
  let mockApiResponse: ScannerApiResponse
  let mockWebSocketMessage: (message: IncomingWebSocketMessage) => void

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock API response
    mockApiResponse = {
      pairs: [
        {
          pairAddress: '0xpair1',
          token1Name: 'Test Token 1',
          token1Symbol: 'TEST1',
          token1Address: '0xtoken1',
          chainId: 1,
          virtualRouterType: 'Uniswap',
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
          discordLink: 'https://discord.gg/test1',
          telegramLink: 'https://t.me/test1',
          twitterLink: 'https://twitter.com/test1',
          webLink: 'https://test1.com',
          dexPaid: true,
        },
        {
          pairAddress: '0xpair2',
          token1Name: 'Test Token 2',
          token1Symbol: 'TEST2',
          token1Address: '0xtoken2',
          chainId: 56,
          virtualRouterType: 'PancakeSwap',
          price: '0.001',
          volume: '25000',
          currentMcap: '500000',
          initialMcap: null,
          pairMcapUsd: null,
          pairMcapUsdInitial: null,
          token1TotalSupplyFormatted: '500000000',
          diff5M: '-5.2',
          diff1H: '12.7',
          diff6H: '-2.1',
          diff24H: '8.9',
          buys: 30,
          sells: 20,
          isMintAuthDisabled: false,
          isFreezeAuthDisabled: true,
          honeyPot: true,
          contractVerified: false,
          age: '2024-01-01T08:00:00Z',
          liquidity: '75000',
          percentChangeInLiquidity: '-8.3',
          migrationProgress: null,
          discordLink: null,
          telegramLink: null,
          twitterLink: null,
          webLink: null,
          dexPaid: false,
        },
      ],
      totalRows: 2,
    }

    // Mock API service
    mockApiService.fetchScannerData.mockResolvedValue(mockApiResponse)

    // Mock WebSocket service
    mockWsService.connect.mockResolvedValue()
    mockWsService.isConnected.mockReturnValue(true)
    mockWsService.subscribe.mockImplementation((callback) => {
      mockWebSocketMessage = callback
      return vi.fn() // Unsubscribe function
    })
    mockWsService.subscribeToPair.mockReturnValue(true)
    mockWsService.subscribeToPairStats.mockReturnValue(true)
    mockWsService.subscribeToScannerFilter.mockReturnValue(true)
    mockWsService.unsubscribeFromPair.mockReturnValue(true)
    mockWsService.unsubscribeFromPairStats.mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial data loading', () => {
    it('should load initial trending tokens data', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.tokens).toEqual([])

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledWith(
        expect.objectContaining({
          rankBy: 'volume',
          orderBy: 'desc',
          minVol24H: 1000,
          isNotHP: true,
          maxAge: 604800,
          page: 1,
        })
      )

      expect(result.current.tokens).toHaveLength(2)
      expect(result.current.totalRows).toBe(2)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load initial new tokens data', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'new' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledWith(
        expect.objectContaining({
          rankBy: 'age',
          orderBy: 'desc',
          maxAge: 86400,
          isNotHP: true,
          page: 1,
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'API Error'
      mockApiService.fetchScannerData.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.tokens).toEqual([])
    })
  })

  describe('filters and sorting', () => {
    it('should apply filters to API call', async () => {
      const filters = {
        chains: ['ETH'],
        minVolume: 100000,
        maxAge: 12,
        minMarketCap: 1000000,
        excludeHoneypots: true,
      }

      const { result } = renderHook(() =>
        useTokenData({ 
          tableType: 'trending',
          filters,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: 'ETH',
          minVol24H: 100000,
          maxAge: 43200, // 12 hours in seconds
          minLiq: 1000000,
          isNotHP: true,
        })
      )
    })

    it('should apply sorting to API call', async () => {
      const { result } = renderHook(() =>
        useTokenData({ 
          tableType: 'trending',
          sortColumn: 'volume',
          sortOrder: 'desc',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledWith(
        expect.objectContaining({
          rankBy: 'volume',
          orderBy: 'desc',
        })
      )
    })

    it('should handle multiple chain filter by using first chain', async () => {
      const filters = {
        chains: ['ETH', 'BSC'],
        minVolume: null,
        maxAge: null,
        minMarketCap: null,
        excludeHoneypots: false,
      }

      const { result } = renderHook(() =>
        useTokenData({ 
          tableType: 'trending',
          filters,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: 'ETH', // First chain selected
        })
      )
    })
  })

  describe('pagination', () => {
    it('should have loadMore function available', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.loadMore).toBe('function')
      expect(result.current.hasMore).toBe(false) // Based on mock data
    })

    it('should not load more when already loading', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      // Call loadMore while still loading
      act(() => {
        result.current.loadMore()
        result.current.loadMore() // Second call should be ignored
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(1)
    })

    it('should not load more when no more data available', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.loadMore()
      })

      // Should not make additional API call since hasMore is false
      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(1)
    })
  })

  describe('WebSocket integration', () => {
    it('should connect to WebSocket and subscribe to tokens', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockWsService.connect).toHaveBeenCalled()
      expect(mockWsService.subscribe).toHaveBeenCalled()
      expect(mockWsService.subscribeToPair).toHaveBeenCalledWith('0xpair1', '0xtoken1', 'ETH')
      expect(mockWsService.subscribeToPair).toHaveBeenCalledWith('0xpair2', '0xtoken2', 'BSC')
      expect(mockWsService.subscribeToPairStats).toHaveBeenCalledWith('0xpair1', '0xtoken1', 'ETH')
      expect(mockWsService.subscribeToPairStats).toHaveBeenCalledWith('0xpair2', '0xtoken2', 'BSC')
      expect(result.current.connected).toBe(true)
    })

    it('should handle WebSocket connection failure', async () => {
      mockWsService.connect.mockRejectedValue(new Error('Connection failed'))

      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.connected).toBe(false)
    })

    it('should handle tick message updates', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialPrice = result.current.tokens[0].priceUsd
      const newPrice = 2.0

      // Simulate WebSocket tick message
      act(() => {
        mockWebSocketMessage({
          event: 'tick',
          data: {
            pair: { pair: '0xpair1' },
            swaps: [
              {
                priceToken1Usd: newPrice.toString(),
                isOutlier: false,
              },
            ],
          },
        } as any)
      })

      expect(result.current.tokens[0].priceUsd).toBe(newPrice)
      expect(result.current.tokens[0].mcap).toBe(result.current.tokens[0].totalSupply * newPrice)
      expect(result.current.tokens[0].priceUsd).not.toBe(initialPrice)
    })

    it('should handle pair-stats message updates', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate WebSocket pair-stats message
      act(() => {
        mockWebSocketMessage({
          event: 'pair-stats',
          data: {
            pair: {
              pairAddress: '0xpair1',
              mintAuthorityRenounced: true,
              freezeAuthorityRenounced: false,
              token1IsHoneypot: false,
              isVerified: true,
              linkTwitter: 'https://twitter.com/updated',
              linkTelegram: null,
              linkWebsite: 'https://updated.com',
              linkDiscord: null,
              dexPaid: false,
            },
            migrationProgress: '85.5',
          },
        } as any)
      })

      const updatedToken = result.current.tokens[0]
      expect(updatedToken.migrationPc).toBe(85.5)
      expect(updatedToken.audit.mintable).toBe(true)
      expect(updatedToken.audit.freezable).toBe(false)
      expect(updatedToken.socialLinks.twitter).toBe('https://twitter.com/updated')
      expect(updatedToken.socialLinks.website).toBe('https://updated.com')
      expect(updatedToken.dexPaid).toBe(false)
    })

    it('should handle scanner-pairs message updates', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const originalTokensCount = result.current.tokens.length

      // Simulate WebSocket scanner-pairs message with new data
      act(() => {
        mockWebSocketMessage({
          event: 'scanner-pairs',
          data: {
            results: {
              pairs: [
                {
                  ...mockApiResponse.pairs[0],
                  price: '2.5', // Updated price
                },
                {
                  ...mockApiResponse.pairs[1],
                },
                {
                  // New token
                  pairAddress: '0xpair3',
                  token1Name: 'New Token',
                  token1Symbol: 'NEW',
                  token1Address: '0xtoken3',
                  chainId: 1,
                  price: '0.1',
                  age: '2024-01-01T12:00:00Z',
                },
              ],
              totalRows: 3,
            },
          },
        } as any)
      })

      expect(result.current.tokens.length).toBeGreaterThanOrEqual(originalTokensCount)
      // First token should have updated price
      expect(result.current.tokens.find(t => t.pairAddress === '0xpair1')?.priceUsd).toBe(2.5)
    })

    it('should ignore outlier swaps in tick messages', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const originalPrice = result.current.tokens[0].priceUsd

      // Simulate WebSocket tick message with outlier swap
      act(() => {
        mockWebSocketMessage({
          event: 'tick',
          data: {
            pair: { pair: '0xpair1' },
            swaps: [
              {
                priceToken1Usd: '999.0',
                isOutlier: true, // This should be ignored
              },
            ],
          },
        } as any)
      })

      // Price should not change due to outlier
      expect(result.current.tokens[0].priceUsd).toBe(originalPrice)
    })
  })

  describe('data refresh', () => {
    it('should refresh data when refreshData is called', async () => {
      const { result } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.refreshData()
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(2)
    })
  })

  describe('effect dependencies', () => {
    it('should reload data when filters change', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useTokenData({ tableType: 'trending', filters }),
        {
          initialProps: { filters: { chains: ['ETH'], minVolume: null, maxAge: null, minMarketCap: null, excludeHoneypots: false } },
        }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(1)

      // Change filters
      rerender({ 
        filters: { 
          chains: ['BSC'], 
          minVolume: 50000, 
          maxAge: null, 
          minMarketCap: null, 
          excludeHoneypots: false 
        } 
      })

      await waitFor(() => {
        expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(2)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          chain: 'BSC',
          minVol24H: 50000,
        })
      )
    })

    it('should reload data when sort changes', async () => {
      const { result, rerender } = renderHook(
        ({ sortColumn, sortOrder }) => 
          useTokenData({ tableType: 'trending', sortColumn, sortOrder }),
        {
          initialProps: { sortColumn: undefined, sortOrder: undefined },
        }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(1)

      // Change sorting
      rerender({ sortColumn: 'volume' as any, sortOrder: 'desc' as any })

      await waitFor(() => {
        expect(mockApiService.fetchScannerData).toHaveBeenCalledTimes(2)
      })

      expect(mockApiService.fetchScannerData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rankBy: 'volume',
          orderBy: 'desc',
        })
      )
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe from WebSocket when unmounting', async () => {
      const unsubscribeFn = vi.fn()
      mockWsService.subscribe.mockReturnValue(unsubscribeFn)

      const { result, unmount } = renderHook(() =>
        useTokenData({ tableType: 'trending' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      unmount()

      expect(unsubscribeFn).toHaveBeenCalled()
    })
  })
})
