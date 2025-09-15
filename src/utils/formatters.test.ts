import { describe, it, expect, vi } from 'vitest'
import { formatCurrency, formatPercentage, formatTimeAgo, truncateAddress } from './formatters'

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format typical crypto prices', () => {
      expect(formatCurrency(0.00000123)).toBe('$0.0₅123')
      expect(formatCurrency(0.1234)).toBe('$0.1234')
      expect(formatCurrency(1500)).toBe('$1.5K')
      expect(formatCurrency(1000000)).toBe('$1.0M')
      expect(formatCurrency(0)).toBe('$0')
    })
  })

  describe('formatPercentage', () => {
    it('should format price changes', () => {
      expect(formatPercentage(5.67)).toBe('5.7%')
      expect(formatPercentage(-12.3)).toBe('-12.3%')
      expect(formatPercentage(0)).toBe('0%')
    })
  })

  describe('formatTimeAgo', () => {
    it('should format token ages', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
      
      expect(formatTimeAgo(new Date('2024-01-01T11:55:00Z'))).toBe('5m')
      expect(formatTimeAgo(new Date('2024-01-01T10:00:00Z'))).toBe('2h')
      expect(formatTimeAgo(new Date('2023-12-30T12:00:00Z'))).toBe('2d')
      
      vi.useRealTimers()
    })
  })

  describe('truncateAddress', () => {
    it('should truncate addresses for display', () => {
      expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678'))
        .toBe('0x1234...5678')
    })
  })
})
