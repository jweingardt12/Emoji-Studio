"use client"

import { useCallback, memo, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import { Upload, X, FileVideo, FileImage, File as FileIcon, Sparkles, Image, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useCreatePageContext } from "./CreatePageContext"
import { useTrack } from "@/lib/hooks/use-track"

interface FileUploadZoneProps {
  onProcessFiles: (files?: File[]) => void
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" }
  }
}

const floatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-4, 4, -4],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// Format icons that float around the upload area
const FORMAT_ICONS = [
  { type: "JPG", icon: Image, color: "text-blue-500", delay: 0 },
  { type: "PNG", icon: Image, color: "text-green-500", delay: 0.5 },
  { type: "GIF", icon: Film, color: "text-purple-500", delay: 1 },
  { type: "WebP", icon: Image, color: "text-orange-500", delay: 1.5 },
  { type: "MP4", icon: Film, color: "text-red-500", delay: 2 },
]

// Shared utilities
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File) {
  if (file.type.startsWith('video/')) return FileVideo
  if (file.type.startsWith('image/')) return FileImage
  return FileIcon
}

function getFormatBadge(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() || ''
  if (file.type.startsWith('video/')) {
    return file.type.includes('gif') ? 'GIF' : ext || 'VID'
  }
  return ext || 'IMG'
}

// Shimmer overlay component
function ShimmerOverlay() {
  return (
    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  )
}

// Memoized file preview item with enhanced hover effects
const FilePreviewItem = memo(function FilePreviewItem({
  file,
  index,
  onRemove,
}: {
  file: File
  index: number
  onRemove: (index: number) => void
}) {
  const Icon = getFileIcon(file)
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const previewUrl = isImage || isVideo ? URL.createObjectURL(file) : null

  return (
    <motion.div
      variants={itemVariants}
      className="relative group rounded-xl border border-border/50 bg-card overflow-hidden aspect-square shadow-sm hover:shadow-lg hover:border-border transition-all duration-300"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {previewUrl ? (
        <div className="h-full w-full">
          {isImage ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <video
              src={previewUrl}
              className="h-full w-full object-cover"
              muted
            />
          )}
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Format badge */}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white">
        {getFormatBadge(file)}
      </div>

      {/* Hover overlay with file info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-xs text-white font-medium truncate">{file.name}</p>
        <p className="text-[10px] text-white/70">{formatFileSize(file.size)}</p>
      </div>

      {/* Bottom gradient (always visible) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 group-hover:opacity-0 transition-opacity">
        <p className="text-xs text-white truncate">{file.name}</p>
      </div>

      {/* Remove button */}
      <Button
        variant="destructive"
        size="icon"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  )
})

export function FileUploadZone({ onProcessFiles }: FileUploadZoneProps) {
  const {
    selectedFiles,
    setSelectedFiles,
    isDragging,
    setIsDragging,
    setActiveTab,
    isProcessing,
  } = useCreatePageContext()
  const track = useTrack()

  // Calculate file stats
  const fileStats = useMemo(() => {
    const stats = {
      total: selectedFiles.length,
      totalSize: selectedFiles.reduce((sum, f) => sum + f.size, 0),
      images: selectedFiles.filter(f => f.type.startsWith('image/')).length,
      videos: selectedFiles.filter(f => f.type.startsWith('video/')).length,
      formats: new Map<string, number>()
    }

    selectedFiles.forEach(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'OTHER'
      stats.formats.set(ext, (stats.formats.get(ext) || 0) + 1)
    })

    return stats
  }, [selectedFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [setIsDragging])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [setIsDragging])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      setActiveTab("upload")
      track("Emoji Creator: Files Dropped", {
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }, [setIsDragging, setSelectedFiles, setActiveTab, track])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      track("Emoji Creator: Files Selected", {
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }, [setSelectedFiles, track])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const file = prev[index]
      if (file) {
        track("Emoji Creator: File Removed", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        })
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          try {
            URL.revokeObjectURL(URL.createObjectURL(file))
          } catch {
            // Ignore errors
          }
        }
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [setSelectedFiles, track])

  const handleClearAll = useCallback(() => {
    const fileCount = selectedFiles.length
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    setSelectedFiles([])
    track("Emoji Creator: All Files Cleared", {
      fileCount,
      totalSize
    })
  }, [selectedFiles, setSelectedFiles, track])

  return (
    <div
      className={cn(
        "h-full rounded-xl transition-all duration-300 flex flex-col",
        isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {selectedFiles.length === 0 ? (
        // Empty state with glass effect and floating icons
        <div className="h-full bg-gradient-to-br from-muted/40 via-background to-muted/20 rounded-xl">
          <div className={cn(
            "h-full glass-liquid rounded-xl m-2 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300",
            isDragging && "bg-primary/5 scale-[1.01]"
          )}>
            {/* Floating format icons */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {FORMAT_ICONS.map((format, i) => (
                <motion.div
                  key={format.type}
                  className={cn(
                    "absolute flex items-center gap-1 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
                    format.color
                  )}
                  style={{
                    top: `${15 + (i * 17) % 70}%`,
                    left: i % 2 === 0 ? '8%' : 'auto',
                    right: i % 2 === 1 ? '8%' : 'auto',
                  }}
                  variants={floatVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: format.delay }}
                >
                  <format.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{format.type}</span>
                </motion.div>
              ))}
            </div>

            {/* Main upload prompt */}
            <motion.div
              className={cn(
                "relative z-10 h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
                isDragging
                  ? "bg-primary/20 scale-110"
                  : "bg-gradient-to-br from-primary/10 to-primary/5"
              )}
              animate={isDragging ? { scale: [1.1, 1.15, 1.1] } : {}}
              transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
            >
              <Upload className={cn(
                "h-10 w-10 transition-colors duration-300",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </motion.div>

            <h3 className="text-xl font-semibold mb-2">
              {isDragging ? "Drop files here" : "Drag and drop files here"}
            </h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Drop your images, videos, or GIFs to convert them to Slack-ready emojis
            </p>

            <input
              type="file"
              id="file-upload-tab"
              className="hidden"
              multiple
              accept="image/*,video/*,.gif,.webp"
              onChange={handleFileSelect}
            />

            {/* Enhanced CTA button with shimmer effect */}
            <Button
              asChild
              size="lg"
              className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <label htmlFor="file-upload-tab" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Choose Files
                <ShimmerOverlay />
              </label>
            </Button>

            {/* Format badges */}
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {["JPG", "PNG", "GIF", "WebP", "MP4", "MOV", "WebM"].map((format) => (
                <span
                  key={format}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted/80 text-muted-foreground border border-border/50"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Files selected - Desktop side panel layout on lg+
        <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-2">
          {/* File grid */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <h4 className="font-semibold">Selected Files ({selectedFiles.length})</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => onProcessFiles()}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-primary to-primary/90"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Process {selectedFiles.length}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <motion.div
                className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence mode="popLayout">
                  {selectedFiles.map((file, index) => (
                    <FilePreviewItem
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      index={index}
                      onRemove={handleRemoveFile}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>

            {/* Add more files button - mobile only */}
            <div className="flex justify-center pt-4 mt-4 border-t border-dashed lg:hidden">
              <input
                type="file"
                id="file-upload-tab-more"
                className="hidden"
                multiple
                accept="image/*,video/*,.gif,.webp"
                onChange={handleFileSelect}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload-tab-more" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Add More Files
                </label>
              </Button>
            </div>
          </div>

          {/* Desktop action panel - only visible on lg+ */}
          <div className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 glass-liquid rounded-xl p-5 gap-5">
            <div>
              <h4 className="font-semibold text-lg mb-1">Ready to Process</h4>
              <p className="text-sm text-muted-foreground">
                {fileStats.total} file{fileStats.total !== 1 ? 's' : ''} selected
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Size</span>
                <span className="font-medium">{formatFileSize(fileStats.totalSize)}</span>
              </div>

              {fileStats.images > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Image className="h-4 w-4" />
                    Images
                  </span>
                  <span className="font-medium">{fileStats.images}</span>
                </div>
              )}

              {fileStats.videos > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Film className="h-4 w-4" />
                    Videos
                  </span>
                  <span className="font-medium">{fileStats.videos}</span>
                </div>
              )}
            </div>

            {/* Format breakdown */}
            {fileStats.formats.size > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Formats</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(fileStats.formats.entries()).map(([format, count]) => (
                    <span
                      key={format}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted/80 text-muted-foreground border border-border/50"
                    >
                      {format} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto space-y-2">
              <input
                type="file"
                id="file-upload-tab-more-desktop"
                className="hidden"
                multiple
                accept="image/*,video/*,.gif,.webp"
                onChange={handleFileSelect}
              />
              <Button asChild variant="outline" className="w-full">
                <label htmlFor="file-upload-tab-more-desktop" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Add More Files
                </label>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isProcessing}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>

              <Button
                size="lg"
                onClick={() => onProcessFiles()}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Process All ({selectedFiles.length})
                <ShimmerOverlay />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
