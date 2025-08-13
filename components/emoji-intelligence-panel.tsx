"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EmojiIntelligence, ImageAnalysis, AnalysisDetails } from "@/lib/utils/emoji-intelligence"
import { EmojiRecommendations, EmojiRecommendation } from "@/lib/utils/emoji-recommendations"
import { EmojiAutoEnhance } from "@/lib/utils/emoji-auto-enhance"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Sparkles, 
  Loader2, 
  Check, 
  X,
  Wand2,
  ChevronRight,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { openpanel } from "@/lib/safe-openpanel"

interface EmojiIntelligencePanelProps {
  file: File | null
  isOpen: boolean
  onClose: () => void
  onApplyEnhancement: (enhancedFile: File) => void
  className?: string
}

export function EmojiIntelligencePanel({
  file,
  isOpen,
  onClose,
  onApplyEnhancement,
  className
}: EmojiIntelligencePanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [details, setDetails] = useState<AnalysisDetails | null>(null)
  const [recommendations, setRecommendations] = useState<EmojiRecommendation[]>([])
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (file && isOpen) {
      analyzeImage(file)
      setCurrentFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setAppliedRecommendations(new Set())
    }
  }, [file, isOpen])

  const analyzeImage = async (fileToAnalyze: File) => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const { analysis, details } = await EmojiIntelligence.analyzeImage(fileToAnalyze)
      setAnalysis(analysis)
      setDetails(details)
      
      const recs = EmojiRecommendations.generateRecommendations(analysis, details)
      setRecommendations(recs)
      
      // Track analysis
      openpanel.track("Emoji Intelligence: Analysis Complete", {
        fileName: fileToAnalyze.name,
        overallQuality: analysis.overallQuality,
        recommendationCount: recs.length,
        hasBackground: analysis.hasBackground,
        imageType: details.imageType
      })
    } catch (error) {
      console.error("Failed to analyze image:", error)
      setError("Failed to analyze image. Please try again.")
      openpanel.track("Emoji Intelligence: Analysis Failed", {
        fileName: fileToAnalyze.name,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyRecommendation = async (recommendation: EmojiRecommendation) => {
    if (!currentFile) return
    
    setIsApplying(recommendation.id)
    
    try {
      const result = await EmojiAutoEnhance.applyRecommendation(
        currentFile,
        recommendation,
        details || undefined
      )
      
      const enhancedFile = new File([result.blob], currentFile.name, { type: result.blob.type })
      setCurrentFile(enhancedFile)
      setPreviewUrl(URL.createObjectURL(result.blob))
      setAppliedRecommendations(prev => new Set(prev).add(recommendation.id))
      
      // Re-analyze the enhanced image
      await analyzeImage(enhancedFile)
      
      // Track enhancement
      openpanel.track("Emoji Intelligence: Enhancement Applied", {
        recommendationType: recommendation.type,
        recommendationId: recommendation.id,
        processingTime: result.processingTime
      })
    } catch (error) {
      console.error("Failed to apply enhancement:", error)
      openpanel.track("Emoji Intelligence: Enhancement Failed", {
        recommendationType: recommendation.type,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsApplying(null)
    }
  }

  const applyAllRecommendations = async () => {
    if (!currentFile) return
    
    setIsApplying('all')
    
    try {
      const unappliedRecs = recommendations.filter(r => !appliedRecommendations.has(r.id))
      const result = await EmojiAutoEnhance.applyAllRecommendations(
        currentFile,
        unappliedRecs,
        details || undefined
      )
      
      const enhancedFile = new File([result.blob], currentFile.name, { type: result.blob.type })
      setCurrentFile(enhancedFile)
      setPreviewUrl(URL.createObjectURL(result.blob))
      setAppliedRecommendations(new Set(recommendations.map(r => r.id)))
      
      // Re-analyze the enhanced image
      await analyzeImage(enhancedFile)
      
      // Track bulk enhancement
      openpanel.track("Emoji Intelligence: All Enhancements Applied", {
        enhancementCount: unappliedRecs.length,
        processingTime: result.processingTime,
        appliedEnhancements: result.appliedEnhancements
      })
    } catch (error) {
      console.error("Failed to apply all enhancements:", error)
    } finally {
      setIsApplying(null)
    }
  }

  const handleDone = () => {
    if (currentFile && currentFile !== file) {
      onApplyEnhancement(currentFile)
      
      // Track completion
      openpanel.track("Emoji Intelligence: Enhancements Completed", {
        originalFile: file?.name,
        finalQuality: analysis?.overallQuality,
        appliedCount: appliedRecommendations.size
      })
    }
    onClose()
  }

  const getRecommendationIcon = (type: string) => {
    const icons: Record<string, string> = {
      background: '🔍',
      contrast: '⚡',
      crop: '🎯',
      color: '🌈',
      sharpness: '🔪',
      brightness: '💡'
    }
    return icons[type] || '✨'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed right-4 top-20 z-50 w-96 max-h-[calc(100vh-6rem)]",
          "bg-background border rounded-xl shadow-2xl overflow-hidden",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Emoji Intelligence</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Preview */}
            {previewUrl && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Emoji preview"
                    className="w-32 h-32 object-contain rounded-lg border bg-checkerboard"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality Score */}
            {analysis && !isAnalyzing && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Quality</span>
                  <span className="text-2xl">
                    {EmojiRecommendations.getQualityEmoji(analysis.overallQuality)}
                  </span>
                </div>
                <Progress value={analysis.overallQuality} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {EmojiRecommendations.getQualityMessage(analysis.overallQuality)}
                </p>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </Card>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && !isAnalyzing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Suggested Improvements</h4>
                  {recommendations.some(r => !appliedRecommendations.has(r.id)) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyAllRecommendations}
                      disabled={isApplying !== null}
                      className="h-7 text-xs"
                    >
                      {isApplying === 'all' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      Apply All
                    </Button>
                  )}
                </div>

                {recommendations.map((rec) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={cn(
                        "p-3 transition-all",
                        appliedRecommendations.has(rec.id) && "opacity-60 bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-1">
                          {getRecommendationIcon(rec.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-sm">{rec.title}</h5>
                            {appliedRecommendations.has(rec.id) && (
                              <Badge variant="secondary" className="text-xs">
                                Applied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {rec.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={appliedRecommendations.has(rec.id) ? "secondary" : "default"}
                              onClick={() => applyRecommendation(rec)}
                              disabled={isApplying !== null || appliedRecommendations.has(rec.id)}
                              className="h-7 text-xs"
                            >
                              {isApplying === rec.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : appliedRecommendations.has(rec.id) ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <Wand2 className="h-3 w-3 mr-1" />
                              )}
                              {appliedRecommendations.has(rec.id) ? "Applied" : "Apply"}
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(rec.confidence)}% confident
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* No recommendations */}
            {recommendations.length === 0 && !isAnalyzing && analysis && (
              <Card className="p-4 bg-green-500/10 border-green-500/20">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <p className="text-sm">Your emoji looks great! No improvements needed.</p>
                </div>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/50">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDone}
                disabled={!currentFile || currentFile === file}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Done
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Floating trigger button component
export function EmojiIntelligenceButton({
  onClick,
  show = true,
  className
}: {
  onClick: () => void
  show?: boolean
  className?: string
}) {
  if (!show) return null

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("relative", className)}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Emoji Intelligence
      </Button>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md opacity-50 blur-xl -z-10"
      />
    </motion.div>
  )
}