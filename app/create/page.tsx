"use client"

import { useState, useEffect, useCallback, Suspense, lazy } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Button } from "@/components/ui/button"
import { Search, Grid3x3, List, Upload, Sparkles, Download, Send, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { useTrack } from "@/lib/hooks/use-track"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePackBrowser, PackBrowserTabs, PackEmojiGrid, PackSelectionSidebar } from "@/components/pack-browser"

import {
  CreatePageProvider,
  useCreatePageContext,
  FileUploadZone,
  ExtensionBanner,
  CreatePageModals,
  useExtensionMessages,
  useFileProcessing,
} from "./components"

// Dynamic import for mobile component
const MobileEmojiCreator = lazy(() => import("@/components/mobile-emoji-creator").then(module => ({ default: module.MobileEmojiCreator })))

function ProgressBar({ completed, total, label }: { completed: number; total: number; label: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <Progress value={pct} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completed}/{total}
        </span>
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  )
}

// Main page content component
function EmojiCreatorContent() {
  const { loading, emojiData } = useEmojiData()
  const isMobile = useIsMobile()
  const track = useTrack()
  const {
    // State from context
    selectedFiles,
    setSelectedFiles,
    processingFiles,
    setProcessingFiles,
    processedEmojis,
    setProcessedEmojis,
    isProcessing,
    setIsProcessing,
    currentFileIndex,
    setCurrentFileIndex,
    currentStep,
    setCurrentStep,
    processingError,
    setProcessingError,
    isDragging,
    setIsDragging,
    activeTab,
    setActiveTab,
    isCartOpen,
    setIsCartOpen,
    pendingMobileFile,
    setPendingMobileFile,
    downloadProgress,
    setDownloadProgress,
    uploadProgress,
    setUploadProgress,
    failedFrameExtraction,
    setFailedFrameExtraction,
    hasSlack,
    setHasSlack,
    desktopLayoutRef,
    availableLayoutHeight,
    setAvailableLayoutHeight,
    lastTrackedSearchQuery,
    gifToEdit,
    setGifToEdit,
    showGifEditor,
    setShowGifEditor,
    updateCartOpen,
  } = useCreatePageContext()

  // Pack browser state
  const packBrowser = usePackBrowser(20, emojiData)

  // File processing hook
  const { processFiles } = useFileProcessing({
    selectedFiles,
    failedFrameExtraction,
    setProcessingFiles,
    setIsProcessing,
    setCurrentFileIndex,
    setCurrentStep,
    setProcessingError,
    setProcessedEmojis,
    setGifToEdit,
    setShowGifEditor,
    setFailedFrameExtraction,
  })

  // Extension message handler hook
  useExtensionMessages({
    onProcessFiles: processFiles,
    onSetSelectedFiles: setSelectedFiles,
    onSetPendingMobileFile: setPendingMobileFile,
    isMobile,
  })

  // Layout height calculation
  const updateLayoutHeight = useCallback(() => {
    if (typeof window === "undefined") return
    const container = desktopLayoutRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const parent = container.parentElement
    const parentStyles = parent ? window.getComputedStyle(parent) : null
    const parentPaddingBottom = parentStyles ? parseFloat(parentStyles.paddingBottom || "0") : 0
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const calculatedHeight = viewportHeight - rect.top - parentPaddingBottom

    if (!Number.isFinite(calculatedHeight)) return

    const nextHeight = Math.max(0, calculatedHeight)

    setAvailableLayoutHeight((prev) => {
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
        return prev ?? null
      }
      if (prev === null || Math.abs(prev - nextHeight) > 1) {
        return nextHeight
      }
      return prev
    })
  }, [desktopLayoutRef, setAvailableLayoutHeight])

  // Initialize Slack connection check
  useEffect(() => {
    setHasSlack(hasSlackConnection())
  }, [setHasSlack])

  // Layout resize handling
  useEffect(() => {
    if (isMobile) return

    let rafId = 0

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        updateLayoutHeight()
      })
    }

    handleResize()

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)
    const visualViewport = window.visualViewport
    visualViewport?.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      visualViewport?.removeEventListener("resize", handleResize)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [isMobile, updateLayoutHeight])

  // Track search queries
  useEffect(() => {
    const trimmed = packBrowser.searchQuery.trim()

    if (trimmed === "") {
      if (lastTrackedSearchQuery.current !== "") {
        track('Emoji Creator: Pack Search Cleared', {
          previousQuery: lastTrackedSearchQuery.current,
        })
        lastTrackedSearchQuery.current = ""
      }
      return
    }

    const handler = window.setTimeout(() => {
      if (trimmed !== lastTrackedSearchQuery.current) {
        track('Emoji Creator: Pack Search', {
          query: trimmed,
          length: trimmed.length,
        })
        lastTrackedSearchQuery.current = trimmed
      }
    }, 600)

    return () => {
      window.clearTimeout(handler)
    }
  }, [packBrowser.searchQuery, track, lastTrackedSearchQuery])

  // Show mobile-optimized flow on mobile devices
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <MobileEmojiCreator
            initialFile={pendingMobileFile || undefined}
            onCancel={() => setPendingMobileFile(null)}
          />
        </Suspense>
      </div>
    )
  }

  // Drag handlers for the main container
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
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
  }

  // Download handler for pack browser
  const handlePackDownload = async () => {
    const selected = packBrowser.getSelectedEmojis()
    if (selected.length === 0) return

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    let completed = 0
    const total = selected.length

    setDownloadProgress({ stage: "downloading", completed: 0, total })

    const progressToastId = toast.loading("Creating zip file...", {
      description: `Starting download...`,
    })

    const updateProgressToast = (message: string) => {
      toast.loading("Creating zip file...", {
        id: progressToastId,
        description: message,
      })
    }

    for (const emoji of selected) {
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.imageURL)}`
        const response = await fetch(proxyUrl)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const ext = emoji.isAnimated ? 'gif' : 'png'
        const fileName = `${emoji.name}.${ext}`

        zip.file(fileName, blob)
        completed++

        setDownloadProgress((prev) =>
          prev ? { ...prev, completed } : prev
        )

        if (completed % 5 === 0 || completed === total) {
          updateProgressToast(`Downloaded ${completed}/${total} emojis`)
        }
      } catch (error) {
        console.error(`[Download] Failed to download emoji ${emoji.name}:`, error)
      }
    }

    if (completed === 0) {
      toast.dismiss(progressToastId)
      setDownloadProgress(null)
      toast.error("Download failed", {
        description: "Could not download any emojis",
      })
      return
    }

    setDownloadProgress((prev) =>
      prev ? { ...prev, stage: "finalizing" } : prev
    )
    updateProgressToast("Finalizing download...")

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `emoji-pack-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.dismiss(progressToastId)
      setDownloadProgress(null)
      packBrowser.clearSelectionsAndStorage()

      toast.success("Download complete", {
        description: `Downloaded ${completed} emoji${completed > 1 ? 's' : ''} as zip file`,
      })
    } catch (error) {
      console.error('Failed to create zip:', error)
      toast.dismiss(progressToastId)
      setDownloadProgress(null)
      toast.error("Failed to create zip", {
        description: "Could not create zip file",
      })
    }
  }

  // Send to Slack handler for pack browser
  const handleSendToSlack = async () => {
    const selected = packBrowser.getSelectedEmojis()
    if (selected.length === 0) return

    const { uploadPackEmojiToSlack } = await import('@/lib/utils/slack-upload')

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []
    const total = selected.length

    setUploadProgress({ completed: 0, failed: 0, total, stage: "uploading" })

    const uploadToastId = toast.loading("Uploading to Slack...", {
      description: `0/${total} (0%)`,
    })

    const updateUploadToast = (message: string) => {
      toast.loading("Uploading to Slack...", {
        id: uploadToastId,
        description: message,
      })
    }

    for (let i = 0; i < selected.length; i++) {
      const emoji = selected[i]
      try {
        const effectiveName = packBrowser.getEffectiveName(emoji)
        const result = await uploadPackEmojiToSlack(
          emoji.imageURL,
          effectiveName,
          emoji.isAnimated
        )

        if (result.success) {
          successCount++
        } else {
          failedCount++
          errors.push(`${effectiveName}: ${result.error || 'Unknown error'}`)
        }

        const completed = successCount + failedCount
        const percentage = Math.round((completed / total) * 100)
        setUploadProgress((prev) =>
          prev ? { ...prev, completed, failed: failedCount } : prev
        )
        updateUploadToast(`${completed}/${total} (${percentage}%) - ${successCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ''}`)
      } catch (error) {
        const effectiveName = packBrowser.getEffectiveName(emoji)
        console.error(`Failed to upload ${effectiveName}:`, error)
        failedCount++
        errors.push(`${effectiveName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    toast.dismiss(uploadToastId)
    setUploadProgress((prev) => (prev ? { ...prev, stage: "complete" } : prev))

    if (successCount > 0) {
      packBrowser.clearSelectionsAndStorage()
      toast.success("Upload complete", {
        description: `Successfully uploaded ${successCount} emoji${successCount > 1 ? 's' : ''} to Slack${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
        duration: 8000,
      })
    }

    if (failedCount > 0) {
      console.error('Upload errors:', errors)
      toast.error(`${failedCount} upload${failedCount > 1 ? 's' : ''} failed`, {
        description: errors[0] || 'Unknown error',
      })
    }

    if (successCount > 0) {
      setTimeout(() => setUploadProgress(null), 3000)
    } else {
      setUploadProgress(null)
    }
  }

  return (
    <>
      <div
        ref={desktopLayoutRef}
        className="flex flex-col overflow-hidden min-h-0"
        style={availableLayoutHeight ? { height: availableLayoutHeight, maxHeight: availableLayoutHeight } : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {/* Standalone header section */}
          <div className="flex-none mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      Create Emojis
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Transform any image into Slack-ready emojis
                    </p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex p-1 bg-muted/50 rounded-xl border border-border">
                  {[
                    { id: "upload", label: "Upload", mobileLabel: "Upload", icon: Upload },
                    { id: "browse", label: "Browse Packs", mobileLabel: "Browse", icon: Grid3x3 },
                  ].map((tab) => {
                    const isSelected = activeTab === tab.id
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as "upload" | "browse")
                          track('Emoji Creator: Tab Changed', { tab: tab.id })
                        }}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "bg-background text-foreground shadow-xs border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.mobileLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Cart button */}
              {activeTab === "browse" && packBrowser.selectedEmojis.length > 0 && (
                <Button
                  onClick={() => updateCartOpen(true, 'toolbar')}
                  className="relative h-9 w-9 rounded-xl border border-border/60 bg-card/95 shadow-xs"
                  size="icon"
                  variant="ghost"
                >
                  <span className="text-sm font-semibold">{packBrowser.selectedEmojis.length}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Extension Banner -- below header so upload zone is first thing users see */}
          <ExtensionBanner hasSlack={hasSlack} loading={loading} />

          {/* Main content card */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl bg-card border border-border shadow-xs">
            <Tabs value={activeTab} className="flex flex-col flex-1 min-h-0">
              {/* Upload Tab Content */}
              <TabsContent value="upload" className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 min-h-0 p-4 flex flex-col">
                  <FileUploadZone onProcessFiles={processFiles} />
                </div>
              </TabsContent>

              {/* Browse Packs Tab Content */}
              <TabsContent value="browse" className="flex-1 min-h-0 m-0 relative data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-none px-4 pt-4 pb-3 space-y-3">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      {packBrowser.loading && packBrowser.searchQuery.trim() ? (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        placeholder="Search emoji packs..."
                        value={packBrowser.searchQuery}
                        onChange={(e) => packBrowser.setSearchQuery(e.target.value)}
                        className={cn("pl-9", packBrowser.searchQuery && "pr-8")}
                      />
                      {packBrowser.searchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => packBrowser.setSearchQuery("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const nextView = packBrowser.viewMode === "grid" ? "list" : "grid"
                        packBrowser.setViewMode(nextView)
                        track('Emoji Creator: Pack View Changed', {
                          view: nextView,
                        })
                      }}
                    >
                      {packBrowser.viewMode === "grid" ? (
                        <List className="h-4 w-4" />
                      ) : (
                        <Grid3x3 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle view mode</span>
                    </Button>
                  </div>
                  <PackBrowserTabs
                    selectedTab={packBrowser.selectedTab}
                    onSelectTab={(tab) => {
                      packBrowser.setSelectedTab(tab)
                      track('Emoji Creator: Pack Tab Selected', {
                        tab,
                      })
                    }}
                    searchQuery={packBrowser.searchQuery}
                  />
                  {packBrowser.searchQuery.trim() && !packBrowser.loading && packBrowser.currentEmojis.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {packBrowser.currentEmojis.length} result{packBrowser.currentEmojis.length !== 1 ? "s" : ""} for &quot;{packBrowser.searchQuery.trim()}&quot;
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-hidden min-h-0 px-4 pb-20">
                    <PackEmojiGrid
                      emojis={packBrowser.currentEmojis}
                      loading={packBrowser.loading}
                      viewMode={packBrowser.viewMode}
                      selectedIds={packBrowser.selectedIds}
                      onToggleSelection={packBrowser.toggleSelection}
                    />
                </div>

                {/* Floating action bar */}
                {packBrowser.selectedEmojis.length > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4"
                  >
                    <div className="bg-card rounded-xl p-3 shadow-lg border border-border">
                      {downloadProgress || uploadProgress ? (
                        <ProgressBar
                          completed={downloadProgress ? downloadProgress.completed : (uploadProgress!.completed + uploadProgress!.failed)}
                          total={(downloadProgress || uploadProgress!).total}
                          label={downloadProgress ? (downloadProgress.stage === "downloading" ? "Downloading emojis..." : "Finalizing...") : "Uploading to Slack..."}
                        />
                      ) : (
                      <div className="flex items-center gap-3">
                        {/* Selection info - tap to open sheet */}
                        <button
                          onClick={() => updateCartOpen(true, 'toolbar')}
                          className="flex-1 flex items-center gap-3 text-left hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors"
                        >
                          <div className="flex -space-x-2">
                            {packBrowser.selectedEmojis.slice(0, 3).map((emoji, i) => (
                              <img
                                key={emoji.id}
                                src={emoji.imageURL}
                                alt=""
                                className="w-8 h-8 rounded-lg border-2 border-background object-contain bg-muted"
                                style={{ zIndex: 3 - i }}
                              />
                            ))}
                            {packBrowser.selectedEmojis.length > 3 && (
                              <div className="w-8 h-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                                +{packBrowser.selectedEmojis.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {packBrowser.selectedEmojis.length} selected
                            </p>
                            <p className="text-xs text-muted-foreground">Tap to edit names</p>
                          </div>
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              const previousCount = packBrowser.selectedEmojis.length
                              setDownloadProgress(null)
                              setUploadProgress(null)
                              packBrowser.clearSelection()
                              track('Emoji Creator: Selection Cleared', { previousCount })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={handlePackDownload}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {hasSlack && (
                            <Button
                              size="sm"
                              className="h-9 gap-2"
                              onClick={handleSendToSlack}
                            >
                              <Send className="h-4 w-4" />
                              <span className="hidden sm:inline">Send</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Selection sheet */}
      <Sheet open={isCartOpen} onOpenChange={(open) => updateCartOpen(open, 'sheet')}>
        <SheetContent side="right" className="w-full sm:max-w-md lg:max-w-lg p-0">
          <PackSelectionSidebar
            selectedEmojis={packBrowser.selectedEmojis}
            maxSelection={20}
            nameStatuses={packBrowser.nameStatuses}
            editingName={packBrowser.editingName}
            editingValue={packBrowser.editingValue}
            onSetEditingName={packBrowser.setEditingName}
            onSetEditingValue={packBrowser.setEditingValue}
            onSaveCustomName={packBrowser.saveCustomName}
            customNames={packBrowser.customNames}
            onRemove={(emoji) => {
              const remainingCount = Math.max(packBrowser.selectedEmojis.length - 1, 0)
              packBrowser.removeFromSelection(emoji)
              track('Emoji Creator: Selection Item Removed', {
                id: emoji.id,
                name: emoji.name,
                remainingCount,
              })
            }}
            onClear={() => {
              const previousCount = packBrowser.selectedEmojis.length
              setDownloadProgress(null)
              setUploadProgress(null)
              packBrowser.clearSelection()
              track('Emoji Creator: Selection Cleared', {
                previousCount,
              })
            }}
            hasSlackConnection={hasSlack}
            downloadProgress={downloadProgress}
            uploadProgress={uploadProgress}
            onDownload={async () => {
              updateCartOpen(false, 'sheet-action')
              await handlePackDownload()
            }}
            onSendToSlack={async () => {
              updateCartOpen(false, 'sheet-action')
              await handleSendToSlack()
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <CreatePageModals emojiData={emojiData} onProcessFiles={processFiles} />
    </>
  )
}

// Main page wrapper with provider
export default function EmojiCreatorPageWrapper() {
  return (
    <CreatePageProvider>
      <EmojiCreatorContent />
    </CreatePageProvider>
  )
}
