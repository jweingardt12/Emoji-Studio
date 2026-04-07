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
      className="relative group rounded-xl border border-border bg-card overflow-hidden aspect-square shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white shadow-sm">
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
        "flex-1 min-h-0 rounded-xl transition-all duration-300 flex flex-col",
        isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {selectedFiles.length === 0 ? (
        // Empty state — clean drop zone
        <div className={cn(
          "flex-1 min-h-0 rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-center p-8 transition-all duration-200",
          isDragging && "ring-2 ring-primary border-primary bg-primary/5"
        )}>
          <div className={cn(
            "h-20 w-20 rounded-xl bg-muted flex items-center justify-center mb-6 transition-transform duration-200",
            isDragging && "scale-110"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors duration-200",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <h3 className="text-xl font-bold mb-2">
            {isDragging ? "Drop files here" : "Drag and drop files here"}
          </h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
            Drop your images, videos, or GIFs to transform them into Slack-ready emojis
          </p>

          <input
            type="file"
            id="file-upload-tab"
            className="hidden"
            multiple
            accept="image/*,video/*,.gif,.webp"
            onChange={handleFileSelect}
          />

          <Button asChild size="lg" className="h-12 px-8">
            <label htmlFor="file-upload-tab" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Choose Files
            </label>
          </Button>

          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {["JPG", "PNG", "GIF", "WebP", "MP4", "MOV", "WebM"].map((format) => (
              <span
                key={format}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/50 text-muted-foreground border border-border"
              >
                {format}
              </span>
            ))}
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
                  className=""
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
          <div className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 bg-card rounded-xl p-6 gap-5 border border-border">
            <div>
              <h4 className="font-bold text-lg mb-1">Ready to Process</h4>
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
                    <span className="w-2 h-2 rounded-full bg-info" />
                    <Image className="h-4 w-4" />
                    Images
                  </span>
                  <span className="font-medium">{fileStats.images}</span>
                </div>
              )}

              {fileStats.videos > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-brand" />
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
                      className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-muted text-muted-foreground border border-border"
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
                className="w-full"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Process All ({selectedFiles.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
