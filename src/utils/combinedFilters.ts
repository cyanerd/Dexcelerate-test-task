import { 
  TokenData, 
  CombinedFilterType, 
  CombinedFilterConfig, 
  COMBINED_FILTER_PRESETS,
  GetScannerResultParams,
  FilterState 
} from '../types/test-task-types';

/**
 * Get combined filter configuration by type
 */
export function getCombinedFilterConfig(type: CombinedFilterType): CombinedFilterConfig | null {
  if (!type) return null;
  return COMBINED_FILTER_PRESETS[type] || null;
}

/**
 * Apply combined filter criteria to API params
 */
export function applyCombinedFilterToParams(
  baseParams: GetScannerResultParams,
  combinedFilterType: CombinedFilterType
): GetScannerResultParams {
  if (!combinedFilterType) {
    return baseParams;
  }

  const config = getCombinedFilterConfig(combinedFilterType);
  if (!config) {
    return baseParams;
  }

  // Merge base params with combined filter criteria
  return {
    ...baseParams,
    ...config.criteria,
    // Preserve some base params that shouldn't be overridden
    page: baseParams.page,
    chain: baseParams.chain,
  };
}

/**
 * Check if token passes additional combined filter checks
 */
export function passesAdditionalChecks(
  token: TokenData,
  combinedFilterType: CombinedFilterType
): boolean {
  if (!combinedFilterType) {
    return true;
  }

  const config = getCombinedFilterConfig(combinedFilterType);
  if (!config?.additionalChecks) {
    return true;
  }

  const checks = config.additionalChecks;

  // Price change checks
  if (checks.minPriceChange5M !== undefined) {
    const priceChange5M = token.priceChangePcs?.['5M'] || 0;
    if (priceChange5M < checks.minPriceChange5M) {
      return false;
    }
  }

  if (checks.maxPriceChange5M !== undefined) {
    const priceChange5M = Math.abs(token.priceChangePcs?.['5M'] || 0);
    if (priceChange5M > checks.maxPriceChange5M) {
      return false;
    }
  }

  // Volume growth check (simplified - would need historical data)
  if (checks.minVolumeGrowth !== undefined) {
    // For now, use transaction count as proxy for volume growth
    const buys = token.transactions?.buys || 0;
    const sells = token.transactions?.sells || 0;
    const totalTxns = buys + sells;
    
    if (totalTxns < (checks.minTransactionCount || 10)) {
      return false;
    }
  }

  // Liquidity ratio check
  if (checks.minLiquidityRatio !== undefined && token.liquidity?.current && token.mcap) {
    const liquidityRatio = token.liquidity.current / token.mcap;
    if (liquidityRatio < checks.minLiquidityRatio) {
      return false;
    }
  }

  // Risk score check (simplified calculation)
  if (checks.maxRiskScore !== undefined) {
    const riskScore = calculateRiskScore(token);
    if (riskScore > checks.maxRiskScore) {
      return false;
    }
  }

  // Transaction count check
  if (checks.minTransactionCount !== undefined) {
    const buys = token.transactions?.buys || 0;
    const sells = token.transactions?.sells || 0;
    const totalTxns = buys + sells;
    
    if (totalTxns < checks.minTransactionCount) {
      return false;
    }
  }

  // Social links requirement
  if (checks.requiresSocialLinks) {
    const hasLinks = token.socialLinks && (
      token.socialLinks.twitter || 
      token.socialLinks.telegram || 
      token.socialLinks.website
    );
    if (!hasLinks) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate risk score for a token (0-100, higher = more risky)
 */
function calculateRiskScore(token: TokenData): number {
  let riskScore = 0;

  // Age factor (newer = more risky)
  if (token.tokenCreatedTimestamp) {
    const ageInHours = (Date.now() - token.tokenCreatedTimestamp.getTime()) / (1000 * 60 * 60);
    if (ageInHours < 1) riskScore += 40;
    else if (ageInHours < 24) riskScore += 30;
    else if (ageInHours < 168) riskScore += 20; // < 1 week
    else if (ageInHours < 720) riskScore += 10; // < 1 month
  }

  // Liquidity factor
  if (token.liquidity?.current && token.mcap) {
    const liquidityRatio = token.liquidity.current / token.mcap;
    if (liquidityRatio < 0.05) riskScore += 25; // Very low liquidity
    else if (liquidityRatio < 0.1) riskScore += 15;
    else if (liquidityRatio < 0.2) riskScore += 5;
  }

  // Audit factors
  if (token.audit) {
    if (token.audit.honeypot) riskScore += 50;
    if (token.audit.mintable) riskScore += 20;
    if (token.audit.freezable) riskScore += 15;
    if (!token.audit.contractVerified) riskScore += 25;
  }

  // Volume factor
  if (token.volumeUsd < 1000) riskScore += 20;
  else if (token.volumeUsd < 10000) riskScore += 10;

  // Social presence
  const hasLinks = token.socialLinks && (
    token.socialLinks.twitter || 
    token.socialLinks.telegram || 
    token.socialLinks.website
  );
  if (!hasLinks) riskScore += 15;

  return Math.min(100, Math.max(0, riskScore));
}

/**
 * Filter tokens array using combined filter
 */
export function filterTokensByCombinedFilter(
  tokens: TokenData[],
  combinedFilterType: CombinedFilterType
): TokenData[] {
  if (!combinedFilterType) {
    return tokens;
  }

  return tokens.filter(token => passesAdditionalChecks(token, combinedFilterType));
}

/**
 * Get filter description for UI
 */
export function getCombinedFilterDescription(type: CombinedFilterType): string {
  const config = getCombinedFilterConfig(type);
  return config?.description || '';
}

/**
 * Get all available combined filter options for UI
 */
export function getAllCombinedFilterOptions(): Array<{
  type: CombinedFilterType;
  name: string;
  description: string;
  emoji: string;
}> {
  return [
    { type: null, name: 'All Tokens', description: 'No combined filter', emoji: '📊' },
    ...Object.values(COMBINED_FILTER_PRESETS)
      .filter((config): config is CombinedFilterConfig => config !== null)
      .map(config => ({
        type: config.type,
        name: config.name,
        description: config.description,
        emoji: config.emoji,
      }))
  ];
}

/**
 * Build API parameters from filter state including combined filters
 */
export function buildApiParamsWithCombinedFilters(
  filters: FilterState,
  tableType: 'trending' | 'new',
  page: number = 1
): GetScannerResultParams {
  // Base parameters based on table type
  let baseParams: GetScannerResultParams;
  
  if (tableType === 'trending') {
    baseParams = {
      rankBy: 'volume',
      orderBy: 'desc',
      minVol24H: filters.minVolume || 1000,
      isNotHP: filters.excludeHoneypots,
      maxAge: filters.maxAge ? filters.maxAge * 60 * 60 : 7 * 24 * 60 * 60,
      page,
    };
  } else {
    baseParams = {
      rankBy: 'age',
      orderBy: 'desc',
      maxAge: filters.maxAge ? filters.maxAge * 60 * 60 : 24 * 60 * 60,
      isNotHP: filters.excludeHoneypots,
      page,
    };
  }

  // Add market cap filter (use minLiq as proxy since minMcap doesn't exist in API)
  if (filters.minMarketCap) {
    baseParams.minLiq = filters.minMarketCap;
  }

  // Add chain filter (use first chain for API compatibility)
  if (filters.chains.length > 0) {
    baseParams.chain = filters.chains[0];
  }

  // Apply combined filter
  return applyCombinedFilterToParams(baseParams, filters.combinedFilter);
}
