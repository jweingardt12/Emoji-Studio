"use client"

import React, { Suspense, lazy } from "react"
import { Loader2 } from "lucide-react"

// Loading component for heavy processing operations
const ProcessingLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-2">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
)

// Dynamically imported heavy components
const LazyGifProcessor = lazy(() => import('@/components/gif-frame-editor-css'))

// Higher-order component for lazy loading with error boundaries
function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  LoadingComponent: React.ComponentType = ProcessingLoader
) {
  return React.forwardRef<any, T>((props, ref) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ))
}

// Export lazy-loaded components
export const GifProcessor = withLazyLoading(LazyGifProcessor,
  () => <ProcessingLoader message="Loading GIF processor..." />
)

// Dynamic import wrapper for processing utilities
export class ProcessingLoader {
  private static loadedModules = new Map<string, any>()

  static async loadGifProcessor() {
    if (this.loadedModules.has('gif-processor')) {
      return this.loadedModules.get('gif-processor')
    }

    const module = await import('@/lib/utils/gif-processor')
    this.loadedModules.set('gif-processor', module)
    return module
  }

  static async loadVideoProcessor() {
    if (this.loadedModules.has('video-processor')) {
      return this.loadedModules.get('video-processor')
    }

    const module = await import('@/lib/utils/video-processor')
    this.loadedModules.set('video-processor', module)
    return module
  }

  static async loadFFmpeg() {
    if (this.loadedModules.has('ffmpeg')) {
      return this.loadedModules.get('ffmpeg')
    }

    const module = await import('@ffmpeg/ffmpeg')
    this.loadedModules.set('ffmpeg', module)
    return module
  }

  static async loadJIMP() {
    if (this.loadedModules.has('jimp')) {
      return this.loadedModules.get('jimp')
    }

    const module = await import('jimp')
    this.loadedModules.set('jimp', module)
    return module
  }

  static async loadBackgroundRemoval() {
    if (this.loadedModules.has('background-removal')) {
      return this.loadedModules.get('background-removal')
    }

    const module = await import('@/lib/utils/background-removal')
    this.loadedModules.set('background-removal', module)
    return module
  }

  // Clear cache if needed (for development)
  static clearCache() {
    this.loadedModules.clear()
  }
}

// Hook for progressive loading of heavy modules
export function useProgressiveLoader() {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const loadModule = React.useCallback(async (
    moduleId: string,
    loadFunction: () => Promise<any>
  ) => {
    setLoadingStates(prev => ({ ...prev, [moduleId]: true }))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[moduleId]
      return newErrors
    })

    try {
      const module = await loadFunction()
      setLoadingStates(prev => ({ ...prev, [moduleId]: false }))
      return module
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error)
      setLoadingStates(prev => ({ ...prev, [moduleId]: false }))
      setErrors(prev => ({
        ...prev,
        [moduleId]: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [])

  const loadGifProcessor = React.useCallback(() =>
    loadModule('gif-processor', ProcessingLoader.loadGifProcessor), [loadModule])

  const loadVideoProcessor = React.useCallback(() =>
    loadModule('video-processor', ProcessingLoader.loadVideoProcessor), [loadModule])

  const loadFFmpeg = React.useCallback(() =>
    loadModule('ffmpeg', ProcessingLoader.loadFFmpeg), [loadModule])

  const loadJIMP = React.useCallback(() =>
    loadModule('jimp', ProcessingLoader.loadJIMP), [loadModule])

  const loadBackgroundRemoval = React.useCallback(() =>
    loadModule('background-removal', ProcessingLoader.loadBackgroundRemoval), [loadModule])

  return {
    loadingStates,
    errors,
    loadGifProcessor,
    loadVideoProcessor,
    loadFFmpeg,
    loadJIMP,
    loadBackgroundRemoval,
    isLoading: (moduleId: string) => loadingStates[moduleId] || false,
    hasError: (moduleId: string) => !!errors[moduleId],
    getError: (moduleId: string) => errors[moduleId],
  }
}