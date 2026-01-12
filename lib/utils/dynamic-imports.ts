/**
 * Dynamic imports for heavy processing utilities
 * These modules are loaded only when needed to reduce initial bundle size
 */

// Heavy image/GIF processing imports
export const loadGifProcessor = () => import('./gif-processor')
export const loadVideoProcessor = () => import('./video-processor')
export const loadGifFrameExtractor = () => import('./gif-frame-extractor')
export const loadGifFrameRenderer = () => import('./gif-frame-renderer')
export const loadGifVideoProcessor = () => import('./gif-video-processor')
export const loadAnimatedGifProcessor = () => import('./animated-gif-processor')
export const loadCanvasVideoProcessor = () => import('./canvas-video-processor')
export const loadEmojiProcessor = () => import('./emoji-processor')
export const loadHdrProcessor = () => import('./hdr-processor')

// Heavy UI components imports
export const loadVisualizationTabs = {
  overview: () => import('../../app/visualizations/tabs/overview-tab'),
  activity: () => import('../../app/visualizations/tabs/activity-tab'),
  creators: () => import('../../app/visualizations/tabs/creators-tab'),
  content: () => import('../../app/visualizations/tabs/content-tab'),
}

// Background removal import (ONNX/ML processing)
export const loadBackgroundRemoval = () => import('./background-removal')

// Chart/visualization libraries
export const loadRecharts = () => import('recharts')

// FFmpeg import
export const loadFFmpeg = () => import('@ffmpeg/ffmpeg')

// JIMP image processing
export const loadJIMP = () => import('jimp')

/**
 * Lazy loading utility with error handling and loading states
 */
export async function loadModule<T>(
  importFn: () => Promise<T>,
  onLoading?: () => void,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    onLoading?.()
    const module = await importFn()
    return module
  } catch (error) {
    console.error('Failed to load module:', error)
    onError?.(error as Error)
    return null
  }
}

/**
 * Preload modules based on user interaction or route prediction
 */
export const preloadModules = {
  // Preload when user hovers over visualizations link
  visualizations: () => {
    loadVisualizationTabs.overview()
    loadRecharts()
  },

  // Preload when user is about to process GIFs
  gifProcessing: () => {
    loadGifProcessor()
    loadGifFrameExtractor()
    loadGifFrameRenderer()
  },

  // Preload heavy image processing when needed
  imageProcessing: () => {
    loadJIMP()
    loadEmojiProcessor()
    loadBackgroundRemoval()
  },

  // Preload video processing tools
  videoProcessing: () => {
    loadFFmpeg()
    loadVideoProcessor()
    loadCanvasVideoProcessor()
  },
}

/**
 * Hook for component-specific module loading
 */
export function useModuleLoader() {
  const [loadingModules, setLoadingModules] = React.useState<Set<string>>(new Set())
  const [loadedModules, setLoadedModules] = React.useState<Set<string>>(new Set())
  const [errors, setErrors] = React.useState<Map<string, Error>>(new Map())

  const loadModuleWithTracking = async <T,>(
    moduleId: string,
    importFn: () => Promise<T>
  ): Promise<T | null> => {
    if (loadedModules.has(moduleId)) {
      // Module already loaded, re-import should be fast
      return await importFn()
    }

    setLoadingModules(prev => new Set([...prev, moduleId]))
    setErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(moduleId)
      return newErrors
    })

    try {
      const module = await importFn()
      setLoadedModules(prev => new Set([...prev, moduleId]))
      return module
    } catch (error) {
      setErrors(prev => new Map([...prev, [moduleId, error as Error]]))
      return null
    } finally {
      setLoadingModules(prev => {
        const newSet = new Set(prev)
        newSet.delete(moduleId)
        return newSet
      })
    }
  }

  return {
    loadingModules,
    loadedModules,
    errors,
    loadModuleWithTracking,
    isLoading: (moduleId: string) => loadingModules.has(moduleId),
    hasError: (moduleId: string) => errors.has(moduleId),
    getError: (moduleId: string) => errors.get(moduleId),
  }
}

// Re-export React for the hook
import React from 'react'