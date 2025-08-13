import { ImageAnalysis, AnalysisDetails } from './emoji-intelligence'

export interface EmojiRecommendation {
  id: string
  title: string
  description: string
  icon: string
  priority: number // 1-10, higher is more important
  confidence: number // 0-100, how confident we are in this recommendation
  type: 'background' | 'contrast' | 'crop' | 'color' | 'sharpness' | 'brightness' | 'hdr'
  autoFixAvailable: boolean
}

export class EmojiRecommendations {
  private static readonly CLEAR_DESCRIPTIONS = {
    background: "Remove the background to make your emoji stand out clearly on any Slack theme",
    contrast: "Increase contrast to improve visibility and make details more distinguishable",
    crop: "Remove excess whitespace to maximize the emoji's size within the 128x128 frame",
    color: "Enhance color saturation to make the emoji more vibrant and eye-catching",
    sharpness: "Improve image sharpness to make edges and details clearer",
    brightness: "Adjust brightness for better visibility across light and dark Slack themes",
    noise: "Reduce image noise to create a cleaner, more professional appearance",
    whitespace: "Crop out unnecessary empty space to make better use of the available area",
    aspectRatio: "Adjust proportions to better fit Slack's square emoji format",
    hdr: "Boost dynamic range and vibrance for an HDR look that pops on modern displays",
  }

  static generateRecommendations(
    analysis: ImageAnalysis,
    details: AnalysisDetails
  ): EmojiRecommendation[] {
    const recommendations: EmojiRecommendation[] = []
    // Slack-aware helper metrics (backward compatible if not present)
    const readability32 = (analysis as any).readabilityScore32 ?? 50
    const readability64 = (analysis as any).readabilityScore64 ?? 50
    const themeContrastLight = (analysis as any).themeContrastLight ?? 50
    const themeContrastDark = (analysis as any).themeContrastDark ?? 50
    const minThemeContrast = (analysis as any).minThemeContrast ?? Math.min(themeContrastLight, themeContrastDark)

    // Only recommend things we can actually fix in the app
    
    // 1. Background removal - we have this capability (HIGH PRIORITY)
    // Lower threshold since user indicated "more often than not the image will need background removed"
    if (analysis.hasBackground && analysis.backgroundScore > 40 && analysis.transparencyScore < 20) {
      recommendations.push({
        id: 'remove-background',
        title: 'Remove Background',
        description: this.CLEAR_DESCRIPTIONS.background,
        icon: '🎯',
        priority: 10, // Increased from 9 to highest priority
        confidence: Math.max(70, analysis.backgroundScore), // Ensure minimum 70% confidence
        type: 'background',
        autoFixAvailable: true,
      })
    }

    // 2. Contrast enhancement - we can do this
    if (analysis.contrastScore < 55 || readability32 < 65 || minThemeContrast < 55) {
      recommendations.push({
        id: 'boost-contrast',
        title: 'Improve Contrast',
        description: this.CLEAR_DESCRIPTIONS.contrast,
        icon: '⚡',
        priority: 8,
        confidence: Math.max(100 - analysis.contrastScore, 70 - readability32, 70 - minThemeContrast),
        type: 'contrast',
        autoFixAvailable: true,
      })
    }

    // 3. Cropping - we can do this
    if (analysis.subjectCoverageScore < 40 && details.suggestedCropBox) {
      const cropBox = details.suggestedCropBox
      const originalArea = 10000 // Assuming normalized to 100x100
      const cropArea = cropBox.width * cropBox.height
      const cropReduction = (cropArea / originalArea) * 100
      
      // Only suggest if cropping would remove at least 20% of the image
      if (cropReduction < 80) {
        recommendations.push({
          id: 'crop-to-subject',
          title: 'Crop to Subject',
          description: this.CLEAR_DESCRIPTIONS.crop,
          icon: '✂️',
          priority: 7,
          confidence: 100 - analysis.subjectCoverageScore,
          type: 'crop',
          autoFixAvailable: true,
        })
      }
    }

    // 4. Color enhancement - we can adjust saturation
    if (analysis.saturationScore < 25) {
      recommendations.push({
        id: 'enhance-colors',
        title: 'Enhance Colors',
        description: this.CLEAR_DESCRIPTIONS.color,
        icon: '🎨',
        priority: 6,
        confidence: 100 - analysis.saturationScore,
        type: 'color',
        autoFixAvailable: true,
      })
    }

    // 5. Sharpness enhancement - we can do this
    if (analysis.sharpnessScore < 35 && analysis.edgeClarity < 45) {
      recommendations.push({
        id: 'sharpen-image',
        title: 'Sharpen Image',
        description: this.CLEAR_DESCRIPTIONS.sharpness,
        icon: '🔍',
        priority: 5,
        confidence: 100 - analysis.sharpnessScore,
        type: 'sharpness',
        autoFixAvailable: true,
      })
    }

    // 6. Brightness adjustment - tuned for Slack light/dark themes
    // Brighten only when the emoji is too dark AND readability at 32px is poor AND contrast on dark theme is weak
    const shouldBrighten = analysis.brightnessScore < 40 && readability32 < 65 && themeContrastDark < 55
    if (shouldBrighten) {
      recommendations.push({
        id: 'brighten-image',
        title: 'Increase Brightness',
        description: this.CLEAR_DESCRIPTIONS.brightness,
        icon: '☀️',
        priority: 6,
        confidence: Math.max(70, 100 - analysis.brightnessScore),
        type: 'brightness',
        autoFixAvailable: true,
      })
    }
    // Reduce brightness when the emoji is washed out (too bright) and loses contrast on light theme
    const shouldDarken = analysis.brightnessScore > 80 && themeContrastLight < 55
    if (shouldDarken) {
      recommendations.push({
        id: 'reduce-brightness',
        title: 'Reduce Brightness',
        description: this.CLEAR_DESCRIPTIONS.brightness,
        icon: '🌙',
        priority: 6,
        confidence: Math.max(60, analysis.brightnessScore - 60),
        type: 'brightness',
        autoFixAvailable: true,
      })
    }

    // 7. Check for excessive whitespace
    if (analysis.whiteSpaceScore > 30) {
      recommendations.push({
        id: 'trim-whitespace',
        title: 'Remove Whitespace',
        description: this.CLEAR_DESCRIPTIONS.whitespace,
        icon: '📐',
        priority: 7,
        confidence: analysis.whiteSpaceScore,
        type: 'crop',
        autoFixAvailable: true,
      })
    }

    // 8. Aspect ratio optimization
    // Prefer aspect fix when subject is non-square at small sizes or whitespace is high
    if (analysis.aspectRatioScore < 70 || analysis.whiteSpaceScore > 30) {
      recommendations.push({
        id: 'optimize-aspect',
        title: 'Fix Aspect Ratio',
        description: this.CLEAR_DESCRIPTIONS.aspectRatio,
        icon: '⬜',
        priority: 5,
        confidence: Math.max(100 - analysis.aspectRatioScore, analysis.whiteSpaceScore),
        type: 'crop',
        autoFixAvailable: true,
      })
    }

    // 9. Noise reduction for high noise scores
    if (analysis.noiseScore < 60) {
      recommendations.push({
        id: 'reduce-noise',
        title: 'Reduce Noise',
        description: this.CLEAR_DESCRIPTIONS.noise,
        icon: '✨',
        priority: 4,
        confidence: 100 - analysis.noiseScore,
        type: 'sharpness',
        autoFixAvailable: true,
      })
    }

    // 10. HDR look when dynamic range is limited but contrast/brightness could benefit
    const lowDynamicRange = analysis.contrastScore < 55 && Math.abs(analysis.brightnessScore - 50) < 20
    if (lowDynamicRange) {
      recommendations.push({
        id: 'make-hdr',
        title: 'Make HDR',
        description: this.CLEAR_DESCRIPTIONS.hdr,
        icon: '🔥',
        priority: 7,
        confidence: Math.max(60, 70 - analysis.contrastScore),
        type: 'hdr',
        autoFixAvailable: true,
      })
    }

    // If no recommendations yet, provide subtle enhancement suggestions
    if (recommendations.length === 0) {
      // Always suggest at least one improvement based on the lowest scoring metric
      const scores = {
        contrast: { score: analysis.contrastScore, type: 'contrast' as const },
        saturation: { score: Math.abs(analysis.saturationScore - 50), type: 'color' as const },
        sharpness: { score: analysis.sharpnessScore, type: 'sharpness' as const },
        brightness: { score: Math.abs(analysis.brightnessScore - 50), type: 'brightness' as const },
      }

      // Find the lowest scoring aspect (keep a consistent discriminated union)
      const lowestScore = (Object.entries(scores) as Array<[
        'contrast' | 'saturation' | 'sharpness' | 'brightness',
        { score: number; type: 'contrast' | 'color' | 'sharpness' | 'brightness' }
      ]>).reduce(
        (min, [key, val]) => (val.score < min.score ? { key, score: val.score, type: val.type } : min),
        { key: 'contrast' as 'contrast' | 'saturation' | 'sharpness' | 'brightness', score: 100, type: 'contrast' as 'contrast' | 'color' | 'sharpness' | 'brightness' }
      )

      if (lowestScore.key === 'contrast' || readability32 < 65 || minThemeContrast < 55) {
        recommendations.push({
          id: 'subtle-contrast',
          title: 'Fine-Tune Contrast',
          description: this.CLEAR_DESCRIPTIONS.contrast,
          icon: '🎯',
          priority: 3,
          confidence: Math.max(60, 70 - readability32, 70 - minThemeContrast),
          type: 'contrast',
          autoFixAvailable: true,
        })
      } else if (lowestScore.key === 'saturation') {
        recommendations.push({
          id: 'subtle-color',
          title: 'Color Fine-Tuning',
          description: this.CLEAR_DESCRIPTIONS.color,
          icon: '🎨',
          priority: 3,
          confidence: 60,
          type: 'color',
          autoFixAvailable: true,
        })
      } else if (lowestScore.key === 'sharpness') {
        recommendations.push({
          id: 'subtle-sharpen',
          title: 'Crisp It Up',
          description: this.CLEAR_DESCRIPTIONS.sharpness,
          icon: '✨',
          priority: 3,
          confidence: 60,
          type: 'sharpness',
          autoFixAvailable: true,
        })
      } else {
        recommendations.push({
          id: 'subtle-brightness',
          title: 'Light Touch',
          description: this.CLEAR_DESCRIPTIONS.brightness,
          icon: '💡',
          priority: 3,
          confidence: 60,
          type: 'brightness',
          autoFixAvailable: true,
        })
      }
    }

    // Sort by priority and confidence, return top 3 most impactful
    return recommendations
      .filter(r => r.confidence > 40) // Lower threshold to ensure we always have suggestions
      .sort((a, b) => {
        // First sort by priority, then by confidence
        const priorityDiff = b.priority - a.priority
        if (priorityDiff !== 0) return priorityDiff
        return b.confidence - a.confidence
      })
      .slice(0, 3) // Maximum 3 recommendations to avoid overwhelming
  }


  static getQualityEmoji(score: number): string {
    if (score >= 80) return '🌟'
    if (score >= 60) return '✨'
    if (score >= 40) return '👍'
    if (score >= 20) return '🤔'
    return '😬'
  }

  static getQualityMessage(score: number): string {
    if (score >= 80) return "This emoji is already fire! 🔥"
    if (score >= 60) return "Pretty good, but we can make it legendary!"
    if (score >= 40) return "Decent start - let's polish it up!"
    if (score >= 20) return "Needs some love, but we've got you covered!"
    return "Don't worry, we'll transform this into emoji gold!"
  }

  static shouldShowRecommendations(analysis: ImageAnalysis): boolean {
    // Show recommendations if overall quality is below 75 or if there are obvious improvements
    // Lower background detection threshold to match updated priority
    return (
      analysis.overallQuality < 75 ||
      (analysis.hasBackground && analysis.backgroundScore > 40) ||
      analysis.contrastScore < 50 ||
      analysis.subjectCoverageScore < 40
    )
  }

  static getPriorityRecommendation(recommendations: EmojiRecommendation[]): EmojiRecommendation | null {
    if (recommendations.length === 0) return null
    
    // Return the highest priority recommendation with high confidence
    const highConfidence = recommendations.filter(r => r.confidence > 60)
    return highConfidence.length > 0 ? highConfidence[0] : recommendations[0]
  }
}