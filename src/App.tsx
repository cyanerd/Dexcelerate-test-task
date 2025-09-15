import { useState, useCallback } from 'react';
import { TokenTable } from './components/TokenTable';
import { FilterControls } from './components/FilterControls';
import { ExportButton } from './components/ExportButton';
import { useTokenData } from './hooks/useTokenData';
import { SerdeRankBy, OrderBy, FilterState, DEFAULT_FILTERS } from './types/test-task-types';
import styles from './App.module.css';

// SVG Icon component
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function App() {
  const [trendingSortColumn, setTrendingSortColumn] = useState<SerdeRankBy>('volume');
  const [trendingSortOrder, setTrendingSortOrder] = useState<OrderBy>('desc');
  const [newSortColumn, setNewSortColumn] = useState<SerdeRankBy>('age');
  const [newSortOrder, setNewSortOrder] = useState<OrderBy>('desc');
  
  // Filter states for both tables
  const [trendingFilters, setTrendingFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [newFilters, setNewFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Hook for trending tokens data
  const {
    tokens: trendingTokens,
    loading: trendingLoading,
    error: trendingError,
    totalRows: trendingTotalRows,
    loadMore: loadMoreTrending,
    hasMore: trendingHasMore,
    refreshData: refreshTrending,
  } = useTokenData({
    tableType: 'trending',
    filters: trendingFilters,
    sortColumn: trendingSortColumn,
    sortOrder: trendingSortOrder,
  });

  // Hook for new tokens data
  const {
    tokens: newTokens,
    loading: newLoading,
    error: newError,
    totalRows: newTotalRows,
    loadMore: loadMoreNew,
    hasMore: newHasMore,
    refreshData: refreshNew,
  } = useTokenData({
    tableType: 'new',
    filters: newFilters,
    sortColumn: newSortColumn,
    sortOrder: newSortOrder,
  });

  const handleTrendingSort = useCallback((column: SerdeRankBy, order: OrderBy) => {
    setTrendingSortColumn(column);
    setTrendingSortOrder(order);
  }, []);

  const handleNewSort = useCallback((column: SerdeRankBy, order: OrderBy) => {
    setNewSortColumn(column);
    setNewSortOrder(order);
  }, []);

  if (trendingError || newError) {
    return (
      <div className={styles['error']}>
        <div className={styles['error__container']}>
          <div className={styles['error__header']}>
            <AlertCircleIcon className={styles['error__icon']} />
            <h2 className={styles['error__title']}>Error Loading Data</h2>
          </div>
          <p className={styles['error__message']}>
            {trendingError || newError}
          </p>
          <div className={styles['error__actions']}>
            {trendingError && (
              <button
                onClick={refreshTrending}
                className={styles['error__button']}
              >
                Retry Trending Tokens
              </button>
            )}
            {newError && (
              <button
                onClick={refreshNew}
                className={styles['error__button']}
              >
                Retry New Tokens
              </button>
            )}
          </div>
          <div className={styles['error__note']}>
            <p className={styles['error__note-text']}>
              <strong>Note:</strong> Make sure you have installed a CORS extension for development. 
              You can use "Allow CORS" extension from Chrome Web Store.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['app']}>
      <div className={styles['app__container']}>
        <div className={styles['app__tables-wrapper']}>
          {/* Trending Tokens Table */}
          <div className={styles['app__table-section']}>
            <div className={styles['app__table-header']}>
              <div className={styles['app__table-title-section']}>
                <h1 className={styles['app__table-title']}>
                  Trending Tokens
                  <span className={styles['app__table-subtitle']}>
                    {' '}({trendingTotalRows.toLocaleString()})
                  </span>
                </h1>
              </div>
              <div className={styles['app__table-actions']}>
                <ExportButton
                  tokens={trendingTokens}
                  disabled={trendingLoading}
                />
              </div>
            </div>
            
            <FilterControls
              filters={trendingFilters}
              onFiltersChange={setTrendingFilters}
              disabled={trendingLoading}
            />
            
            <div className={styles['app__table-container']}>
              <TokenTable
                tokens={trendingTokens}
                loading={trendingLoading}
                onLoadMore={loadMoreTrending}
                hasMore={trendingHasMore}
                onSort={handleTrendingSort}
                sortColumn={trendingSortColumn}
                sortOrder={trendingSortOrder}
              />
            </div>
          </div>

          {/* New Tokens Table */}
          <div className={styles['app__table-section']}>
            <div className={styles['app__table-header']}>
              <div className={styles['app__table-title-section']}>
                <h1 className={styles['app__table-title']}>
                  New Tokens
                  <span className={styles['app__table-subtitle']}>
                    {' '}({newTotalRows.toLocaleString()})
                  </span>
                </h1>
              </div>
              <div className={styles['app__table-actions']}>
                <ExportButton
                  tokens={newTokens}
                  disabled={newLoading}
                />
              </div>
            </div>
            
            <FilterControls
              filters={newFilters}
              onFiltersChange={setNewFilters}
              disabled={newLoading}
            />
            
            <div className={styles['app__table-container']}>
              <TokenTable
                tokens={newTokens}
                loading={newLoading}
                onLoadMore={loadMoreNew}
                hasMore={newHasMore}
                onSort={handleNewSort}
                sortColumn={newSortColumn}
                sortOrder={newSortOrder}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;