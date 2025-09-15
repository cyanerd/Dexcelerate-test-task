import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TokenData, 
  SupportedChainName, 
  FilterState, 
  SerdeRankBy, 
  OrderBy 
} from '../types/test-task-types';
import { scannerResultToToken } from '../utils/tokenUtils';
import { buildApiParamsWithCombinedFilters, filterTokensByCombinedFilter } from '../utils/combinedFilters';
import {
  GetScannerResultParams,
  IncomingWebSocketMessage,
  TRENDING_TOKENS_FILTERS,
  NEW_TOKENS_FILTERS
} from '../types/test-task-types';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';

interface UseTokenDataProps {
  tableType: 'trending' | 'new';
  filters?: FilterState;
  sortColumn?: SerdeRankBy;
  sortOrder?: OrderBy;
}

interface UseTokenDataReturn {
  tokens: TokenData[];
  loading: boolean;
  error: string | null;
  totalRows: number;
  connected: boolean;
  loadMore: () => void;
  hasMore: boolean;
  refreshData: () => void;
}

export function useTokenData({ 
  tableType, 
  filters, 
  sortColumn, 
  sortOrder 
}: UseTokenDataProps): UseTokenDataReturn {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [connected, setConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const subscriptionsRef = useRef<Set<string>>(new Set());
  const tokensMapRef = useRef<Map<string, TokenData>>(new Map());

  // Build API parameters using combined filters utility
  const buildApiParams = useCallback((page: number = 1): GetScannerResultParams => {
    if (!filters) {
      // Fallback to basic params if no filters provided
      const baseParams = tableType === 'trending' ? TRENDING_TOKENS_FILTERS : NEW_TOKENS_FILTERS;
      return { ...baseParams, page };
    }

    // Use the combined filters utility to build parameters
    let apiParams = buildApiParamsWithCombinedFilters(filters, tableType, page);

    // Apply sorting if specified (overrides combined filter sorting)
    if (sortColumn) {
      apiParams.rankBy = sortColumn;
    }
    if (sortOrder) {
      apiParams.orderBy = sortOrder;
    }

    return apiParams;
  }, [tableType, filters, sortColumn, sortOrder]);

  // Load initial data
  const loadData = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!append) {
      setLoading(true);
      setError(null);
    }

    try {
      const params = buildApiParams(page);
      const response = await apiService.fetchScannerData(params);

      let newTokens = response.pairs.map(scannerResultToToken);
      
      // Apply additional combined filter checks
      if (filters?.combinedFilter) {
        newTokens = filterTokensByCombinedFilter(newTokens, filters.combinedFilter);
      }

      if (append) {
        setTokens(() => {
          const newMap = new Map(tokensMapRef.current);
          newTokens.forEach(token => newMap.set(token.id, token));
          tokensMapRef.current = newMap;
          const updatedTokens = Array.from(newMap.values());

          // Update hasMore with correct token count
          setTotalRows(response.totalRows);
          setHasMore(response.pairs.length > 0 && updatedTokens.length < response.totalRows);

          return updatedTokens;
        });
      } else {
          const newMap = new Map<string, TokenData>();
          newTokens.forEach(token => newMap.set(token.id, token));
        tokensMapRef.current = newMap;
        setTokens(newTokens);

        setTotalRows(response.totalRows);
        setHasMore(response.pairs.length > 0 && newTokens.length < response.totalRows);
      }

      setCurrentPage(page);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  // Subscribe to WebSocket updates for tokens
  const subscribeToTokens = useCallback((tokensToSubscribe: TokenData[]) => {
    if (!wsService.isConnected()) return;

    // Unsubscribe from previous tokens
    subscriptionsRef.current.forEach((subscription: string) => {
      const [pairAddress, tokenAddress, chain] = subscription.split('|');
      wsService.unsubscribeFromPair(pairAddress, tokenAddress, chain as SupportedChainName);
      wsService.unsubscribeFromPairStats(pairAddress, tokenAddress, chain as SupportedChainName);
    });
    subscriptionsRef.current.clear();

    // Subscribe to new tokens
    tokensToSubscribe.forEach(token => {
      const subscriptionKey = `${token.pairAddress}|${token.tokenAddress}|${token.chain}`;

      wsService.subscribeToPair(token.pairAddress, token.tokenAddress, token.chain);
      wsService.subscribeToPairStats(token.pairAddress, token.tokenAddress, token.chain);

      subscriptionsRef.current.add(subscriptionKey);
    });

    // Subscribe to scanner filter
    const params = buildApiParams();
    wsService.subscribeToScannerFilter(params);
  }, [buildApiParams]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: IncomingWebSocketMessage) => {
    switch (message.event) {
      case 'tick': {
        // Handle real-time price updates
        const { pair, swaps } = message.data;
        const latestSwap = swaps.filter(swap => !swap.isOutlier).pop();

        if (latestSwap) {
          const newPrice = parseFloat(latestSwap.priceToken1Usd);
          const pairAddress = pair.pair;

          // Optimized update - only update specific token without recreating entire array
          setTokens((prev: TokenData[]) => {
            let foundToken = false;
            const updatedTokens = prev.map((token: TokenData) => {
              if (token.pairAddress === pairAddress) {
                foundToken = true;
                const newMarketCap = token.totalSupply * newPrice;
                const updatedToken = {
                  ...token,
                  priceUsd: newPrice,
                  mcap: newMarketCap,
                  lastUpdated: new Date(),
                };

                // Update map immediately for this token only
                tokensMapRef.current.set(token.id, updatedToken);
                return updatedToken;
              }
              return token;
            });

            return foundToken ? updatedTokens : prev;
          });
        }
        break;
      }

      case 'pair-stats': {
        // Handle audit and migration updates
        const { pair: pairData, migrationProgress } = message.data;

        // Optimized pair-stats update - avoid recreating entire array and map
        setTokens((prev: TokenData[]) => {
          let foundToken = false;
          const updatedTokens = prev.map((token: TokenData) => {
            if (token.pairAddress === pairData.pairAddress) {
              foundToken = true;
              const updatedToken = {
                ...token,
                migrationPc: parseFloat(migrationProgress),
                audit: {
                  mintable: pairData.mintAuthorityRenounced,
                  freezable: pairData.freezeAuthorityRenounced,
                  honeypot: !pairData.token1IsHoneypot,
                  contractVerified: pairData.isVerified,
                },
                socialLinks: {
                  discord: pairData.linkDiscord || undefined,
                  telegram: pairData.linkTelegram || undefined,
                  twitter: pairData.linkTwitter || undefined,
                  website: pairData.linkWebsite || undefined,
                },
                dexPaid: pairData.dexPaid,
                lastUpdated: new Date(),
              };

              // Update map immediately for this token only
              tokensMapRef.current.set(token.id, updatedToken);
              return updatedToken;
            }
            return token;
          });

          return foundToken ? updatedTokens : prev;
        });
        break;
      }

      case 'scanner-pairs': {
        // Handle full dataset updates
        const { results } = message.data;
        const updatedTokens = results.pairs.map(scannerResultToToken);

        // Optimized merge - preserve real-time updates without full recreation
        setTokens(prev => {
          let hasChanges = false;
          const resultTokens = [...prev];

          // Update existing tokens
          resultTokens.forEach((token, index) => {
            const newTokenData = updatedTokens.find(newToken => newToken.id === token.id);
            if (newTokenData && (!token.lastUpdated || newTokenData.lastUpdated > token.lastUpdated)) {
              resultTokens[index] = newTokenData;
              tokensMapRef.current.set(token.id, newTokenData);
              hasChanges = true;
            }
          });

          // Add completely new tokens
          updatedTokens.forEach(newToken => {
            if (!tokensMapRef.current.has(newToken.id)) {
              resultTokens.push(newToken);
              tokensMapRef.current.set(newToken.id, newToken);
              hasChanges = true;
            }
          });

          return hasChanges ? resultTokens : prev;
        });
        break;
      }
    }
  }, []);

  // Subscribe to WebSocket updates when tokens change
  useEffect(() => {
    if (tokens.length > 0) {
      subscribeToTokens(tokens);
    }
  }, [tokens, subscribeToTokens]);

  // Initialize WebSocket connection
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initWebSocket = async () => {
      try {
        await wsService.connect();
        setConnected(true);
        unsubscribe = wsService.subscribe(handleWebSocketMessage);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
      }
    };

    initWebSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleWebSocketMessage]);

  // Load initial data and refresh when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
    loadData(1, false);
  }, [loadData]);

  // Load more data (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadData(currentPage + 1, true);
    }
  }, [loading, hasMore, currentPage, loadData]);

  // Refresh data
  const refreshData = useCallback(() => {
    setCurrentPage(1);
    loadData(1, false);
  }, [loadData]);

  return {
    tokens,
    loading,
    error,
    totalRows,
    connected,
    loadMore,
    hasMore,
    refreshData,
  };
}
