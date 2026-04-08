"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Loader2 } from "lucide-react"
import { getWorkspaceDisplayName } from "@/lib/utils/workspace"
import { useMyEmojisState } from "./hooks/use-my-emojis-state"
import { EmojiActionDialogs } from "./components/emoji-action-dialogs"
import { EmojiTableView } from "./components/emoji-table-view"
import { EmojiGridView } from "./components/emoji-grid-view"
import { MobileEmojiList } from "./components/mobile-emoji-list"
import { DesktopToolbar, MobileToolbar, StatsDashboard, FilterBar, FilterOptions } from "./components/my-emojis-toolbar"
import { BulkOperationsBar } from "./components/bulk-operations-bar"

function MyEmojisPage() {
  const state = useMyEmojisState()

  // Show loading while checking authentication
  if (state.isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!state.isClient) return null

  // Return null if no real data
  if (!state.hasRealData) {
    return null
  }

  return (
    <TooltipProvider>
    <>
      <div className={`flex flex-col ${state.isMobile ? 'pt-4' : 'gap-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6'}`}>
        <div className={state.isMobile ? '' : 'px-2 sm:px-4 lg:px-6'}>
          {state.isMobile ? (
            // Mobile: No Card wrapper
            <>
              <MobileToolbar
                searchQuery={state.searchQuery}
                setSearchQuery={state.setSearchQuery}
                viewMode={state.viewMode}
                setViewMode={state.setViewMode}
                isRefreshing={state.isRefreshing}
                refreshEmojiData={state.refreshEmojiData}
                myEmojisCount={state.myEmojis.length}
              />
              {/* Mobile Content */}
              <div>
                <MobileEmojiList
                  sortedEmojis={state.sortedEmojis}
                  loading={state.loading}
                  isRefreshing={state.isRefreshing}
                  searchQuery={state.searchQuery}
                  hasRealData={state.hasRealData}
                  viewMode={state.viewMode}
                  getAliasesForEmoji={state.getAliasesForEmoji}
                  setSelectedEmoji={state.setSelectedEmoji}
                  setIsActionsDrawerOpen={state.setIsActionsDrawerOpen}
                />
              </div>
            </>
          ) : (
            // Desktop: With Card wrapper
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                    My Emojis {state.myEmojis.length > 0 && <span className="text-muted-foreground font-normal">({state.myEmojis.length})</span>}
                  </CardTitle>                    <CardDescription>
                      {state.hasRealData
                        ? `Manage the emojis you've created in ${getWorkspaceDisplayName(state.workspaceDisplayName, state.workspace)}`
                        : "Connect to Slack to see and manage your emojis"
                      }
                    </CardDescription>
                  </div>
                  <DesktopToolbar
                    searchQuery={state.searchQuery}
                    setSearchQuery={state.setSearchQuery}
                    searchInputRef={state.searchInputRef}
                    viewMode={state.viewMode}
                    setViewMode={state.setViewMode}
                    isRefreshing={state.isRefreshing}
                    refreshEmojiData={state.refreshEmojiData}
                    setShowKeyboardHelp={state.setShowKeyboardHelp}
                  />
                </div>
              </CardHeader>

              {/* Statistics Dashboard */}
              <StatsDashboard stats={state.stats} />

              {/* Filters and Bulk Actions Bar */}
              <div className="px-6 py-3 border-b bg-background flex flex-wrap items-center gap-3">
                <FilterBar
                  showFilters={state.showFilters}
                  setShowFilters={state.setShowFilters}
                  filterType={state.filterType}
                  setFilterType={state.setFilterType}
                  filterHasAliases={state.filterHasAliases}
                  setFilterHasAliases={state.setFilterHasAliases}
                />
                <BulkOperationsBar
                  selectedEmojiNames={state.selectedEmojiNames}
                  sortedEmojisCount={state.sortedEmojis.length}
                  handleBulkDownload={state.handleBulkDownload}
                  handleBulkCopyNames={state.handleBulkCopyNames}
                  handleBulkCopyUrls={state.handleBulkCopyUrls}
                  handleBulkDelete={state.handleBulkDelete}
                  clearSelection={state.clearSelection}
                  selectAllEmojis={state.selectAllEmojis}
                />
              </div>

              {/* Filter Options */}
              <FilterOptions
                showFilters={state.showFilters}
                filterType={state.filterType}
                setFilterType={state.setFilterType}
                filterHasAliases={state.filterHasAliases}
                setFilterHasAliases={state.setFilterHasAliases}
              />

              <CardContent className="pt-6">
                {state.viewMode === "table" ? (
                  <EmojiTableView
                    sortedEmojis={state.sortedEmojis}
                    loading={state.loading}
                    isRefreshing={state.isRefreshing}
                    searchQuery={state.searchQuery}
                    hasRealData={state.hasRealData}
                    sortColumn={state.sortColumn}
                    sortDirection={state.sortDirection}
                    handleSort={state.handleSort}
                    selectedEmojiNames={state.selectedEmojiNames}
                    toggleEmojiSelection={state.toggleEmojiSelection}
                    selectAllEmojis={state.selectAllEmojis}
                    clearSelection={state.clearSelection}
                    getAliasesForEmoji={state.getAliasesForEmoji}
                    copyEmojiName={state.copyEmojiName}
                    copyEmojiUrl={state.copyEmojiUrl}
                    copyEmojiMarkdown={state.copyEmojiMarkdown}
                    copyImageToClipboard={state.copyImageToClipboard}
                    handleRename={state.handleRename}
                    handleReplace={state.handleReplace}
                    handleAddAlias={state.handleAddAlias}
                    handleDelete={state.handleDelete}
                  />
                ) : (
                  <EmojiGridView
                    sortedEmojis={state.sortedEmojis}
                    loading={state.loading}
                    isRefreshing={state.isRefreshing}
                    searchQuery={state.searchQuery}
                    hasRealData={state.hasRealData}
                    isMobile={state.isMobile}
                    selectedEmojiNames={state.selectedEmojiNames}
                    toggleEmojiSelection={state.toggleEmojiSelection}
                    getAliasesForEmoji={state.getAliasesForEmoji}
                    copyEmojiName={state.copyEmojiName}
                    copyEmojiUrl={state.copyEmojiUrl}
                    copyImageToClipboard={state.copyImageToClipboard}
                    handleRename={state.handleRename}
                    handleDelete={state.handleDelete}
                    setSelectedEmoji={state.setSelectedEmoji}
                    setIsActionsDrawerOpen={state.setIsActionsDrawerOpen}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* All Dialogs */}
      <EmojiActionDialogs
        isMobile={state.isMobile}
        selectedEmoji={state.selectedEmoji}
        isRenameDialogOpen={state.isRenameDialogOpen}
        setIsRenameDialogOpen={state.setIsRenameDialogOpen}
        newName={state.newName}
        setNewName={state.setNewName}
        isRenamingEmoji={state.isRenamingEmoji}
        performRename={state.performRename}
        isReplaceDialogOpen={state.isReplaceDialogOpen}
        setIsReplaceDialogOpen={state.setIsReplaceDialogOpen}
        fileInputRef={state.fileInputRef}
        handleFileSelect={state.handleFileSelect}
        processedEmoji={state.processedEmoji}
        setProcessedEmoji={state.setProcessedEmoji}
        selectedFile={state.selectedFile}
        setSelectedFile={state.setSelectedFile}
        performReplace={state.performReplace}
        isAliasDialogOpen={state.isAliasDialogOpen}
        setIsAliasDialogOpen={state.setIsAliasDialogOpen}
        newAlias={state.newAlias}
        setNewAlias={state.setNewAlias}
        isAddingAlias={state.isAddingAlias}
        performAddAlias={state.performAddAlias}
        getAliasesForEmoji={state.getAliasesForEmoji}
        isDeleteDialogOpen={state.isDeleteDialogOpen}
        setIsDeleteDialogOpen={state.setIsDeleteDialogOpen}
        isDeletingEmoji={state.isDeletingEmoji}
        performDelete={state.performDelete}
        isProcessing={state.isProcessing}
        processingFiles={state.processingFiles}
        currentFileIndex={state.currentFileIndex}
        currentStep={state.currentStep}
        setCurrentStep={state.setCurrentStep}
        processingError={state.processingError}
        setProcessingError={state.setProcessingError}
        setIsProcessing={state.setIsProcessing}
        isActionsDrawerOpen={state.isActionsDrawerOpen}
        setIsActionsDrawerOpen={state.setIsActionsDrawerOpen}
        handleRename={state.handleRename}
        handleReplace={state.handleReplace}
        handleAddAlias={state.handleAddAlias}
        handleDelete={state.handleDelete}
        showKeyboardHelp={state.showKeyboardHelp}
        setShowKeyboardHelp={state.setShowKeyboardHelp}
      />
    </>
    </TooltipProvider>
  )
}

export default function MyEmojisPageWrapper() {
  return <MyEmojisPage />
}
