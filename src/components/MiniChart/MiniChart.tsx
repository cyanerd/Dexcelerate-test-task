import { useMemo } from 'react';
import styles from './MiniChart.module.css';

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

interface MiniChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  showDots?: boolean;
  animate?: boolean;
}

export function MiniChart({
  data,
  width = 120,
  height = 40,
  color = '#0066FF',
  strokeWidth = 1.5,
  className,
  showDots = false,
  animate = true,
}: MiniChartProps) {
  const { pathData, trend, minPrice, maxPrice, priceChange } = useMemo(() => {
    if (!data || data.length < 2) {
      return {
        pathData: '',
        trend: 'neutral' as const,
        minPrice: 0,
        maxPrice: 0,
        priceChange: 0,
      };
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const prices = sortedData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

    const currentPrice = sortedData[sortedData.length - 1].price;
    const firstPrice = sortedData[0].price;
    const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;

    // Determine trend
    const trend = priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : 'neutral';

    // Create SVG path
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = sortedData.map((point, index) => {
      const x = padding + (index / (sortedData.length - 1)) * chartWidth;
      const y = padding + (1 - (point.price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });

    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${path} ${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, '').trim();

    return {
      pathData,
      trend,
      minPrice,
      maxPrice,
      currentPrice,
      priceChange,
    };
  }, [data, width, height]);

  // Get trend-based color
  const trendColor = useMemo(() => {
    switch (trend) {
      case 'positive':
        return '#10B981'; // Green
      case 'negative':
        return '#EF4444'; // Red
      default:
        return color;
    }
  }, [trend, color]);

  if (!data || data.length < 2) {
    return (
      <div className={`${styles['mini-chart']} ${styles['mini-chart--no-data']} ${className || ''}`}>
        <div className={styles['no-data']}>No data</div>
      </div>
    );
  }

  return (
    <div className={`${styles['mini-chart']} ${styles[`mini-chart--${trend}`]} ${className || ''}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles['chart-svg']}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id={`gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill area under the line */}
        {pathData && (
          <path
            d={`${pathData} L ${width - 2} ${height - 2} L 2 ${height - 2} Z`}
            fill={`url(#gradient-${trend})`}
            className={animate ? styles['chart-fill--animated'] : ''}
          />
        )}

        {/* Main line */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={trendColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animate ? styles['chart-line--animated'] : ''}
          />
        )}

        {/* Dots on data points */}
        {showDots && data.map((_, index) => {
          const x = 2 + (index / (data.length - 1)) * (width - 4);
          const y = 2 + (1 - (data[index].price - minPrice) / (maxPrice - minPrice || 1)) * (height - 4);

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={trendColor}
              className={animate ? styles['chart-dot--animated'] : ''}
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      <div className={styles['chart-tooltip']}>
        <div className={styles['tooltip-change']}>
          {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
