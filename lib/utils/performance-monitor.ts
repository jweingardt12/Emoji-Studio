"use client"

import React from 'react'

/**
 * Performance monitoring utilities for tracking Core Web Vitals and component performance
 */

// Performance metrics interface
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null // Largest Contentful Paint
  cls: number | null // Cumulative Layout Shift
  fid: number | null // First Input Delay
  fcp: number | null // First Contentful Paint
  ttfb: number | null // Time to First Byte

  // Custom metrics
  componentRenderTime: number[]
  memoryUsage: number | null
  bundleSize: number | null

  // Timestamps
  measurementTime: number
}

// Performance observer for Core Web Vitals
class PerformanceTracker {
  private metrics: Partial<PerformanceMetrics> = {}
  private observers: PerformanceObserver[] = []
  private renderTimes: number[] = []

  constructor() {
    this.initializeObservers()
    this.measureMemoryUsage()
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.metrics.lcp = lastEntry.startTime
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      this.observers.push(lcpObserver)
    } catch (e) {
      // LCP observer not supported
    }

    // CLS Observer
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        this.metrics.cls = clsValue
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
      this.observers.push(clsObserver)
    } catch (e) {
      // CLS observer not supported
    }

    // FID Observer
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          this.metrics.fid = entry.processingStart - entry.startTime
        }
      })
      fidObserver.observe({ type: 'first-input', buffered: true })
      this.observers.push(fidObserver)
    } catch (e) {
      // FID observer not supported
    }

    // Navigation timing for TTFB and FCP
    try {
      const navigationObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any) {
          if (entry.entryType === 'navigation') {
            this.metrics.ttfb = entry.responseStart - entry.fetchStart
          } else if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime
          }
        }
      })
      navigationObserver.observe({ type: 'navigation', buffered: true })
      navigationObserver.observe({ type: 'paint', buffered: true })
      this.observers.push(navigationObserver)
    } catch (e) {
      // Navigation observer not supported
    }
  }

  private measureMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = memory.usedJSHeapSize
    }
  }

  // Track component render time
  trackComponentRender(startTime: number, endTime: number) {
    const renderTime = endTime - startTime
    this.renderTimes.push(renderTime)

    // Keep only last 100 render times to avoid memory leaks
    if (this.renderTimes.length > 100) {
      this.renderTimes = this.renderTimes.slice(-100)
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.measureMemoryUsage()

    return {
      lcp: this.metrics.lcp ?? null,
      cls: this.metrics.cls ?? null,
      fid: this.metrics.fid ?? null,
      fcp: this.metrics.fcp ?? null,
      ttfb: this.metrics.ttfb ?? null,
      componentRenderTime: [...this.renderTimes],
      memoryUsage: this.metrics.memoryUsage ?? null,
      bundleSize: this.metrics.bundleSize ?? null,
      measurementTime: Date.now()
    }
  }

  // Get performance score (0-100)
  getPerformanceScore(): number {
    const metrics = this.getMetrics()
    let score = 100

    // LCP scoring (0-4s good, 4s+ poor)
    if (metrics.lcp !== null) {
      if (metrics.lcp > 4000) score -= 30
      else if (metrics.lcp > 2500) score -= 15
    }

    // CLS scoring (0-0.1 good, 0.25+ poor)
    if (metrics.cls !== null) {
      if (metrics.cls > 0.25) score -= 25
      else if (metrics.cls > 0.1) score -= 10
    }

    // FID scoring (0-100ms good, 300ms+ poor)
    if (metrics.fid !== null) {
      if (metrics.fid > 300) score -= 25
      else if (metrics.fid > 100) score -= 10
    }

    // Memory usage penalty
    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      score -= 10
    }

    return Math.max(0, score)
  }

  // Cleanup observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Global performance tracker instance
let globalTracker: PerformanceTracker | null = null

export function getPerformanceTracker(): PerformanceTracker {
  if (!globalTracker) {
    globalTracker = new PerformanceTracker()
  }
  return globalTracker
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null)
  const [score, setScore] = React.useState<number | null>(null)

  React.useEffect(() => {
    const tracker = getPerformanceTracker()

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      const currentMetrics = tracker.getMetrics()
      const currentScore = tracker.getPerformanceScore()

      setMetrics(currentMetrics)
      setScore(currentScore)
    }, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return { metrics, score }
}

// Component render time tracker hook
export function useRenderTimeTracker(componentName: string) {
  const renderStartTime = React.useRef<number>(0)

  React.useEffect(() => {
    renderStartTime.current = performance.now()
  })

  React.useEffect(() => {
    const renderEndTime = performance.now()
    const tracker = getPerformanceTracker()
    tracker.trackComponentRender(renderStartTime.current, renderEndTime)

    if (process.env.NODE_ENV === 'development') {
      // render time tracked internally
    }
  })

  return {
    startTracking: () => {
      renderStartTime.current = performance.now()
    },
    endTracking: () => {
      const renderEndTime = performance.now()
      const tracker = getPerformanceTracker()
      tracker.trackComponentRender(renderStartTime.current, renderEndTime)
      return renderEndTime - renderStartTime.current
    }
  }
}

// Bundle analysis utilities
export function analyzeBundlePerformance() {
  if (typeof window === 'undefined') return null

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  // Calculate total bundle size
  const jsResources = resources.filter(resource =>
    resource.name.includes('.js') &&
    !resource.name.includes('node_modules') &&
    !resource.name.includes('cdn')
  )

  const totalJSSize = jsResources.reduce((total, resource) => {
    return total + (resource.transferSize || 0)
  }, 0)

  const totalLoadTime = jsResources.reduce((max, resource) => {
    return Math.max(max, resource.responseEnd - resource.fetchStart)
  }, 0)

  return {
    totalJSSize: totalJSSize / 1024, // KB
    totalLoadTime,
    resourceCount: jsResources.length,
    recommendations: generateBundleRecommendations(totalJSSize, totalLoadTime, jsResources.length)
  }
}

function generateBundleRecommendations(size: number, loadTime: number, resourceCount: number): string[] {
  const recommendations: string[] = []

  if (size > 1024 * 1024) { // 1MB
    recommendations.push("Bundle size is large (>1MB). Consider code splitting.")
  }

  if (loadTime > 3000) { // 3 seconds
    recommendations.push("Slow bundle loading. Consider implementing dynamic imports.")
  }

  if (resourceCount > 50) {
    recommendations.push("Many JS resources. Consider bundling optimization.")
  }

  return recommendations
}