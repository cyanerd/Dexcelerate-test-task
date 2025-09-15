import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CombinedFilterType } from '../../types/test-task-types';
import { getAllCombinedFilterOptions } from '../../utils/combinedFilters';
import styles from './CombinedFilterSelector.module.css';

interface CombinedFilterSelectorProps {
  selectedFilter: CombinedFilterType;
  onFilterChange: (filter: CombinedFilterType) => void;
  className?: string;
}

export function CombinedFilterSelector({ 
  selectedFilter, 
  onFilterChange, 
  className = ''
}: CombinedFilterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterOptions = getAllCombinedFilterOptions();

  const selectedOption = filterOptions.find(option => option.type === selectedFilter) || filterOptions[0];

  const handleFilterSelect = (filterType: CombinedFilterType) => {
    onFilterChange(filterType);
    setIsOpen(false);
  };

  // Update dropdown position when opened
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside (custom logic for portal)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both trigger and menu
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      
      if (isOutsideTrigger && isOutsideMenu) {
        setIsOpen(false);
      }
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`${styles['combined-filter-selector']} ${className}`} ref={dropdownRef}>
      <div className={styles['filter-label']}>
        Trading Strategy
      </div>
      
      <div className={styles['dropdown-container']}>
        <button
          ref={triggerRef}
          className={`${styles['dropdown-trigger']} ${isOpen ? styles['dropdown-open'] : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={styles['selected-option']}>
            <span className={styles['selected-emoji']}>{selectedOption.emoji}</span>
            <span className={styles['selected-name']}>{selectedOption.name}</span>
          </span>
            <svg 
              className={styles['dropdown-arrow']} 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none"
            >
              <path 
                d="M4 6L8 10L12 6" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
        </button>
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className={styles['dropdown-menu']} 
          role="listbox"
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999
          }}
        >
          {filterOptions.map((option) => (
            <div
              key={option.type || 'all'}
              className={`${styles['dropdown-option']} ${
                selectedFilter === option.type ? styles['dropdown-option-selected'] : ''
              }`}
              onClick={() => handleFilterSelect(option.type)}
              role="option"
              aria-selected={selectedFilter === option.type}
              title={option.description}
            >
              <span className={styles['option-emoji']}>{option.emoji}</span>
              <div className={styles['option-info']}>
                <div className={styles['option-name']}>{option.name}</div>
                <div className={styles['option-description']}>{option.description}</div>
              </div>
            </div>
          ))}
        </div>,
        document.getElementById('root') || document.body
      )}
    </div>
  );
}
