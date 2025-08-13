"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Brain, 
  Loader2, 
  Check, 
  X,
  Wand2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react"
import Image from "next/image"
// Removed circular progress for a sleeker linear progress bar
import { FlickeringGrid } from "@/src/components/magicui/flickering-grid"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { EmojiIntelligence, ImageAnalysis, AnalysisDetails } from "@/lib/utils/emoji-intelligence"
import { EmojiRecommendations, EmojiRecommendation } from "@/lib/utils/emoji-recommendations"
import { EmojiAutoEnhance } from "@/lib/utils/emoji-auto-enhance"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { cn } from "@/lib/utils"
import { ShineBorder } from "@/src/components/magicui/shine-border"

interface EmojiAnalysis {
  emoji: ProcessedEmoji
  analysis: ImageAnalysis
  details: AnalysisDetails
  recommendations: EmojiRecommendation[]
}

interface EmojiIntelligenceModalProps {
  isOpen: boolean
  emojis: ProcessedEmoji[]
  onClose: () => void
  onApplyOptimizations: (optimizedEmojis: ProcessedEmoji[]) => void
  // Optional: when provided, the modal will run analysis and immediately report results
  // to the parent, then close itself. This enables using the fancy analysis UX before
  // surfacing recommendations elsewhere (e.g., editor AI tab).
  onAnalysisComplete?: (analyses: { emoji: ProcessedEmoji; analysis: ImageAnalysis; details: AnalysisDetails; recommendations: EmojiRecommendation[] }[]) => void
}

export function EmojiIntelligenceModal({
  isOpen,
  emojis,
  onClose,
  onApplyOptimizations,
  onAnalysisComplete
}: EmojiIntelligenceModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyses, setAnalyses] = useState<EmojiAnalysis[]>([])
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState(false)
  const [applyingProgress, setApplyingProgress] = useState(0)
  const [currentEmojiIndex, setCurrentEmojiIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewEmojis, setPreviewEmojis] = useState<Map<string, ProcessedEmoji>>(new Map())
  const [analysisStage, setAnalysisStage] = useState<'initializing' | 'scanning' | 'processing' | 'finalizing' | 'complete'>('initializing')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [visualProgress, setVisualProgress] = useState(0)
  const [allowClose, setAllowClose] = useState(false)
  const [applyingRecId, setApplyingRecId] = useState<string | null>(null)
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false)

  useEffect(() => {
    if (isOpen && emojis.length > 0) {
      setAllowClose(false) // Reset close flag when opening
      analyzeEmojis()
    }
  }, [isOpen, emojis])

  // No-op: removed ref-based toggle to avoid dialog close side-effects
  
  // Generate preview when show preview is enabled or selections change
  useEffect(() => {
    if (showPreview && currentEmojiIndex < analyses.length) {
      const currentAnalysis = analyses[currentEmojiIndex]
      generateCombinedPreview(currentAnalysis)
    }
  }, [showPreview, currentEmojiIndex, selectedRecommendations])

  const analyzeEmojis = async () => {
    setIsAnalyzing(true)
    setAnalyses([])
    setSelectedRecommendations(new Set())
    setAnalysisStage('initializing')
    setAnalysisProgress(0)
    
    try {
      // Stage 1: Initializing (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1500))
      setAnalysisStage('scanning')
      setAnalysisProgress(20)
      
      // Stage 2: Scanning (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1500))
      setAnalysisStage('processing')
      setAnalysisProgress(40)
      
      const newAnalyses: EmojiAnalysis[] = []
      const totalEmojis = emojis.filter(e => e.format !== 'GIF' && !e.wasVideo).length
      let processedCount = 0
      
      for (const emoji of emojis) {
        // Skip GIFs and videos
        if (emoji.format === 'GIF' || emoji.wasVideo) {
          continue
        }
        
        try {
          const { analysis, details } = await EmojiIntelligence.analyzeImage(emoji.originalFile)
          const recommendations = EmojiRecommendations.generateRecommendations(analysis, details)
          
          if (recommendations.length > 0) {
            newAnalyses.push({
              emoji,
              analysis,
              details,
              recommendations
            })
            
            // Don't auto-select recommendations - let user choose
            // Removed auto-selection to give users control
          }
          
          processedCount++
          // Update progress during processing (40-80%)
          setAnalysisProgress(40 + (processedCount / totalEmojis) * 40)
          
          // Small delay between emojis for visual effect
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Failed to analyze ${emoji.name}:`, error)
        }
      }
      
      // Stage 3: Finalizing (1s)
      setAnalysisStage('finalizing')
      setAnalysisProgress(90)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setAnalysisProgress(100)
      setAnalysisStage('complete')
      
      // Set analyses first, then update analyzing state to prevent flash
      setAnalyses(newAnalyses)
      
      // Small delay to prevent UI flash when transitioning states
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // If consumer wants analysis results only, report and close automatically
      if (onAnalysisComplete) {
        try { onAnalysisComplete(newAnalyses) } catch {}
        setAllowClose(true)
        onClose()
        return
      }
      
      openpanel.track("Emoji Intelligence: Modal Analysis Complete", {
        totalEmojis: emojis.length,
        analyzedCount: newAnalyses.length,
        totalRecommendations: newAnalyses.reduce((sum, a) => sum + a.recommendations.length, 0)
      })
      
      setIsAnalyzing(false)
    } catch (error) {
      console.error("Failed to analyze emojis:", error)
      toast.error("Failed to analyze emojis")
      setIsAnalyzing(false)
      onClose()
    } finally {
      // Removed setIsAnalyzing(false) from here since we handle it above
    }
  }

  // Build a complete list of available EI optimizations for the current emoji
  const buildAllOptimizations = (analysis: EmojiAnalysis): EmojiRecommendation[] => {
    const hasCropBox = !!analysis.details.suggestedCropBox
    const base: EmojiRecommendation[] = [
      { id: 'remove-background', title: 'Remove Background', description: 'Make the subject transparent for any theme', icon: '🎯', priority: 10, confidence: 100, type: 'background', autoFixAvailable: true },
      { id: 'boost-contrast', title: 'Improve Contrast', description: 'Increase contrast for better readability', icon: '⚡', priority: 8, confidence: 100, type: 'contrast', autoFixAvailable: true },
      { id: 'subtle-contrast', title: 'Fine‑Tune Contrast', description: 'Apply a lighter contrast adjustment', icon: '🎯', priority: 7, confidence: 100, type: 'contrast', autoFixAvailable: true },
      { id: 'enhance-colors', title: 'Enhance Colors', description: 'Boost saturation to look vibrant', icon: '🎨', priority: 6, confidence: 100, type: 'color', autoFixAvailable: true },
      { id: 'subtle-color', title: 'Color Fine‑Tuning', description: 'Light saturation boost', icon: '🎨', priority: 5, confidence: 100, type: 'color', autoFixAvailable: true },
      { id: 'sharpen-image', title: 'Sharpen Image', description: 'Make edges and details crisper', icon: '🔍', priority: 6, confidence: 100, type: 'sharpness', autoFixAvailable: true },
      { id: 'subtle-sharpen', title: 'Crisp It Up', description: 'Light sharpening for subtle clarity', icon: '✨', priority: 5, confidence: 100, type: 'sharpness', autoFixAvailable: true },
      { id: 'reduce-noise', title: 'Reduce Noise', description: 'Clean speckles and artifacts', icon: '✨', priority: 5, confidence: 100, type: 'sharpness', autoFixAvailable: true },
      { id: 'brighten-image', title: 'Increase Brightness', description: 'Brighten dark subjects', icon: '☀️', priority: 6, confidence: 100, type: 'brightness', autoFixAvailable: true },
      { id: 'reduce-brightness', title: 'Reduce Brightness', description: 'Tone down washed‑out images', icon: '🌙', priority: 6, confidence: 100, type: 'brightness', autoFixAvailable: true },
      // Cropping – offer smart options always, and subject crop only when we have a suggested box
      ...(hasCropBox ? [{ id: 'crop-to-subject', title: 'Crop to Subject', description: 'Tightly frame the subject', icon: '✂️', priority: 7, confidence: 100, type: 'crop', autoFixAvailable: true } as EmojiRecommendation] : []),
      { id: 'trim-whitespace', title: 'Remove Whitespace', description: 'Trim empty borders to scale up the subject', icon: '📐', priority: 7, confidence: 100, type: 'crop', autoFixAvailable: true },
      { id: 'optimize-aspect', title: 'Fix Aspect Ratio', description: 'Fit perfectly into a square emoji frame', icon: '⬜', priority: 5, confidence: 100, type: 'crop', autoFixAvailable: true },
    ]
    // De‑duplicate with any recommended items by id
    const seen = new Set<string>()
    const merged: EmojiRecommendation[] = []
    for (const rec of [...analysis.recommendations, ...base]) {
      if (seen.has(rec.id)) continue
      seen.add(rec.id)
      merged.push(rec)
    }
    // We return all available tools, but keep recommended ones at top by priority
    return merged.sort((a, b) => b.priority - a.priority)
  }

  const getAllRecsForAnalysis = (analysis?: EmojiAnalysis): EmojiRecommendation[] => {
    if (!analysis) return []
    return buildAllOptimizations(analysis)
  }

  const toggleRecommendation = async (emojiName: string, recId: string) => {
    const key = `${emojiName}-${recId}`
    const analysis = analyses.find(a => a.emoji.name === emojiName)
    
    // Update selections
    const newSet = new Set(selectedRecommendations)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedRecommendations(newSet)
    
    // Auto-toggle preview based on current emoji's selection count
    if (analysis) {
      const selectedCountForEmoji = analysis.recommendations.filter(rec =>
        newSet.has(`${analysis.emoji.name}-${rec.id}`)
      ).length
      setShowPreview(selectedCountForEmoji > 0)
      if (selectedCountForEmoji === 0) {
        // Clear preview cache and stop showing preview
        setPreviewEmojis(prev => {
          const newMap = new Map(prev)
          newMap.delete(`${analysis.emoji.name}-combined`)
          return newMap
        })
      }
    }
    
    // Regenerate combined preview with new selections
    if (analysis) {
      // Create a temporary set with the new selection state
      const tempSelectedRecs = analysis.recommendations.filter(rec =>
        newSet.has(`${analysis.emoji.name}-${rec.id}`)
      )
      
      console.log('[Toggle] Regenerating preview with', tempSelectedRecs.length, 'recommendations')
      
      // Generate new combined preview
      setTimeout(() => {
        generateCombinedPreview(analysis)
      }, 100)
    }
  }

  const toggleAllForEmoji = (emojiName: string, recommendations: EmojiRecommendation[]) => {
    const allSelected = recommendations.every(rec => 
      selectedRecommendations.has(`${emojiName}-${rec.id}`)
    )
    
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev)
      recommendations.forEach(rec => {
        const key = `${emojiName}-${rec.id}`
        if (allSelected) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
      })
      // Auto-toggle preview: on when selecting, off when deselecting
      setShowPreview(!allSelected)
      return newSet
    })
  }

  const generateCombinedPreview = async (analysis: EmojiAnalysis) => {
    try {
      setIsPreviewUpdating(true)
      // Get all currently selected recommendations
      const allRecs = getAllRecsForAnalysis(analysis)
      const selectedRecs = allRecs.filter(rec =>
        selectedRecommendations.has(`${analysis.emoji.name}-${rec.id}`)
      )
      
      console.log('[Preview] Generating combined preview with', selectedRecs.length, 'recommendations')
      
      if (selectedRecs.length === 0) {
        // Clear combined preview for this emoji when nothing is selected
        setPreviewEmojis(prev => {
          const newMap = new Map(prev)
          const combinedKey = `${analysis.emoji.name}-combined`
          newMap.delete(combinedKey)
          return newMap
        })
        return
      }
      
      // Apply ALL selected recommendations cumulatively
      const result = await EmojiAutoEnhance.applyAllRecommendations(
        analysis.emoji.originalFile,
        selectedRecs,
        analysis.details
      )
      
      const previewEmoji: ProcessedEmoji = {
        ...analysis.emoji,
        processedBlob: result.blob,
        processedSize: result.blob.size,
        preview: URL.createObjectURL(result.blob),
        blob: await blobToDataURL(result.blob)
      }
      
      // Store preview with a combined key
      const combinedKey = `${analysis.emoji.name}-combined`
      setPreviewEmojis(prev => new Map(prev).set(combinedKey, previewEmoji))
      
      console.log('[Preview] Combined preview generated and stored')
    } catch (error) {
      console.error("Failed to generate combined preview:", error)
      toast.error("Failed to generate preview")
    } finally {
      setIsPreviewUpdating(false)
    }
  }

  const applySingleRecommendation = async (analysis: EmojiAnalysis, recommendation: EmojiRecommendation) => {
    try {
      setApplyingRecId(recommendation.id)
      setIsPreviewUpdating(true)

      // Build selected list including the clicked one (for preview stacking)
      const allRecs = getAllRecsForAnalysis(analysis)
      const selectedRecs = allRecs.filter(rec =>
        selectedRecommendations.has(`${analysis.emoji.name}-${rec.id}`)
      )
      const recsToApply = selectedRecs.some(r => r.id === recommendation.id)
        ? selectedRecs
        : [...selectedRecs, recommendation]

      const result = await EmojiAutoEnhance.applyAllRecommendations(
        analysis.emoji.originalFile,
        recsToApply,
        analysis.details
      )

      const previewEmoji: ProcessedEmoji = {
        ...analysis.emoji,
        processedBlob: result.blob,
        processedSize: result.blob.size,
        preview: URL.createObjectURL(result.blob),
        blob: await blobToDataURL(result.blob)
      }

      const combinedKey = `${analysis.emoji.name}-combined`
      setPreviewEmojis(prev => new Map(prev).set(combinedKey, previewEmoji))
      setShowPreview(true)

      // Mark this recommendation selected so subsequent toggles are consistent
      setSelectedRecommendations(prev => {
        const newSet = new Set(prev)
        newSet.add(`${analysis.emoji.name}-${recommendation.id}`)
        return newSet
      })

      toast.success(`Applied: ${recommendation.title}`)
      openpanel.track("Emoji Intelligence: Single Recommendation Preview Applied", {
        recommendationType: recommendation.type,
        recommendationId: recommendation.id
      })
    } catch (error) {
      console.error("Failed to apply recommendation:", error)
      toast.error("Failed to apply recommendation")
    } finally {
      setApplyingRecId(null)
      setIsPreviewUpdating(false)
    }
  }

  const applyOptimizations = async () => {
    if (selectedRecommendations.size === 0) {
      toast.warning("Please select at least one optimization to apply")
      return
    }
    
    setIsApplying(true)
    setApplyingProgress(0)
    
    try {
      const optimizedEmojis: ProcessedEmoji[] = []
      let optimizationCount = 0
      const totalSteps = emojis.length
      
      for (let i = 0; i < emojis.length; i++) {
        const emoji = emojis[i]
        const analysis = analyses.find(a => a.emoji.name === emoji.name)
        
        // Update progress
        setApplyingProgress(((i + 1) / totalSteps) * 100)
        
        if (!analysis) {
          optimizedEmojis.push(emoji)
          continue
        }
        
        // Get selected recommendations for this emoji (from both sections)
        const selectedRecs = getAllRecsForAnalysis(analysis).filter(rec =>
          selectedRecommendations.has(`${emoji.name}-${rec.id}`)
        )
        
        if (selectedRecs.length > 0) {
          const result = await EmojiAutoEnhance.applyAllRecommendations(
            emoji.originalFile,
            selectedRecs,
            analysis.details
          )
          
          const optimizedEmoji: ProcessedEmoji = {
            ...emoji,
            processedBlob: result.blob,
            processedSize: result.blob.size,
            preview: URL.createObjectURL(result.blob),
            blob: await blobToDataURL(result.blob),
            processingNote: `EI-optimized: ${result.appliedEnhancements.join(', ')}`
          }
          
          optimizedEmojis.push(optimizedEmoji)
          optimizationCount++
        } else {
          optimizedEmojis.push(emoji)
        }
      }
      
      onApplyOptimizations(optimizedEmojis)
      
      toast.success(`Applied ${optimizationCount} optimization${optimizationCount !== 1 ? 's' : ''}!`)
      
      openpanel.track("Emoji Intelligence: Optimizations Applied", {
        totalEmojis: emojis.length,
        optimizedCount: optimizationCount,
        selectedRecommendations: selectedRecommendations.size
      })
      
      // Allow closing and then close
      setAllowClose(true)
      onClose()
    } catch (error) {
      console.error("Failed to apply optimizations:", error)
      toast.error("Failed to apply optimizations")
    } finally {
      setIsApplying(false)
    }
  }

  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const currentAnalysis = analyses[currentEmojiIndex]
  const hasMultipleEmojis = analyses.length > 1
  const currentSelectedCount = currentAnalysis
    ? currentAnalysis.recommendations.filter(rec =>
        selectedRecommendations.has(`${currentAnalysis.emoji.name}-${rec.id}`)
      ).length
    : 0

  // Add styles for animations
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const existingStyle = document.getElementById('ei-modal-animations')
      if (!existingStyle) {
        const style = document.createElement('style')
        style.id = 'ei-modal-animations'
        style.textContent = `
          @keyframes spin-reverse {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          
          @keyframes pulse-scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          @keyframes sparkle-1 {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            50% { opacity: 1; transform: scale(1) rotate(180deg); }
          }
          
          @keyframes sparkle-2 {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            25%, 75% { opacity: 1; transform: scale(1) rotate(-180deg); }
          }
          
          @keyframes sparkle-3 {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            33%, 66% { opacity: 1; transform: scale(1) rotate(120deg); }
          }
          
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
          }
          
          @keyframes scan-vertical {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-3px) scale(1.05); }
          }
          
          @keyframes bounce-slow-1 {
            0%, 80%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0.5;
            }
            40% { 
              transform: translateY(-4px) scale(1.2);
              opacity: 1;
            }
          }
          
          @keyframes bounce-slow-2 {
            0%, 80%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0.5;
            }
            40% { 
              transform: translateY(-4px) scale(1.2);
              opacity: 1;
            }
          }
          
          @keyframes bounce-slow-3 {
            0%, 80%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0.5;
            }
            40% { 
              transform: translateY(-4px) scale(1.2);
              opacity: 1;
            }
          }
          
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes dot-1 {
            0%, 60%, 100% { opacity: 0.3; }
            20% { opacity: 1; }
          }
          
          @keyframes dot-2 {
            0%, 60%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
          }
          
          @keyframes dot-3 {
            0%, 60%, 100% { opacity: 0.3; }
            60% { opacity: 1; }
          }
          
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          
          @keyframes morph {
            0%, 100% { 
              border-radius: 50%; 
              transform: rotate(0deg) scale(1);
            }
            25% { 
              border-radius: 40%; 
              transform: rotate(90deg) scale(1.1);
            }
            50% { 
              border-radius: 35%; 
              transform: rotate(180deg) scale(1);
            }
            75% { 
              border-radius: 45%; 
              transform: rotate(270deg) scale(1.1);
            }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          
          .animate-spin-reverse {
            animation: spin-reverse 3s linear infinite;
          }
          
          .animate-morph {
            animation: morph 4s ease-in-out infinite;
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
          
          .animate-shimmer {
            animation: shimmer 2s linear infinite;
          }
          
          @keyframes shine {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          
          .animate-shine {
            animation: shine 3s linear infinite;
          }
          
          @keyframes shiny-text {
            0%, 90%, 100% {
              background-position: calc(-100% - var(--shiny-width)) 0;
            }
            30%, 60% {
              background-position: calc(100% + var(--shiny-width)) 0;
            }
          }
          
          .animate-shiny-text {
            animation: shiny-text 8s infinite;
          }
          
          .bg-gradient-conic {
            background: conic-gradient(from 0deg, #9333ea, #3b82f6, #9333ea);
          }
          
          .animate-pulse-scale {
            animation: pulse-scale 2s ease-in-out infinite;
          }
          
          .animate-sparkle-1 {
            animation: sparkle-1 2s ease-in-out infinite;
          }
          
          .animate-sparkle-2 {
            animation: sparkle-2 2s ease-in-out infinite 0.5s;
          }
          
          .animate-sparkle-3 {
            animation: sparkle-3 2s ease-in-out infinite 1s;
          }
          
          .animate-scan {
            animation: scan 2s ease-in-out infinite;
          }
          
          .animate-scan-vertical {
            animation: scan-vertical 3s ease-in-out infinite;
          }
          
          .animate-float-slow {
            animation: float-slow 4s ease-in-out infinite;
          }
          
          .animate-bounce-slow-1 {
            animation: bounce-slow-1 2s ease-in-out infinite;
          }
          
          .animate-bounce-slow-2 {
            animation: bounce-slow-2 2s ease-in-out infinite 0.2s;
          }
          
          .animate-bounce-slow-3 {
            animation: bounce-slow-3 2s ease-in-out infinite 0.4s;
          }
          
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          
          .animate-dot-1 {
            animation: dot-1 1.5s ease-in-out infinite;
          }
          
          .animate-dot-2 {
            animation: dot-2 1.5s ease-in-out infinite;
          }
          
          .animate-dot-3 {
            animation: dot-3 1.5s ease-in-out infinite;
          }
          
          .animate-progress {
            animation: progress 2s ease-out;
          }
          
          .bg-checkerboard {
            background-image: 
              linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
              linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
              linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
            background-size: 16px 16px;
            background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
          }
          
          .dark .bg-checkerboard {
            background-image: 
              linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
              linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
          }
        `
        document.head.appendChild(style)
      }
    }
    
    return () => {
      // Cleanup on unmount if needed
    }
  }, [])

  // Smooth UI progress: increments 1% at a time quickly to the target analysisProgress
  useEffect(() => {
    if (!isAnalyzing) {
      setVisualProgress(analysisProgress)
      return
    }
    const id = setInterval(() => {
      setVisualProgress(prev => {
        if (prev < analysisProgress) {
          return Math.min(analysisProgress, prev + 1)
        }
        return prev
      })
    }, 25) // quick, convincing increments
    return () => clearInterval(id)
  }, [analysisProgress, isAnalyzing])

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('[Dialog] onOpenChange called with:', open, 'allowClose:', allowClose)
        // Only allow closing if we explicitly set allowClose to true
        if (!open) {
          if (allowClose) {
            setAllowClose(false) // Reset the flag
            onClose()
          } else {
            // Prevent close - do nothing, dialog stays open
            console.log('[Dialog] Close prevented - allowClose is false')
          }
        }
      }}
    >
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden rounded-xl border-0 p-0 gap-0"
        onPointerDownOutside={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className="relative rounded-xl border bg-background">
          {/* Shine Border */}
          <ShineBorder borderWidth={2} duration={10} shineColor={["#22d3ee","#34d399","#60a5fa"]} />
        {/* Applying Overlay Animation */}
        {isApplying && (
          <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center">
              {/* Animated rings */}
              <div className="relative w-40 h-40 mb-6">
                {/* Outer morphing shape */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 animate-morph"></div>
                
                {/* Middle rotating gradient ring */}
                <div className="absolute inset-2 rounded-full bg-gradient-conic from-purple-600 via-blue-600 to-purple-600 animate-spin"></div>
                <div className="absolute inset-3 rounded-full bg-background"></div>
                
                {/* Inner pulsing circle */}
                <div className="absolute inset-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse"></div>
                
                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <Wand2 className="h-12 w-12 text-white drop-shadow-lg animate-float" />
                    {/* Magic particles */}
                    <div className="absolute -top-2 -right-2">
                      <Sparkles className="h-4 w-4 text-yellow-400 animate-sparkle-1" />
                    </div>
                    <div className="absolute -bottom-2 -left-2">
                      <Sparkles className="h-3 w-3 text-blue-400 animate-sparkle-2" />
                    </div>
                    <div className="absolute top-0 -left-3">
                      <Sparkles className="h-3 w-3 text-purple-400 animate-sparkle-3" />
                    </div>

                    {/* All EI Optimizations */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
                        <h3 className="text-sm font-medium">All EI Optimizations</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            const allRecs = getAllRecsForAnalysis(currentAnalysis)
                            toggleAllForEmoji(currentAnalysis.emoji.name, allRecs)
                          }}
                        >
                          {getAllRecsForAnalysis(currentAnalysis).every(rec => selectedRecommendations.has(`${currentAnalysis.emoji.name}-${rec.id}`)) ? 'Deselect' : 'Select All'}
                        </Button>
                      </div>
                      <ScrollArea className="h-[320px]">
                        <div className="p-2 space-y-2">
                          {getAllRecsForAnalysis(currentAnalysis).map((rec) => {
                            const isSelected = selectedRecommendations.has(`${currentAnalysis.emoji.name}-${rec.id}`)
                            return (
                              <div
                                key={`all-${rec.id}`}
                                className={cn(
                                  "group relative rounded-md border p-2.5 transition-all cursor-pointer hover:bg-muted/30",
                                  isSelected && "border-purple-500 bg-purple-50/30 dark:bg-purple-950/10"
                                )}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleRecommendation(currentAnalysis.emoji.name, rec.id)
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                    }}
                                    onPointerDown={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        toggleRecommendation(currentAnalysis.emoji.name, rec.id)
                                      }}
                                      className="mt-0.5"
                                    />
                                  </div>
                                  <span className="text-lg mt-[-2px]">{rec.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium">{rec.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                                      </div>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          e.preventDefault()
                                          applySingleRecommendation(currentAnalysis, rec)
                                        }}
                                        className="h-7 px-2 text-xs shrink-0"
                                        disabled={applyingRecId === rec.id || isApplying}
                                      >
                                        {applyingRecId === rec.id ? (
                                          <>
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            Applying
                                          </>
                                        ) : (
                                          <>
                                            <Wand2 className="h-3 w-3 mr-1" />
                                            Apply
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
                
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin-slow">
                  <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 bg-purple-500 rounded-full"></div>
                  <div className="absolute bottom-0 left-1/2 w-2 h-2 -ml-1 bg-blue-500 rounded-full"></div>
                  <div className="absolute left-0 top-1/2 w-2 h-2 -mt-1 bg-indigo-500 rounded-full"></div>
                  <div className="absolute right-0 top-1/2 w-2 h-2 -mt-1 bg-violet-500 rounded-full"></div>
                </div>
              </div>
              
              {/* Text and progress */}
              <div className="space-y-3 text-center">
                <p className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Applying Optimizations
                </p>
                <p className="text-sm text-muted-foreground">
                  Enhancing your emojis with AI magic
                </p>
                
                {/* Progress bar */}
                <div className="w-64 mx-auto">
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${applyingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round(applyingProgress)}% complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Emoji Intelligence</DialogTitle>
                <DialogDescription className="text-xs">
                  {isAnalyzing ? (
                    "Analyzing your emojis with AI..."
                  ) : analyses.length > 0 ? (
                    `${analyses.reduce((sum, a) => sum + a.recommendations.length, 0)} optimization${analyses.reduce((sum, a) => sum + a.recommendations.length, 0) !== 1 ? 's' : ''} found`
                  ) : (
                    "Analysis complete"
                  )}
                </DialogDescription>
              </div>
            </div>
            {!isAnalyzing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="py-3 relative z-10 overflow-hidden">
          {/* Flickering background only for the content area (excludes header) */}
          {isAnalyzing && (
            <FlickeringGrid
              className="absolute inset-0 pointer-events-none"
              squareSize={3}
              gridGap={8}
              flickerChance={0.35}
              maxOpacity={0.18}
              color="rgba(255,255,255,1)"
            />
          )}
          {isAnalyzing ? (
            <div className="relative overflow-hidden py-16 min-h-[70vh] flex flex-col items-center justify-center">
              {/* Background already injected at container level to guarantee full coverage */}
              {/* Ambient gradient veil */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-emerald-500/5" />
              {/* Soft particles */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/4 top-8 w-1 h-1 bg-sky-400/50 rounded-full animate-float" />
                <div className="absolute right-1/5 top-12 w-1 h-1 bg-emerald-400/50 rounded-full animate-float" />
                <div className="absolute left-1/3 bottom-10 w-1 h-1 bg-cyan-400/50 rounded-full animate-float" />
              </div>

              {/* Focal: Capybara logo within subtle AI ring */}
              <div className="relative mx-auto mb-8 h-44 w-44">
                {/* Glow halo */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/25 to-emerald-500/25 blur-3xl" />
                {/* Orbiting ring */}
                <div className="absolute inset-1 rounded-full bg-gradient-conic from-sky-400 via-cyan-400 to-emerald-400 opacity-60 animate-spin-slow" />
                {/* Ring mask to create stroke effect */}
                <div className="absolute inset-1 rounded-full bg-background" style={{ mask: 'radial-gradient(circle 48% at 50% 50%, transparent 40%, black 41%)', WebkitMask: 'radial-gradient(circle 48% at 50% 50%, transparent 40%, black 41%)' }} />
                {/* Capybara logo */}
                <div className="absolute inset-5 rounded-full overflow-hidden shadow-xl">
                  <Image src="/logo.png" alt="Emoji Studio" fill priority className="object-contain animate-pulse-scale" />
                </div>
                {/* Subtle scan line */}
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scan-vertical" />
                </div>
              </div>

              {/* Status */}
              <div className="text-center space-y-2">
                <h3 className="text-base font-medium">
                  {analysisStage === 'initializing' && 'Getting things ready'}
                  {analysisStage === 'scanning' && 'Understanding your emojis'}
                  {analysisStage === 'processing' && 'Planning enhancements'}
                  {analysisStage === 'finalizing' && 'Finalizing results'}
                  {analysisStage === 'complete' && 'Analysis complete'}
                </h3>
                <p className="text-xs text-muted-foreground">Fully local analysis — no uploads.</p>
              </div>

              {/* Progress - smooth linear bar */}
              <div className="mt-8 w-full flex items-center justify-center">
                <div className="shrink-0 w-[560px] max-w-[90%] min-w-[280px]">
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)] bg-[length:200%_100%]" />
                    <div
                      className="relative h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-500 ease-out"
                      style={{ width: `${visualProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-center text-xs text-muted-foreground">{Math.round(visualProgress)}%</div>
                </div>
              </div>
            </div>
          ) : analyses.length > 0 ? (
            <div className="space-y-4">
              {/* Emoji Tabs for multiple emojis */}
              {hasMultipleEmojis && (
                <div className="px-4 pb-3">
                  <Tabs value={currentEmojiIndex.toString()} onValueChange={(v) => setCurrentEmojiIndex(parseInt(v))}>
                    <TabsList className="grid w-full bg-muted/30" style={{ gridTemplateColumns: `repeat(${Math.min(analyses.length, 5)}, 1fr)` }}>
                      {analyses.map((analysis, index) => (
                        <TabsTrigger 
                          key={index} 
                          value={index.toString()} 
                          className="text-xs py-1 data-[state=active]:bg-background"
                        >
                          <img 
                            src={analysis.emoji.preview} 
                            alt={analysis.emoji.name}
                            className="w-4 h-4 mr-1.5"
                          />
                          <span className="truncate">{analysis.emoji.name}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}

              {/* Current Emoji Analysis */}
              {currentAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-3">
                  {/* Left: Preview */}
                  <div className="space-y-4">
                    {/* Preview Card */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                          {showPreview ? 'Preview (with optimizations)' : 'Original'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowPreview(prev => !prev)
                          }}
                        >
                          {showPreview ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Show Original
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Preview Changes
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-muted/10 to-transparent">
                        <div className="aspect-square bg-white dark:bg-zinc-900 rounded-md shadow-sm overflow-hidden flex items-center justify-center relative">
                          {showPreview && currentSelectedCount === 0 && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Select optimizations to preview changes
                              </p>
                            </div>
                          )}
                          {isPreviewUpdating && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          )}
                          <img
                            key={`preview-${currentAnalysis.emoji.name}-${showPreview}-${currentSelectedCount}`}
                            src={(() => {
                              if (showPreview && currentSelectedCount > 0) {
                                // Show combined enhanced preview
                                const combinedKey = `${currentAnalysis.emoji.name}-combined`
                                const preview = previewEmojis.get(combinedKey)
                                
                                if (preview && preview.preview) {
                                  return preview.preview
                                }
                              }
                              // Show original
                              return currentAnalysis.emoji.preview
                            })()}
                            alt={currentAnalysis.emoji.name}
                            className="w-full h-full object-contain p-3"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Recommendations */}
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
                        <h3 className="text-sm font-medium">Recommendations</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleAllForEmoji(currentAnalysis.emoji.name, currentAnalysis.recommendations)}
                        >
                          {currentAnalysis.recommendations.every(rec => 
                            selectedRecommendations.has(`${currentAnalysis.emoji.name}-${rec.id}`)
                          ) ? 'Deselect' : 'Select All'}
                        </Button>
                      </div>

                      <ScrollArea className="h-[320px]">
                        <div className="p-2 space-y-2">
                          {currentAnalysis.recommendations.map((rec) => {
                            const isSelected = selectedRecommendations.has(`${currentAnalysis.emoji.name}-${rec.id}`)
                            
                            return (
                              <div
                                key={rec.id}
                                className={cn(
                                  "group relative rounded-md border p-2.5 transition-all cursor-pointer hover:bg-muted/30",
                                  isSelected && "border-purple-500 bg-purple-50/30 dark:bg-purple-950/10"
                                )}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('[Card] Clicked recommendation card:', rec.id)
                                  toggleRecommendation(currentAnalysis.emoji.name, rec.id)
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                    }}
                                    onPointerDown={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        console.log('[Checkbox] Toggling recommendation:', rec.id, 'to', checked)
                                        toggleRecommendation(currentAnalysis.emoji.name, rec.id)
                                      }}
                                      className="mt-0.5"
                                    />
                                  </div>
                                  <span className="text-lg mt-[-2px]">{rec.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium">{rec.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                          {rec.description}
                                        </p>
                                      </div>
                                       <Button
                                         variant="default"
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation()
                                           e.preventDefault()
                                           applySingleRecommendation(currentAnalysis, rec)
                                         }}
                                         className="h-7 px-2 text-xs shrink-0"
                                         disabled={applyingRecId === rec.id || isApplying}
                                       >
                                         {applyingRecId === rec.id ? (
                                           <>
                                             <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                             Applying
                                           </>
                                         ) : (
                                           <>
                                             <Wand2 className="h-3 w-3 mr-1" />
                                             Apply
                                           </>
                                         )}
                                       </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Perfect Score!</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Your emojis are already optimized. No improvements needed at this time.
              </p>
            </div>
          )}
        </div>

        {!isAnalyzing && analyses.length > 0 && (
          <DialogFooter className="border-t px-4 py-3 bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {selectedRecommendations.size > 0 && (
                  <>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        {selectedRecommendations.size}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      optimization{selectedRecommendations.size !== 1 ? 's' : ''} selected
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedRecommendations.size > 0 && !isApplying) {
                      if (confirm("You have unsaved optimizations. Are you sure you want to close?")) {
                        setAllowClose(true)
                        onClose()
                      }
                    } else {
                      setAllowClose(true)
                      onClose()
                    }
                  }}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={applyOptimizations}
                  disabled={isApplying || selectedRecommendations.size === 0}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Apply Optimizations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}