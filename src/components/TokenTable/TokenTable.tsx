import React, { useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TokenData, ColumnConfig, SerdeRankBy, OrderBy } from '../../types/test-task-types';
import { formatCurrency, formatNumber, formatPercentage, formatTimeAgo } from '../../utils/formatters';
import { MiniChart } from '../MiniChart';
import styles from './TokenTable.module.css';

// Constants
const PRELOAD_THRESHOLD = 25; // Load more data when this many items before the end
const ROW_HEIGHT = 80;
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area for smooth scrolling

interface TokenTableProps {
  tokens: TokenData[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onSort?: (column: SerdeRankBy, order: OrderBy) => void;
  sortColumn?: SerdeRankBy;
  sortOrder?: OrderBy;
}

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m22 2-7 20-4-9-9-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13" />
  </svg>
);

const WebsiteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Helper components
function PriceChangeCell({ value, label }: { value: number; label: string }) {
  const getChangeClass = (value: number) => {
    if (value === 0) return 'price-change__value--neutral';
    return value > 0 ? 'price-change__value--positive' : 'price-change__value--negative';
  };

  return (
    <div className={styles['price-change']}>
      <div className={`${styles['price-change__value']} ${styles[getChangeClass(value)]}`}>
        {value > 0 ? '+' : ''}{formatPercentage(value)}
      </div>
      <div className={styles['price-change__label']}>{label}</div>
    </div>
  );
}

const ChainIcon = ({ chain, className }: { chain: string; className?: string }) => (
  <div className={className}>
    <img
      src={`https://raw.githubusercontent.com/Cryptofonts/cryptoicons/refs/heads/master/SVG/${chain.toLowerCase()}.svg`}
      alt={chain}
      className={styles['chain-icon-image']}
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
      }}
    />
    <span className={styles['chain-icon-fallback']}>{chain.slice(0, 1)}</span>
  </div>
);

const AuditIcon = ({ isActive, tooltip }: { isActive: boolean; tooltip: string }) => (
  <div className={styles['audit__item']} data-tooltip={tooltip}>
    <ShieldIcon
      className={`${styles['audit__icon']} ${styles[isActive ? 'audit__icon--active' : 'audit__icon--inactive']}`}
    />
  </div>
);

// Table columns definition - static to avoid recreating on each render
const TABLE_COLUMNS: ColumnConfig[] = [
  {
    key: 'tokenName',
    title: 'Token',
    sortable: false,
    width: 270,
    render: (_: unknown, token: TokenData, index?: number) => (
      <div className={styles['token-info']}>
        {/* First Row */}
        <div className={styles['token-info__row']}>
          <div className={styles['token-info__avatar']}>
            {token.tokenSymbol.slice(0, 2).toUpperCase()}
          </div>
          <span className={styles['token-info__rank']}>#{(index || 0) + 1}</span>
          <span className={styles['token-info__ticker']}>{token.tokenSymbol}</span>
          <span className={styles['token-info__separator']}>/</span>
          <span className={styles['token-info__name']}>{token.tokenName}</span>
        </div>

        {/* Second Row */}
        <div className={styles['token-info__row']}>
          <ChainIcon
            chain={token.chain}
            className={`${styles['token-info__chain-icon']} ${styles[`chain-icon--${token.chain.toLowerCase()}`]}`}
          />
          {token.socialLinks?.twitter && (
            <a href={token.socialLinks.twitter} className={styles['token-info__link']} target="_blank" rel="noopener noreferrer">
              <div className={styles['token-info__social-icon']}>
                <XIcon className={styles['social-icon']} />
              </div>
            </a>
          )}
          {token.socialLinks?.telegram && (
            <a href={token.socialLinks.telegram} className={styles['token-info__link']} target="_blank" rel="noopener noreferrer">
              <div className={styles['token-info__social-icon']}>
                <TelegramIcon className={styles['social-icon']} />
              </div>
            </a>
          )}
          {token.socialLinks?.website && (
            <a href={token.socialLinks.website} className={styles['token-info__link']} target="_blank" rel="noopener noreferrer">
              <div className={styles['token-info__social-icon']}>
                <WebsiteIcon className={styles['social-icon']} />
              </div>
            </a>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'priceUsd',
    title: 'Price',
    sortable: false,
    width: 120,
    render: (value) => (
      <span className={styles['price-text']}>{formatCurrency(value as number)}</span>
    ),
  },
  {
    key: 'priceChart',
    title: 'Chart',
    sortable: false,
    width: 140,
    render: (_, token) => (
      <div className={styles['chart-cell']}>
        {token.priceHistory && token.priceHistory.length > 1 ? (
          <MiniChart
            data={token.priceHistory}
            width={120}
            height={40}
            className={styles['mini-chart']}
          />
        ) : (
          <div className={styles['no-chart']}>No data</div>
        )}
      </div>
    ),
  },
  {
    key: 'age',
    title: 'Age',
    sortable: true,
    width: 70,
    render: (_, token) => (
      <span className={styles['age-text']}>{formatTimeAgo(token.tokenCreatedTimestamp)}</span>
    ),
  },
  {
    key: 'volume',
    title: 'Volume 24H',
    sortable: true,
    width: 120,
    render: (_, token) => (
      <span className={styles['price-text']}>{formatCurrency(token.volumeUsd)}</span>
    ),
  },
  {
    key: 'priceChangePcs',
    title: 'Price Change',
    sortable: false,
    width: 240,
    render: (_, token) => (
      <div className={styles['price-changes']}>
        <PriceChangeCell value={token.priceChangePcs['5M']} label="5m" />
        <PriceChangeCell value={token.priceChangePcs['1H']} label="1h" />
        <PriceChangeCell value={token.priceChangePcs['6H']} label="6h" />
        <PriceChangeCell value={token.priceChangePcs['24H']} label="24h" />
      </div>
    ),
  },
  {
    key: 'mcap',
    title: 'Market Cap',
    sortable: true,
    width: 120,
    render: (_, token) => (
      <span className={styles['price-text']}>{formatCurrency(token.mcap)}</span>
    ),
  },
  {
    key: 'liquidity',
    title: 'Liquidity',
    sortable: true,
    width: 120,
    render: (_, token) => (
      <div className={styles['liquidity']}>
        <div className={styles['liquidity__value']}>{formatCurrency(token.liquidity.current)}</div>
        <div className={`${styles['liquidity__change']} ${styles[
          token.liquidity.changePc === 0 ? 'liquidity__change--neutral' : 
          token.liquidity.changePc > 0 ? 'liquidity__change--positive' : 'liquidity__change--negative'
        ]}`}>
          {formatPercentage(token.liquidity.changePc)}
        </div>
      </div>
    ),
  },
  {
    key: 'txns',
    title: 'Buys/Sells',
    sortable: true,
    width: 90,
    render: (_, token) => (
      <div className={styles['transactions']}>
        <div className={styles['transactions__row']}>
          <span className={styles['transactions__indicator--buy']}>↗</span>
          <span>{formatNumber(token.transactions.buys)}</span>
        </div>
        <div className={styles['transactions__row']}>
          <span className={styles['transactions__indicator--sell']}>↘</span>
          <span>{formatNumber(token.transactions.sells)}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'audit',
    title: 'Audit',
    sortable: false,
    width: 80,
    render: (_, token) => (
      <div className={styles['audit']}>
        <AuditIcon isActive={token.audit.contractVerified} tooltip="Contract Verified" />
        <AuditIcon isActive={!token.audit.honeypot} tooltip="Not Honeypot" />
        <AuditIcon isActive={!token.audit.mintable} tooltip="Not Mintable" />
      </div>
    ),
  },
];

export function TokenTable({
  tokens,
  loading,
  onLoadMore,
  hasMore,
  onSort,
  sortColumn,
  sortOrder,
}: TokenTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const loadingTriggeredRef = React.useRef(false);

  // Use static columns definition to avoid recreating on each render
  const columns = TABLE_COLUMNS;

  const virtualizer = useVirtualizer({
    count: tokens.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
  });

  const handleSort = useCallback((column: string) => {
    if (!onSort) return;

    const newOrder: OrderBy = sortColumn === column && sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(column as SerdeRankBy, newOrder);
  }, [onSort, sortColumn, sortOrder]);

  const renderRow = useCallback((index: number) => {
    const token = tokens[index];

    return (
      <div
        className={styles['token-table__row']}
        style={{ height: ROW_HEIGHT }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={styles['token-table__cell']}
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.render
              ? column.render(token[column.key as keyof TokenData], token, index)
              : String(token[column.key as keyof TokenData] || '')
            }
          </div>
        ))}
      </div>
    );
  }, [tokens, columns]);

  // Reset loading trigger when tokens change (new data loaded)
  React.useEffect(() => {
    loadingTriggeredRef.current = false;
  }, [tokens.length]);

  React.useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (!virtualItems.length) return;

    const lastItem = virtualItems.at(-1);
    if (!lastItem) return;

    // Load more when we're close to the end
    if (lastItem.index >= tokens.length - PRELOAD_THRESHOLD && hasMore && !loading && !loadingTriggeredRef.current) {
      loadingTriggeredRef.current = true;
      onLoadMore();
    }
  }, [tokens.length, hasMore, loading, onLoadMore, virtualizer]);

  // Empty state when no tokens
  if (tokens.length === 0 && !loading) {
    return (
      <div className={styles['token-table']}>
        {/* Table Header */}
        <div className={styles['token-table__header']}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={`${styles['token-table__header-cell']} ${!column.sortable ? styles['token-table__header-cell--non-sortable'] : ''}`}
              style={{ width: column.width, minWidth: column.width }}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <span>{column.title}</span>
              {column.sortable && (
                <div className={styles['sort-arrows']}>
                  <ChevronUpIcon
                    className={`${styles['sort-arrow']} ${styles[
                      sortColumn === column.key && sortOrder === 'asc' ? 'sort-arrow--active' : 'sort-arrow--inactive'
                    ]}`}
                  />
                  <ChevronDownIcon
                    className={`${styles['sort-arrow']} ${styles[
                      sortColumn === column.key && sortOrder === 'desc' ? 'sort-arrow--active' : 'sort-arrow--inactive'
                    ]}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className={styles['token-table__empty']}>
          <div className={styles['empty-state']}>
            <div className={styles['empty-state__icon']}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <circle cx="11" cy="11" r="3" />
              </svg>
            </div>
            <h3 className={styles['empty-state__title']}>No tokens found</h3>
            <p className={styles['empty-state__description']}>
              Try adjusting your filters or check back later for new tokens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['token-table']}>
      {/* Table Header */}
      <div className={styles['token-table__header']}>
        {columns.map((column) => (
          <div
            key={column.key}
            className={`${styles['token-table__header-cell']} ${!column.sortable ? styles['token-table__header-cell--non-sortable'] : ''}`}
            style={{ width: column.width, minWidth: column.width }}
            onClick={() => column.sortable && handleSort(column.key)}
          >
            <span>{column.title}</span>
            {column.sortable && (
              <div className={styles['sort-arrows']}>
                <ChevronUpIcon
                  className={`${styles['sort-arrow']} ${styles[
                    sortColumn === column.key && sortOrder === 'asc' ? 'sort-arrow--active' : 'sort-arrow--inactive'
                  ]}`}
                />
                <ChevronDownIcon
                  className={`${styles['sort-arrow']} ${styles[
                    sortColumn === column.key && sortOrder === 'desc' ? 'sort-arrow--active' : 'sort-arrow--inactive'
                  ]}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Virtual Table Body */}
      <div ref={parentRef} className={styles['token-table__body']}>
        <div
          className={styles['virtual-container']}
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.index}
              className={styles['virtual-item']}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderRow(virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
