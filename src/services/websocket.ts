import { 
  OutgoingWebSocketMessage, 
  IncomingWebSocketMessage,
  GetScannerResultParams,
  SupportedChainName 
} from '../types/test-task-types';

const WS_URL = 'wss://api-rs.dexcelerate.com/ws';

export type WSEventCallback = (message: IncomingWebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private callbacks: Set<WSEventCallback> = new Set();
  private isConnecting = false;
  private shouldReconnect = true;
  private subscriptions: Set<string> = new Set();

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: IncomingWebSocketMessage = JSON.parse(event.data);
            this.callbacks.forEach(callback => callback(message));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.subscriptions.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  private resubscribeAll(): void {
    // Re-send all subscriptions after reconnect
    this.subscriptions.forEach(subscription => {
      try {
        const message = JSON.parse(subscription);
        this.send(message);
      } catch (error) {
        console.error('Failed to resubscribe:', error);
      }
    });
  }

  send(message: OutgoingWebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      
      // Store subscriptions for reconnection
      if (message.event.includes('subscribe') && !message.event.includes('unsubscribe')) {
        this.subscriptions.add(messageStr);
      } else if (message.event.includes('unsubscribe')) {
        // Remove from subscriptions
        const subscribeMessage = { ...message, event: message.event.replace('unsubscribe-', '') };
        this.subscriptions.delete(JSON.stringify(subscribeMessage));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  subscribe(callback: WSEventCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Convenience methods for common subscriptions
  subscribeToScannerFilter(params: GetScannerResultParams): boolean {
    return this.send({
      event: 'scanner-filter',
      data: params
    });
  }

  unsubscribeFromScannerFilter(params: GetScannerResultParams): boolean {
    return this.send({
      event: 'unsubscribe-scanner-filter',
      data: params
    });
  }

  subscribeToPair(pairAddress: string, tokenAddress: string, chain: SupportedChainName): boolean {
    return this.send({
      event: 'subscribe-pair',
      data: {
        pair: pairAddress,
        token: tokenAddress,
        chain: chain
      }
    });
  }

  unsubscribeFromPair(pairAddress: string, tokenAddress: string, chain: SupportedChainName): boolean {
    return this.send({
      event: 'unsubscribe-pair',
      data: {
        pair: pairAddress,
        token: tokenAddress,
        chain: chain
      }
    });
  }

  subscribeToPairStats(pairAddress: string, tokenAddress: string, chain: SupportedChainName): boolean {
    return this.send({
      event: 'subscribe-pair-stats',
      data: {
        pair: pairAddress,
        token: tokenAddress,
        chain: chain
      }
    });
  }

  unsubscribeFromPairStats(pairAddress: string, tokenAddress: string, chain: SupportedChainName): boolean {
    return this.send({
      event: 'unsubscribe-pair-stats',
      data: {
        pair: pairAddress,
        token: tokenAddress,
        chain: chain
      }
    });
  }
}

export const wsService = new WebSocketService();
