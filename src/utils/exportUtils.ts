import { TokenData } from '../types/test-task-types';
import { formatCurrency, formatNumber, formatPercentage, formatTimeAgo } from './formatters';

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  selectedColumns?: string[];
}

/**
 * Generate filename with timestamp
 */
function generateFilename(format: ExportFormat, prefix: string = 'token_data'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${prefix}_${timestamp}.${format}`;
}

/**
 * Download file with given content
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Prepare token data for export with formatted values
 */
function prepareTokenDataForExport(tokens: TokenData[]): Record<string, string | number | boolean>[] {
  return tokens.map((token, index) => ({
    rank: index + 1,
    tokenName: token.tokenName,
    tokenSymbol: token.tokenSymbol,
    tokenAddress: token.tokenAddress,
    pairAddress: token.pairAddress,
    chain: token.chain,
    exchange: token.exchange,
    priceUsd: token.priceUsd,
    priceUsdFormatted: formatCurrency(token.priceUsd),
    volumeUsd: token.volumeUsd,
    volumeUsdFormatted: formatCurrency(token.volumeUsd),
    marketCap: token.mcap,
    marketCapFormatted: formatCurrency(token.mcap),
    totalSupply: token.totalSupply,
    totalSupplyFormatted: formatNumber(token.totalSupply),
    priceChange5m: token.priceChangePcs['5M'],
    priceChange5mFormatted: formatPercentage(token.priceChangePcs['5M']),
    priceChange1h: token.priceChangePcs['1H'],
    priceChange1hFormatted: formatPercentage(token.priceChangePcs['1H']),
    priceChange6h: token.priceChangePcs['6H'],
    priceChange6hFormatted: formatPercentage(token.priceChangePcs['6H']),
    priceChange24h: token.priceChangePcs['24H'],
    priceChange24hFormatted: formatPercentage(token.priceChangePcs['24H']),
    buys: token.transactions.buys,
    sells: token.transactions.sells,
    totalTransactions: token.transactions.buys + token.transactions.sells,
    liquidity: token.liquidity.current,
    liquidityFormatted: formatCurrency(token.liquidity.current),
    liquidityChange: token.liquidity.changePc,
    liquidityChangeFormatted: formatPercentage(token.liquidity.changePc),
    age: formatTimeAgo(token.tokenCreatedTimestamp),
    ageTimestamp: token.tokenCreatedTimestamp.getTime(),
    // Audit info
    isMintable: token.audit.mintable,
    isFreezable: token.audit.freezable,
    isHoneypot: token.audit.honeypot,
    isContractVerified: token.audit.contractVerified,
    // Social links
    twitterLink: token.socialLinks?.twitter || '',
    telegramLink: token.socialLinks?.telegram || '',
    websiteLink: token.socialLinks?.website || '',
    discordLink: token.socialLinks?.discord || '',
    // Additional data
    migrationProgress: token.migrationPc || 0,
    isDexPaid: token.dexPaid || false,
    lastUpdated: token.lastUpdated.toISOString(),
  }));
}

/**
 * Export tokens to CSV format
 */
export function exportToCSV(tokens: TokenData[], options: Partial<ExportOptions> = {}): void {
  const filename = options.filename || generateFilename('csv', 'tokens');
  const data = prepareTokenDataForExport(tokens);
  
  if (data.length === 0) {
    alert('No data to export');
    return;
  }
  
  // Define column headers
  const headers = [
    'Rank',
    'Token Name',
    'Symbol',
    'Token Address',
    'Pair Address',
    'Chain',
    'Exchange',
    'Price (USD)',
    'Volume 24h (USD)',
    'Market Cap (USD)',
    'Total Supply',
    'Price Change 5m (%)',
    'Price Change 1h (%)',
    'Price Change 6h (%)',
    'Price Change 24h (%)',
    'Buys',
    'Sells',
    'Total Transactions',
    'Liquidity (USD)',
    'Liquidity Change (%)',
    'Age',
    'Age Timestamp',
    'Mintable',
    'Freezable',
    'Honeypot',
    'Contract Verified',
    'Twitter',
    'Telegram',
    'Website',
    'Discord',
    'Migration Progress (%)',
    'Dex Paid',
    'Last Updated',
  ];
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.rank,
      `"${String(row.tokenName).replace(/"/g, '""')}"`,
      row.tokenSymbol,
      row.tokenAddress,
      row.pairAddress,
      row.chain,
      row.exchange,
      row.priceUsd,
      row.volumeUsd,
      row.marketCap,
      row.totalSupply,
      row.priceChange5m,
      row.priceChange1h,
      row.priceChange6h,
      row.priceChange24h,
      row.buys,
      row.sells,
      row.totalTransactions,
      row.liquidity,
      row.liquidityChange,
      `"${row.age}"`,
      row.ageTimestamp,
      row.isMintable,
      row.isFreezable,
      row.isHoneypot,
      row.isContractVerified,
      row.twitterLink,
      row.telegramLink,
      row.websiteLink,
      row.discordLink,
      row.migrationProgress,
      row.isDexPaid,
      row.lastUpdated,
    ].join(','))
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export tokens to JSON format
 */
export function exportToJSON(tokens: TokenData[], options: Partial<ExportOptions> = {}): void {
  const filename = options.filename || generateFilename('json', 'tokens');
  const data = prepareTokenDataForExport(tokens);
  
  if (data.length === 0) {
    alert('No data to export');
    return;
  }
  
  const jsonContent = JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalRecords: data.length,
    data: data
  }, null, 2);
  
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}


/**
 * Main export function that handles different formats
 */
export function exportTokens(
  tokens: TokenData[], 
  format: ExportFormat, 
  options: Partial<ExportOptions> = {}
): void {
  if (tokens.length === 0) {
    alert('No data to export');
    return;
  }
  
  switch (format) {
    case 'csv':
      exportToCSV(tokens, options);
      break;
    case 'json':
      exportToJSON(tokens, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
