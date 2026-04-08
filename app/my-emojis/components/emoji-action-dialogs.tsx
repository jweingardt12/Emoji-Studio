"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Edit2, ImageUp, Trash2, LetterText, Loader2 } from "lucide-react"
import Image from "next/image"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { EmojiProcessingModal } from "@/components/emoji-processing-modal"
import type { MyEmoji } from "../hooks/use-my-emojis-state"

interface EmojiActionDialogsProps {
  isMobile: boolean | null
  selectedEmoji: MyEmoji | null

  // Rename dialog
  isRenameDialogOpen: boolean
  setIsRenameDialogOpen: (open: boolean) => void
  newName: string
  setNewName: (name: string) => void
  isRenamingEmoji: boolean
  performRename: () => void

  // Replace dialog
  isReplaceDialogOpen: boolean
  setIsReplaceDialogOpen: (open: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  processedEmoji: ProcessedEmoji | null
  setProcessedEmoji: (emoji: ProcessedEmoji | null) => void
  selectedFile: File | null
  setSelectedFile: (file: File | null) => void
  performReplace: () => void

  // Alias dialog
  isAliasDialogOpen: boolean
  setIsAliasDialogOpen: (open: boolean) => void
  newAlias: string
  setNewAlias: (alias: string) => void
  isAddingAlias: boolean
  performAddAlias: () => void
  getAliasesForEmoji: (emojiName: string) => string[]

  // Delete dialog
  isDeleteDialogOpen: boolean
  setIsDeleteDialogOpen: (open: boolean) => void
  isDeletingEmoji: boolean
  performDelete: () => void

  // Processing modal
  isProcessing: boolean
  processingFiles: File[]
  currentFileIndex: number
  currentStep: string
  setCurrentStep: (step: string) => void
  processingError: string
  setProcessingError: (error: string) => void
  setIsProcessing: (processing: boolean) => void

  // Mobile actions drawer
  isActionsDrawerOpen: boolean
  setIsActionsDrawerOpen: (open: boolean) => void
  handleRename: (emoji: MyEmoji) => void
  handleReplace: (emoji: MyEmoji) => void
  handleAddAlias: (emoji: MyEmoji) => void
  handleDelete: (emoji: MyEmoji) => void

  // Keyboard shortcuts
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (show: boolean) => void
}

export function EmojiActionDialogs({
  isMobile,
  selectedEmoji,
  isRenameDialogOpen,
  setIsRenameDialogOpen,
  newName,
  setNewName,
  isRenamingEmoji,
  performRename,
  isReplaceDialogOpen,
  setIsReplaceDialogOpen,
  fileInputRef,
  handleFileSelect,
  processedEmoji,
  setProcessedEmoji,
  selectedFile,
  setSelectedFile,
  performReplace,
  isAliasDialogOpen,
  setIsAliasDialogOpen,
  newAlias,
  setNewAlias,
  isAddingAlias,
  performAddAlias,
  getAliasesForEmoji,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isDeletingEmoji,
  performDelete,
  isProcessing,
  processingFiles,
  currentFileIndex,
  currentStep,
  setCurrentStep,
  processingError,
  setProcessingError,
  setIsProcessing,
  isActionsDrawerOpen,
  setIsActionsDrawerOpen,
  handleRename,
  handleReplace,
  handleAddAlias,
  handleDelete,
  showKeyboardHelp,
  setShowKeyboardHelp,
}: EmojiActionDialogsProps) {
  return (
    <>
      {/* Rename Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Rename Emoji</DrawerTitle>
              <DrawerDescription>
                Enter a new name for :{selectedEmoji?.name}:
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <div className="grid gap-2">
                <Label htmlFor="new-name-mobile">New name</Label>
                <Input
                  id="new-name-mobile"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new emoji name"
                />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={performRename} disabled={!newName || newName === selectedEmoji?.name || isRenamingEmoji}>
                {isRenamingEmoji ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)} disabled={isRenamingEmoji}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Emoji</DialogTitle>
              <DialogDescription>
                Enter a new name for :{selectedEmoji?.name}:
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-name">New name</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new emoji name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)} disabled={isRenamingEmoji}>
                Cancel
              </Button>
              <Button onClick={performRename} disabled={!newName || newName === selectedEmoji?.name || isRenamingEmoji}>
                {isRenamingEmoji ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Replace Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Replace Emoji</DrawerTitle>
              <DrawerDescription>
                Upload a new image for :{selectedEmoji?.name}:
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="replace-file-mobile">New image</Label>
                <Input
                  ref={fileInputRef}
                  id="replace-file-mobile"
                  type="file"
                  accept="image/*,video/*,.gif"
                  onChange={handleFileSelect}
                />
              </div>
              {processedEmoji && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="relative h-16 w-16">
                    <Image
                      src={processedEmoji.blob}
                      alt={processedEmoji.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{processedEmoji.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(processedEmoji.processedSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DrawerFooter>
              <Button onClick={performReplace} disabled={!processedEmoji}>
                Replace
              </Button>
              <Button variant="outline" onClick={() => {
                setIsReplaceDialogOpen(false)
                setProcessedEmoji(null)
                setSelectedFile(null)
              }}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace Emoji</DialogTitle>
              <DialogDescription>
                Upload a new image for :{selectedEmoji?.name}:
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="replace-file">New image</Label>
                <Input
                  ref={fileInputRef}
                  id="replace-file"
                  type="file"
                  accept="image/*,video/*,.gif"
                  onChange={handleFileSelect}
                />
              </div>
              {processedEmoji && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="relative h-16 w-16">
                    <Image
                      src={processedEmoji.blob}
                      alt={processedEmoji.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{processedEmoji.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(processedEmoji.processedSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsReplaceDialogOpen(false)
                setProcessedEmoji(null)
                setSelectedFile(null)
              }}>
                Cancel
              </Button>
              <Button onClick={performReplace} disabled={!processedEmoji}>
                Replace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Alias Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={isAliasDialogOpen} onOpenChange={setIsAliasDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add Alias</DrawerTitle>
              <DrawerDescription>
                Add an alias for :{selectedEmoji?.name}:
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-alias-mobile">Alias name</Label>
                <Input
                  id="new-alias-mobile"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Enter alias name"
                />
              </div>
              {selectedEmoji && (() => {
                const existingAliases = getAliasesForEmoji(selectedEmoji.name)
                if (existingAliases.length > 0) {
                  return (
                    <div className="grid gap-2">
                      <Label>Existing aliases</Label>
                      <div className="flex flex-wrap gap-2">
                        {existingAliases.map(alias => (
                          <Badge key={alias} variant="secondary">
                            :{alias}:
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <DrawerFooter>
              <Button onClick={performAddAlias} disabled={!newAlias || isAddingAlias}>
                {isAddingAlias ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Alias"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsAliasDialogOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isAliasDialogOpen} onOpenChange={setIsAliasDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Alias</DialogTitle>
              <DialogDescription>
                Add an alias for :{selectedEmoji?.name}:
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-alias">Alias name</Label>
                <Input
                  id="new-alias"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Enter alias name"
                />
              </div>
              {selectedEmoji && (() => {
                const existingAliases = getAliasesForEmoji(selectedEmoji.name)
                if (existingAliases.length > 0) {
                  return (
                    <div className="grid gap-2">
                      <Label>Existing aliases</Label>
                      <div className="flex flex-wrap gap-2">
                        {existingAliases.map(alias => (
                          <Badge key={alias} variant="secondary">
                            :{alias}:
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAliasDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={performAddAlias} disabled={!newAlias || isAddingAlias}>
                {isAddingAlias ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Alias"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Emoji</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete :{selectedEmoji?.name}:? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingEmoji}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => performDelete()}
              disabled={isDeletingEmoji}
            >
              {isDeletingEmoji ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing Modal */}
      <EmojiProcessingModal
        isOpen={isProcessing && !processedEmoji}
        files={processingFiles}
        processedEmojis={processedEmoji ? [processedEmoji] : []}
        currentFileIndex={currentFileIndex}
        currentStep={currentStep}
        error={processingError}
        onClose={() => {
          setIsProcessing(false)
          setCurrentStep('')
          setProcessingError('')
          setSelectedFile(null)
        }}
        onDownload={() => {}}
        onDownloadAll={() => {}}
        onUpdateName={() => {}}
      />

      {/* Mobile Actions Drawer */}
      {isMobile && (
        <Drawer open={isActionsDrawerOpen} onOpenChange={setIsActionsDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Emoji Actions</DrawerTitle>
              <DrawerDescription>
                Choose an action for :{selectedEmoji?.name}:
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={() => {
                  setIsActionsDrawerOpen(false)
                  handleRename(selectedEmoji!)
                }}
                disabled={selectedEmoji?.is_alias === 1}
              >
                <Edit2 className="h-5 w-5 mr-3" />
                <span className="text-base">Rename</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={() => {
                  setIsActionsDrawerOpen(false)
                  handleReplace(selectedEmoji!)
                }}
              >
                <ImageUp className="h-5 w-5 mr-3" />
                <span className="text-base">Replace Image</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={() => {
                  setIsActionsDrawerOpen(false)
                  handleAddAlias(selectedEmoji!)
                }}
              >
                <LetterText className="h-5 w-5 mr-3" />
                <span className="text-base">Add Alias</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-destructive hover:text-destructive"
                onClick={() => {
                  setIsActionsDrawerOpen(false)
                  handleDelete(selectedEmoji!)
                }}
              >
                <Trash2 className="h-5 w-5 mr-3" />
                <span className="text-base">Delete</span>
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Focus search</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">{"\u2318"}K</kbd>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Select all / Deselect all</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">{"\u2318"}A</kbd>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Toggle filters</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">F</kbd>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Clear selection</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Esc</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Show this help</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">{"\u2318"}/</kbd>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyboardHelp(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
