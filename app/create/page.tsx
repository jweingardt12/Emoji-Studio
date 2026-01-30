"use client"

import { useState, useEffect, useCallback, Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Grid3x3, List, Upload, Sparkles } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
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

// Main page content component
function EmojiCreatorContent() {
  const { loading, emojiData } = useEmojiData()
  const isMobile = useIsMobile()
  const track = useTrack()
  const { toast } = useToast()

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
    toast: (props) => toast(props),
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

    const progressToast = toast({
      title: "Creating zip file...",
      description: `Starting download...`,
      duration: Infinity,
    })

    const updateProgressToast = (message: string) => {
      progressToast.update({
        id: progressToast.id,
        title: "Creating zip file...",
        description: message,
        duration: Infinity,
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
      progressToast.dismiss()
      setDownloadProgress(null)
      toast({
        title: "Download failed",
        description: "Could not download any emojis",
        variant: "destructive",
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

      progressToast.dismiss()
      setDownloadProgress(null)
      packBrowser.clearSelectionsAndStorage()

      toast({
        title: "Download complete",
        description: `Downloaded ${completed} emoji${completed > 1 ? 's' : ''} as zip file`,
      })
    } catch (error) {
      console.error('Failed to create zip:', error)
      progressToast.dismiss()
      setDownloadProgress(null)
      toast({
        title: "Failed to create zip",
        description: "Could not create zip file",
        variant: "destructive",
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

    const uploadToast = toast({
      title: "Uploading to Slack...",
      description: `0/${total} (0%)`,
      duration: Infinity,
    })

    const updateUploadToast = (message: string) => {
      uploadToast.update({
        id: uploadToast.id,
        title: "Uploading to Slack...",
        description: message,
        duration: Infinity,
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

    uploadToast.dismiss()
    setUploadProgress((prev) => (prev ? { ...prev, stage: "complete" } : prev))

    if (successCount > 0) {
      packBrowser.clearSelectionsAndStorage()
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${successCount} emoji${successCount > 1 ? 's' : ''} to Slack${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
        duration: 8000,
      })
    }

    if (failedCount > 0) {
      console.error('Upload errors:', errors)
      toast({
        title: `${failedCount} upload${failedCount > 1 ? 's' : ''} failed`,
        description: errors[0] || 'Unknown error',
        variant: "destructive",
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
          {/* Extension Banner */}
          <ExtensionBanner hasSlack={hasSlack} loading={loading} />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl bg-card border border-border shadow">
            <Tabs value={activeTab} className="flex flex-col flex-1 min-h-0">
              {/* Tab Header */}
              <div className="flex-none border-b px-4 pt-4">
                <div className="flex items-center justify-between gap-4 pb-4">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      <span>Create Emojis</span>
                    </h1>
                    {/* Pill-style tabs with animated indicator */}
                    <div className="flex p-1 bg-muted/50 rounded-xl">
                      {[
                        { id: "upload", label: "Upload", icon: Upload },
                        { id: "browse", label: "Browse Packs", icon: Grid3x3 },
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
                              "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              isSelected
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="createPageActiveTab"
                                className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {tab.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Mobile cart button */}
                  {activeTab === "browse" && packBrowser.selectedEmojis.length > 0 && (
                    <Button
                      onClick={() => updateCartOpen(true, 'toolbar')}
                      className="relative h-9 w-9 rounded-xl border border-border/60 bg-card/95 shadow-sm lg:hidden"
                      size="icon"
                      variant="ghost"
                    >
                      <span className="text-sm font-semibold">{packBrowser.selectedEmojis.length}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload Tab Content */}
              <TabsContent value="upload" className="flex-1 min-h-0 m-0 p-4">
                <FileUploadZone onProcessFiles={processFiles} />
              </TabsContent>

              {/* Browse Packs Tab Content */}
              <TabsContent value="browse" className="flex-1 min-h-0 m-0">
                <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_min(360px,30vw)] lg:auto-rows-[minmax(0,1fr)] gap-4 min-w-0 min-h-0 h-full p-4">
                  <Card className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    <CardHeader className="flex-none pb-3">
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search emoji packs..."
                            value={packBrowser.searchQuery}
                            onChange={(e) => packBrowser.setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
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
                      <div className="mt-4">
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
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden pt-2 min-h-0">
                      <ScrollArea className="h-full">
                        <PackEmojiGrid
                          emojis={packBrowser.currentEmojis}
                          loading={packBrowser.loading}
                          viewMode={packBrowser.viewMode}
                          selectedIds={packBrowser.selectedIds}
                          onToggleSelection={packBrowser.toggleSelection}
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Desktop sidebar */}
                  <div className="hidden lg:flex lg:flex-col lg:min-h-0 lg:h-full">
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
                      onDownload={handlePackDownload}
                      onSendToSlack={handleSendToSlack}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Mobile selection sheet */}
      <Sheet open={isCartOpen} onOpenChange={(open) => updateCartOpen(open, 'sheet')}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
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
