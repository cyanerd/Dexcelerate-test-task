// Safe number parsing helper
export function safeParseFloat(value: string | number | null | undefined, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
}

// Helper function for scaling numbers with suffixes
function formatScaledNumber(value: number, prefix: string = '', suffix: string = '', decimals: number = 1): string {
  const absValue = Math.abs(value);
  
  if (absValue < 1000) {
    return `${prefix}${decimals === 0 ? Math.round(value) : value.toFixed(decimals)}${suffix}`;
  }
  
  if (absValue < 1000000) {
    return `${prefix}${(value / 1000).toFixed(1)}K${suffix}`;
  }
  
  if (absValue < 1000000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M${suffix}`;
  }
  
  return `${prefix}${(value / 1000000000).toFixed(1)}B${suffix}`;
}

// Helper function to format numbers with subscript notation for leading zeros
function formatWithSubscript(value: number): string {
  const str = value.toString();
  
  // Find the position of decimal point
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return str;
  
  // Count leading zeros after decimal point
  let zeroCount = 0;
  for (let i = decimalIndex + 1; i < str.length; i++) {
    if (str[i] === '0') {
      zeroCount++;
    } else {
      break;
    }
  }
  
  // If we have 2 or more leading zeros, use subscript notation
  if (zeroCount >= 2) {
    const remainingDigits = str.slice(decimalIndex + 1 + zeroCount);
    const subscriptMap: { [key: string]: string } = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };
    
    const subscriptCount = zeroCount.toString().split('').map(d => subscriptMap[d]).join('');
    
    // Take first 3-4 significant digits
    const significantDigits = remainingDigits.slice(0, 4);
    
    return `0.0${subscriptCount}${significantDigits}`;
  }
  
  return str;
}

export function formatCurrency(value: number, decimals: number = 2): string {
  if (!isFinite(value) || isNaN(value)) return '$0';
  if (value === 0) return '$0';
  
  const absValue = Math.abs(value);
  
  // Special handling for very small values
  if (absValue < 0.000001) {
    return '<$0.000001';
  }
  
  // Use subscript notation for small values with many leading zeros
  if (absValue < 0.01) {
    const formatted = formatWithSubscript(absValue);
    return `$${value < 0 ? '-' : ''}${formatted}`;
  }
  
  // Small values under $1
  if (absValue < 1) {
    return `$${value.toFixed(4)}`;
  }
  
  // Values under $1000 - show with specified decimals
  if (absValue < 1000) {
    const formatted = value.toFixed(decimals);
    // Remove unnecessary .00 if the decimal part is zero
    if (decimals > 0 && formatted.endsWith('.00')) {
      return `$${Math.round(value)}`;
    }
    return `$${formatted}`;
  }
  
  // Use scaled formatting for larger values
  return formatScaledNumber(value, '$');
}

export function formatNumber(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '0';
  if (value === 0) return '0';
  
  // For numbers, we want integers for values under 1000
  const absValue = Math.abs(value);
  if (absValue < 1000) {
    return Math.round(value).toString();
  }
  
  return formatScaledNumber(value, '', '', 1);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  if (!isFinite(value) || isNaN(value)) return '0%';
  
  const formatted = value.toFixed(decimals);
  
  // Remove unnecessary .0 if the decimal part is zero
  if (decimals > 0 && formatted.endsWith('.0')) {
    return `${Math.round(value)}%`;
  }
  
  return `${formatted}%`;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) {
    return 'Now';
  }
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }
  
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }
  
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo`;
}

export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) {
    return address;
  }
  
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// Simplified aliases using the main formatters
export function formatVolume(volume: number): string {
  return formatCurrency(volume);
}

export function formatMarketCap(mcap: number): string {
  return formatCurrency(mcap);
}