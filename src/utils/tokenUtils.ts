import { ScannerResult, TokenData, SupportedChainName, ChartDataPoint } from '../types/test-task-types';
import { safeParseFloat } from './formatters';

/**
 * Helper to convert chain ID to chain name
 */
export function chainIdToName(chainId: number): SupportedChainName {
  switch (chainId.toString()) {
    case "1": return "ETH";
    case "56": return "BSC";
    case "8453": return "BASE";
    case "900": return "SOL";
    default: return "ETH";
  }
}

/**
 * Calculate market cap from scanner result with priority order
 */
export function calculateMarketCap(result: ScannerResult): number {
  // Priority order as specified in requirements
  const currentMcap = safeParseFloat(result.currentMcap);
  if (currentMcap > 0) return currentMcap;
  
  const initialMcap = safeParseFloat(result.initialMcap);
  if (initialMcap > 0) return initialMcap;
  
  const pairMcapUsd = safeParseFloat(result.pairMcapUsd);
  if (pairMcapUsd > 0) return pairMcapUsd;
  
  const pairMcapUsdInitial = safeParseFloat(result.pairMcapUsdInitial);
  if (pairMcapUsdInitial > 0) return pairMcapUsdInitial;
  
  // Fallback calculation
  const totalSupply = safeParseFloat(result.token1TotalSupplyFormatted);
  const price = safeParseFloat(result.price);
  return totalSupply * price;
}

/**
 * Generate mock price history data for demonstration
 */
export function generateMockPriceHistory(currentPrice: number, tokenAge: Date): ChartDataPoint[] {
  const now = Date.now();
  const ageInMs = now - tokenAge.getTime();
  const dataPoints = Math.min(50, Math.max(10, Math.floor(ageInMs / (1000 * 60 * 15)))); // Every 15 minutes, max 50 points
  
  const history: ChartDataPoint[] = [];
  const volatility = 0.05 + Math.random() * 0.15; // 5-20% volatility
  const trend = (Math.random() - 0.5) * 2; // -1 to 1 trend
  
  for (let i = 0; i < dataPoints; i++) {
    const timeOffset = (i / (dataPoints - 1)) * ageInMs;
    const timestamp = tokenAge.getTime() + timeOffset;
    
    // Generate price with trend and random walk
    const progress = i / (dataPoints - 1);
    const trendComponent = trend * progress * 0.3;
    const randomComponent = (Math.random() - 0.5) * volatility;
    const priceMultiplier = 1 + trendComponent + randomComponent;
    
    // Add some realistic price action patterns
    const cycleComponent = Math.sin(progress * Math.PI * 2 * (1 + Math.random())) * 0.05;
    const finalMultiplier = Math.max(0.1, priceMultiplier + cycleComponent);
    
    const price = currentPrice * finalMultiplier;
    
    history.push({
      timestamp,
      price: Math.max(0.000001, price), // Ensure price is positive
    });
  }
  
  // Ensure the last point matches current price
  if (history.length > 0) {
    history[history.length - 1].price = currentPrice;
  }
  
  return history;
}

/**
 * Convert API response to internal token format
 */
export function scannerResultToToken(result: ScannerResult): TokenData {
  const marketCap = calculateMarketCap(result);
  const currentPrice = safeParseFloat(result.price);
  const tokenAge = new Date(result.age);
  
  return {
    id: result.pairAddress,
    tokenName: result.token1Name || 'Unknown Token',
    tokenSymbol: result.token1Symbol || 'UNK',
    tokenAddress: result.token1Address,
    pairAddress: result.pairAddress,
    chain: chainIdToName(result.chainId),
    exchange: result.virtualRouterType || 'Router',
    priceUsd: currentPrice,
    volumeUsd: safeParseFloat(result.volume),
    mcap: marketCap,
    totalSupply: safeParseFloat(result.token1TotalSupplyFormatted),
    priceChangePcs: {
      "5M": safeParseFloat(result.diff5M),
      "1H": safeParseFloat(result.diff1H),
      "6H": safeParseFloat(result.diff6H),
      "24H": safeParseFloat(result.diff24H),
    },
    transactions: {
      buys: result.buys || 0,
      sells: result.sells || 0,
    },
    audit: {
      mintable: !result.isMintAuthDisabled,
      freezable: !result.isFreezeAuthDisabled,
      honeypot: result.honeyPot || false,
      contractVerified: result.contractVerified,
    },
    tokenCreatedTimestamp: tokenAge,
    liquidity: {
      current: safeParseFloat(result.liquidity),
      changePc: safeParseFloat(result.percentChangeInLiquidity),
    },
    migrationPc: result.migrationProgress ? safeParseFloat(result.migrationProgress) : undefined,
    socialLinks: {
      discord: result.discordLink || undefined,
      telegram: result.telegramLink || undefined,
      twitter: result.twitterLink || undefined,
      website: result.webLink || undefined,
    },
    dexPaid: result.dexPaid,
    lastUpdated: new Date(),
    // Generate mock price history for demonstration
    priceHistory: generateMockPriceHistory(currentPrice, tokenAge),
  };
}
