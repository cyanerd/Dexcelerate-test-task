import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MiniChart, ChartDataPoint } from './MiniChart'

describe('MiniChart', () => {
  const mockData: ChartDataPoint[] = [
    { timestamp: 1000, price: 1.0 },
    { timestamp: 2000, price: 1.5 },
    { timestamp: 3000, price: 1.2 },
  ]

  it('should render chart with price data', () => {
    const { container } = render(<MiniChart data={mockData} />)
    const svg = container.querySelector('svg')
    const path = container.querySelector('path')
    
    expect(svg).toBeInTheDocument()
    expect(path).toBeInTheDocument()
    expect(path?.getAttribute('d')).not.toBe('')
  })

  it('should handle empty data', () => {
    const { container } = render(<MiniChart data={[]} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render dots when enabled', () => {
    const { container } = render(<MiniChart data={mockData} showDots={true} />)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(mockData.length)
  })
})
