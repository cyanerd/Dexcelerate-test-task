import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiService } from './api'
import { GetScannerResultParams, ScannerApiResponse } from '../types/test-task-types'

// Mock fetch
global.fetch = vi.fn()

describe('ApiService', () => {
  let apiService: ApiService
  let mockFetch: ReturnType<typeof vi.mocked<typeof fetch>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.mocked(global.fetch)
    apiService = new ApiService('https://test-api.example.com')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should use default URL when no URL provided', () => {
      const defaultService = new ApiService()
      expect(defaultService).toBeInstanceOf(ApiService)
    })

    it('should use custom URL when provided', () => {
      const customService = new ApiService('https://custom-api.example.com')
      expect(customService).toBeInstanceOf(ApiService)
    })
  })

  describe('fetchScannerData', () => {
    const mockParams: GetScannerResultParams = {
      page: 1,
      minTxns: 20,
      minVol24H: 10000,
      minLiq: 5000,
      chain: 'ETH',
      rankBy: 'volume',
      orderBy: 'desc',
    }

    const mockResponse: ScannerApiResponse = {
      pairs: [
        {
          pairAddress: '0xpair1',
          token1Name: 'Test Token',
          token1Symbol: 'TEST',
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
          discordLink: 'https://discord.gg/test',
          telegramLink: 'https://t.me/test',
          twitterLink: 'https://twitter.com/test',
          webLink: 'https://test.com',
          dexPaid: true,
        },
      ],
      totalRows: 1,
    }

    it('should make successful API call with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await apiService.fetchScannerData(mockParams)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/scanner?page=1&minTxns=20&minVol24H=10000&minLiq=5000&chain=ETH&rankBy=volume&orderBy=desc',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle URL parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const paramsWithSpecialChars: GetScannerResultParams = {
        page: 1,
        minTxns: 20,
        minVol24H: 10000,
      }

      await apiService.fetchScannerData(paramsWithSpecialChars)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/scanner?page=1&minTxns=20&minVol24H=10000',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should filter out null and undefined parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const paramsWithNulls: GetScannerResultParams = {
        page: 1,
        minTxns: 20,
        minVol24H: null,
        minLiq: undefined,
        chain: 'ETH',
      }

      await apiService.fetchScannerData(paramsWithNulls)

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('page=1')
      expect(calledUrl).toContain('minTxns=20')
      expect(calledUrl).toContain('chain=ETH')
      expect(calledUrl).not.toContain('minVol24H')
      expect(calledUrl).not.toContain('minLiq')
    })

    it('should handle array parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const paramsWithArray: GetScannerResultParams = {
        page: 1,
        chains: ['ETH', 'BSC'],
      }

      await apiService.fetchScannerData(paramsWithArray)

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('chains=ETH')
      expect(calledUrl).toContain('chains=BSC')
    })

    it('should throw error for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(apiService.fetchScannerData(mockParams)).rejects.toThrow(
        'HTTP error! status: 404'
      )
    })

    it('should throw error for network failures', async () => {
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValueOnce(networkError)

      await expect(apiService.fetchScannerData(mockParams)).rejects.toThrow(
        'Network error'
      )
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(apiService.fetchScannerData(mockParams)).rejects.toThrow(
        'Invalid JSON'
      )
    })

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValueOnce(networkError)

      try {
        await apiService.fetchScannerData(mockParams)
      } catch {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch scanner data:', networkError)
      consoleSpy.mockRestore()
    })

    it('should handle empty parameters object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await apiService.fetchScannerData({})

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/scanner?',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should handle boolean parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const paramsWithBooleans: GetScannerResultParams = {
        page: 1,
        isNotHP: true,
        hasWebsite: false,
      }

      await apiService.fetchScannerData(paramsWithBooleans)

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('isNotHP=true')
      expect(calledUrl).toContain('hasWebsite=false')
    })

    it('should handle numeric parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const paramsWithNumbers: GetScannerResultParams = {
        page: 1,
        minTxns: 0, // Should include zero
        maxAge: 86400,
        minVol24H: 1000.5, // Should handle decimals
      }

      await apiService.fetchScannerData(paramsWithNumbers)

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('page=1')
      expect(calledUrl).toContain('minTxns=0')
      expect(calledUrl).toContain('maxAge=86400')
      expect(calledUrl).toContain('minVol24H=1000.5')
    })

    it('should set correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await apiService.fetchScannerData(mockParams)

      const [, requestInit] = mockFetch.mock.calls[0]
      expect(requestInit.headers).toEqual({
        'Content-Type': 'application/json',
      })
    })
  })

  describe('error handling edge cases', () => {
    it('should handle response without json method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: undefined,
      })

      await expect(apiService.fetchScannerData({})).rejects.toThrow()
    })

    it('should handle fetch timeout', async () => {
      // Simulate a timeout scenario
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      await expect(apiService.fetchScannerData({})).rejects.toThrow('Timeout')
    })

    it('should handle malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'not an object',
      })

      const result = await apiService.fetchScannerData({})
      expect(result).toBe('not an object')
    })
  })
})
