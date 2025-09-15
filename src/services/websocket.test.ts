/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketService } from './websocket'
import { IncomingWebSocketMessage, OutgoingWebSocketMessage } from '../types/test-task-types'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen({} as Event)
      }
    }, 0)
  }

  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({} as CloseEvent)
    }
  })

  // Helper methods for testing
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror({} as Event)
    }
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({} as CloseEvent)
    }
  }
}

global.WebSocket = MockWebSocket as any

describe('WebSocketService', () => {
  let wsService: WebSocketService
  let mockWs: MockWebSocket

  beforeEach(() => {
    vi.clearAllMocks()
    wsService = new WebSocketService('wss://test-ws.example.com')
  })

  afterEach(() => {
    wsService.disconnect()
    vi.restoreAllMocks()
  })

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const connectPromise = wsService.connect()
      
      // Wait for connection to be established
      await connectPromise

      expect(wsService.isConnected()).toBe(true)
    })

    it('should handle connection errors', async () => {
      // Mock WebSocket to fail immediately
      vi.spyOn(global, 'WebSocket').mockImplementationOnce(() => {
        throw new Error('Connection failed')
      })

      await expect(wsService.connect()).rejects.toThrow('Connection failed')
      expect(wsService.isConnected()).toBe(false)
    })

    it('should prevent multiple connections', async () => {
      await wsService.connect()
      const result = await wsService.connect() // Second call
      
      expect(wsService.isConnected()).toBe(true)
    })

    it('should disconnect properly', async () => {
      await wsService.connect()
      
      const closeSpy = vi.fn()
      const ws = (wsService as any).ws as MockWebSocket
      ws.close = closeSpy

      wsService.disconnect()

      expect(closeSpy).toHaveBeenCalled()
      expect(wsService.isConnected()).toBe(false)
    })

    it('should clear subscriptions on disconnect', async () => {
      await wsService.connect()
      
      // Add some subscriptions
      wsService.subscribeToPair('0xpair1', '0xtoken1', 'ETH')
      
      wsService.disconnect()
      
      const subscriptions = (wsService as any).subscriptions as Set<string>
      expect(subscriptions.size).toBe(0)
    })
  })

  describe('reconnection logic', () => {
    it('should handle disconnection gracefully', async () => {
      await wsService.connect()
      expect(wsService.isConnected()).toBe(true)
      
      wsService.disconnect()
      expect(wsService.isConnected()).toBe(false)
    })
  })

  describe('message handling', () => {
    it('should call callbacks on message received', async () => {
      const callback = vi.fn()
      const unsubscribe = wsService.subscribe(callback)
      
      await wsService.connect()
      
      const testMessage: IncomingWebSocketMessage = {
        event: 'tick',
        data: { test: 'data' },
      }
      
      const ws = (wsService as any).ws as MockWebSocket
      ws.simulateMessage(testMessage)
      
      expect(callback).toHaveBeenCalledWith(testMessage)
      
      unsubscribe()
    })

    it('should handle multiple callbacks', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      wsService.subscribe(callback1)
      wsService.subscribe(callback2)
      
      await wsService.connect()
      
      const testMessage: IncomingWebSocketMessage = {
        event: 'tick',
        data: { test: 'data' },
      }
      
      const ws = (wsService as any).ws as MockWebSocket
      ws.simulateMessage(testMessage)
      
      expect(callback1).toHaveBeenCalledWith(testMessage)
      expect(callback2).toHaveBeenCalledWith(testMessage)
    })

    it('should handle malformed JSON messages gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const callback = vi.fn()
      
      wsService.subscribe(callback)
      await wsService.connect()
      
      const ws = (wsService as any).ws as MockWebSocket
      if (ws.onmessage) {
        ws.onmessage({ data: 'invalid json' } as MessageEvent)
      }
      
      expect(callback).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should remove callback when unsubscribe is called', async () => {
      const callback = vi.fn()
      const unsubscribe = wsService.subscribe(callback)
      
      await wsService.connect()
      
      // Unsubscribe before sending message
      unsubscribe()
      
      const testMessage: IncomingWebSocketMessage = {
        event: 'tick',
        data: { test: 'data' },
      }
      
      const ws = (wsService as any).ws as MockWebSocket
      ws.simulateMessage(testMessage)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('sending messages', () => {
    it('should send message when connected', async () => {
      await wsService.connect()
      
      const message: OutgoingWebSocketMessage = {
        event: 'subscribe-pair',
        data: { pair: '0xpair1', token: '0xtoken1', chain: 'ETH' },
      }
      
      const result = wsService.send(message)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(result).toBe(true)
    })

    it('should not send message when not connected', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const message: OutgoingWebSocketMessage = {
        event: 'subscribe-pair',
        data: { pair: '0xpair1', token: '0xtoken1', chain: 'ETH' },
      }
      
      const result = wsService.send(message)
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'WebSocket not connected, cannot send message'
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle send errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await wsService.connect()
      
      const ws = (wsService as any).ws as MockWebSocket
      ws.send.mockImplementationOnce(() => {
        throw new Error('Send failed')
      })
      
      const message: OutgoingWebSocketMessage = {
        event: 'subscribe-pair',
        data: { pair: '0xpair1', token: '0xtoken1', chain: 'ETH' },
      }
      
      const result = wsService.send(message)
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket message:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('subscription management', () => {
    it('should store subscription messages for reconnection', async () => {
      await wsService.connect()
      
      wsService.subscribeToPair('0xpair1', '0xtoken1', 'ETH')
      
      const subscriptions = (wsService as any).subscriptions as Set<string>
      expect(subscriptions.size).toBe(1)
      
      const subscription = Array.from(subscriptions)[0]
      const parsedSubscription = JSON.parse(subscription)
      expect(parsedSubscription.event).toBe('subscribe-pair')
    })

    it('should handle subscription operations', async () => {
      await wsService.connect()
      
      const result1 = wsService.subscribeToPair('0xpair1', '0xtoken1', 'ETH')
      const result2 = wsService.unsubscribeFromPair('0xpair1', '0xtoken1', 'ETH')
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })

  describe('convenience methods', () => {
    beforeEach(async () => {
      await wsService.connect()
    })

    it('should subscribe to scanner filter', () => {
      const params = { page: 1, minTxns: 20 }
      const result = wsService.subscribeToScannerFilter(params)
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'scanner-filter',
          data: params,
        })
      )
    })

    it('should unsubscribe from scanner filter', () => {
      const params = { page: 1, minTxns: 20 }
      const result = wsService.unsubscribeFromScannerFilter(params)
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'unsubscribe-scanner-filter',
          data: params,
        })
      )
    })

    it('should subscribe to pair', () => {
      const result = wsService.subscribeToPair('0xpair1', '0xtoken1', 'ETH')
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'subscribe-pair',
          data: {
            pair: '0xpair1',
            token: '0xtoken1',
            chain: 'ETH',
          },
        })
      )
    })

    it('should unsubscribe from pair', () => {
      const result = wsService.unsubscribeFromPair('0xpair1', '0xtoken1', 'ETH')
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'unsubscribe-pair',
          data: {
            pair: '0xpair1',
            token: '0xtoken1',
            chain: 'ETH',
          },
        })
      )
    })

    it('should subscribe to pair stats', () => {
      const result = wsService.subscribeToPairStats('0xpair1', '0xtoken1', 'ETH')
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'subscribe-pair-stats',
          data: {
            pair: '0xpair1',
            token: '0xtoken1',
            chain: 'ETH',
          },
        })
      )
    })

    it('should unsubscribe from pair stats', () => {
      const result = wsService.unsubscribeFromPairStats('0xpair1', '0xtoken1', 'ETH')
      
      expect(result).toBe(true)
      
      const ws = (wsService as any).ws as MockWebSocket
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'unsubscribe-pair-stats',
          data: {
            pair: '0xpair1',
            token: '0xtoken1',
            chain: 'ETH',
          },
        })
      )
    })
  })

  describe('edge cases', () => {
    it('should handle WebSocket onerror event', async () => {
      const connectPromise = wsService.connect()
      
      // Simulate error during connection
      const ws = (wsService as any).ws as MockWebSocket
      ws.readyState = MockWebSocket.CONNECTING
      ws.simulateError()
      
      await expect(connectPromise).rejects.toBeDefined()
    })

    it('should handle JSON stringify errors in send', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await wsService.connect()
      
      // Create a circular reference that can't be JSON.stringify'd
      const circularData: any = { test: 'data' }
      circularData.circular = circularData
      
      const message: OutgoingWebSocketMessage = {
        event: 'test',
        data: circularData,
      }
      
      const result = wsService.send(message)
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket message:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle edge cases gracefully', async () => {
      await wsService.connect()
      
      // Test edge case scenarios
      const result = wsService.send({
        event: 'test-event',
        data: { test: 'data' }
      })
      
      expect(result).toBe(true)
    })
  })
})
