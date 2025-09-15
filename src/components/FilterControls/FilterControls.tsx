import React, { useCallback, useState } from 'react';
import { FilterState, SupportedChainName, CombinedFilterType } from '../../types/test-task-types';
import { formatCurrency } from '../../utils/formatters';
import { CombinedFilterSelector } from '../CombinedFilterSelector';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  disabled?: boolean;
}

// Chain options with icons
const CHAIN_OPTIONS: { value: SupportedChainName; label: string; color: string }[] = [
  { value: 'ETH', label: 'Ethereum', color: '#627EEA' },
  { value: 'SOL', label: 'Solana', color: '#9945FF' },
  { value: 'BASE', label: 'Base', color: '#0052FF' },
  { value: 'BSC', label: 'BSC', color: '#F3BA2F' },
];

// Volume presets
const VOLUME_PRESETS = [
  { label: 'Any', value: null },
  { label: '$1K+', value: 1000 },
  { label: '$10K+', value: 10000 },
  { label: '$100K+', value: 100000 },
  { label: '$1M+', value: 1000000 },
];

// Age presets (in hours)
const AGE_PRESETS = [
  { label: 'Any', value: null },
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

// Market cap presets
const MCAP_PRESETS = [
  { label: 'Any', value: null },
  { label: '$100K+', value: 100000 },
  { label: '$1M+', value: 1000000 },
  { label: '$10M+', value: 10000000 },
  { label: '$100M+', value: 100000000 },
];

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
  </svg>
);

const ResetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

export function FilterControls({ filters, onFiltersChange, disabled = false }: FilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChainToggle = useCallback((chain: SupportedChainName) => {
    const newChains = filters.chains.includes(chain)
      ? filters.chains.filter(c => c !== chain)
      : [...filters.chains, chain];

    onFiltersChange({
      ...filters,
      chains: newChains,
    });
  }, [filters, onFiltersChange]);

  const handleVolumeChange = useCallback((value: number | null) => {
    onFiltersChange({
      ...filters,
      minVolume: value,
    });
  }, [filters, onFiltersChange]);

  const handleAgeChange = useCallback((value: number | null) => {
    onFiltersChange({
      ...filters,
      maxAge: value,
    });
  }, [filters, onFiltersChange]);

  const handleMarketCapChange = useCallback((value: number | null) => {
    onFiltersChange({
      ...filters,
      minMarketCap: value,
    });
  }, [filters, onFiltersChange]);

  const handleHoneypotToggle = useCallback(() => {
    onFiltersChange({
      ...filters,
      excludeHoneypots: !filters.excludeHoneypots,
    });
  }, [filters, onFiltersChange]);

  const handleCombinedFilterChange = useCallback((combinedFilter: CombinedFilterType) => {
    onFiltersChange({
      ...filters,
      combinedFilter,
    });
  }, [filters, onFiltersChange]);

  const handleReset = useCallback(() => {
    onFiltersChange({
      chains: ['ETH', 'SOL', 'BASE', 'BSC'],
      minVolume: null,
      maxAge: null,
      minMarketCap: null,
      excludeHoneypots: true,
      combinedFilter: null,
    });
  }, [onFiltersChange]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const isFilterActive = (
    filters.chains.length < 4 ||
    filters.minVolume !== null ||
    filters.maxAge !== null ||
    filters.minMarketCap !== null ||
    !filters.excludeHoneypots ||
    filters.combinedFilter !== null
  );

  return (
    <div className={styles['filter-controls']}>
      <div className={styles['filter-controls__header']}>
        <button
          onClick={toggleExpanded}
          disabled={disabled}
          className={styles['filter-controls__title-button']}
        >
          <div className={styles['filter-controls__title']}>
            <FilterIcon className={styles['filter-controls__icon']} />
            <span>Filters</span>
            {isFilterActive && (
              <span className={styles['filter-controls__active-indicator']}>●</span>
            )}
          </div>

          <div className={styles['filter-controls__expand-icon']}>
            {isExpanded ? (
              <ChevronUpIcon className={styles['expand-icon']} />
            ) : (
              <ChevronDownIcon className={styles['expand-icon']} />
            )}
          </div>
        </button>

        {isFilterActive && (
          <div className={styles['filter-controls__actions']}>
            <button
              onClick={handleReset}
              disabled={disabled}
              className={styles['filter-controls__reset']}
              title="Reset filters"
            >
              <ResetIcon className={styles['reset-icon']} />
              Reset
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={styles['filter-controls__content']}>
          {/* Combined Filter Selector */}
          <CombinedFilterSelector
            selectedFilter={filters.combinedFilter}
            onFilterChange={handleCombinedFilterChange}
          />
          
          {/* Chain Selection */}
        <div className={styles['filter-group']}>
          <label className={styles['filter-group__label']}>Blockchain</label>
          <div className={styles['chain-selector']}>
            {CHAIN_OPTIONS.map((chain) => (
              <button
                key={chain.value}
                onClick={() => handleChainToggle(chain.value)}
                disabled={disabled}
                className={`${styles['chain-option']} ${
                  filters.chains.includes(chain.value) ? styles['chain-option--active'] : ''
                }`}
                style={{
                  '--chain-color': chain.color,
                } as React.CSSProperties}
              >
                <span className={styles['chain-option__indicator']} />
                <span className={styles['chain-option__label']}>{chain.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Volume Filter */}
        <div className={styles['filter-group']}>
          <label className={styles['filter-group__label']}>Min Volume (24h)</label>
          <div className={styles['preset-selector']}>
            {VOLUME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleVolumeChange(preset.value)}
                disabled={disabled}
                className={`${styles['preset-option']} ${
                  filters.minVolume === preset.value ? styles['preset-option--active'] : ''
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {filters.minVolume !== null && (
            <div className={styles['filter-summary']}>
              Min Volume: {formatCurrency(filters.minVolume)}
            </div>
          )}
        </div>

        {/* Age Filter */}
        <div className={styles['filter-group']}>
          <label className={styles['filter-group__label']}>Max Age</label>
          <div className={styles['preset-selector']}>
            {AGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleAgeChange(preset.value)}
                disabled={disabled}
                className={`${styles['preset-option']} ${
                  filters.maxAge === preset.value ? styles['preset-option--active'] : ''
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {filters.maxAge !== null && (
            <div className={styles['filter-summary']}>
              Max Age: {filters.maxAge < 24 ? `${filters.maxAge}h` : `${Math.floor(filters.maxAge / 24)}d`}
            </div>
          )}
        </div>

        {/* Market Cap Filter */}
        <div className={styles['filter-group']}>
          <label className={styles['filter-group__label']}>Min Market Cap</label>
          <div className={styles['preset-selector']}>
            {MCAP_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleMarketCapChange(preset.value)}
                disabled={disabled}
                className={`${styles['preset-option']} ${
                  filters.minMarketCap === preset.value ? styles['preset-option--active'] : ''
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {filters.minMarketCap !== null && (
            <div className={styles['filter-summary']}>
              Min Market Cap: {formatCurrency(filters.minMarketCap)}
            </div>
          )}
        </div>

        {/* Honeypot Filter */}
        <div className={styles['filter-group']}>
          <label className={styles['filter-group__label']}>Security</label>
          <div className={styles['checkbox-container']}>
            <label className={styles['checkbox']}>
              <input
                type="checkbox"
                checked={filters.excludeHoneypots}
                onChange={handleHoneypotToggle}
                disabled={disabled}
                className={styles['checkbox__input']}
              />
              <span className={styles['checkbox__indicator']} />
              <span className={styles['checkbox__label']}>Exclude honeypot tokens</span>
            </label>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
