import { useState, useCallback, useRef, useEffect } from 'react';
import { TokenData } from '../../types/test-task-types';
import { exportTokens, ExportFormat } from '../../utils/exportUtils';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  tokens: TokenData[];
  disabled?: boolean;
  className?: string;
}

// Export format options
const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Excel compatible spreadsheet' },
  { value: 'json', label: 'JSON', description: 'Structured data format' },
];

// Icons
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function ExportButton({ 
  tokens, 
  disabled = false, 
  className 
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (tokens.length === 0) {
      return;
    }

    setIsExporting(true);
    setIsOpen(false);

    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      // Always export without filter information
      exportTokens(tokens, format);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [tokens]);

  const toggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const recordCount = tokens.length;

  return (
    <div className={`${styles['export-button']} ${className || ''}`} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={disabled || isExporting || recordCount === 0}
        className={styles['export-button__trigger']}
        title={recordCount === 0 ? 'No data to export' : `Export ${recordCount} tokens`}
      >
        <DownloadIcon className={styles['export-icon']} />
        <span className={styles['export-text']}>
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
        <span className={styles['export-count']}>({recordCount})</span>
        <ChevronDownIcon className={styles['chevron-icon']} />
      </button>

      {isOpen && (
        <div className={styles['export-dropdown']}>
          <div className={styles['dropdown-header']}>
            <h4 className={styles['dropdown-title']}>Export Data</h4>
            <p className={styles['dropdown-subtitle']}>
              {recordCount === 0 
                ? 'No tokens available for export'
                : `${recordCount} token${recordCount !== 1 ? 's' : ''} ready for export`
              }
            </p>
          </div>

          <div className={styles['format-list']}>
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => handleExport(format.value)}
                disabled={isExporting || recordCount === 0}
                className={styles['format-option']}
              >
                <div className={styles['format-info']}>
                  <span className={styles['format-label']}>{format.label}</span>
                  <span className={styles['format-description']}>{format.description}</span>
                </div>
                <DownloadIcon className={styles['format-icon']} />
              </button>
            ))}
          </div>
        </div>
      )}

      {isExporting && (
        <div className={styles['export-overlay']}>
          <div className={styles['export-spinner']} />
        </div>
      )}
    </div>
  );
}
