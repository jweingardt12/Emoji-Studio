"use client"

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from "react"
import type { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { useTrack } from "@/lib/hooks/use-track"

// Types
export interface DownloadProgress {
  stage: "downloading" | "finalizing"
  completed: number
  total: number
}

export interface UploadProgress {
  completed: number
  failed: number
  total: number
  stage: "uploading" | "complete"
}

interface CreatePageContextType {
  // File state
  selectedFiles: File[]
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>
  processingFiles: File[]
  setProcessingFiles: React.Dispatch<React.SetStateAction<File[]>>

  // Processing state
  processedEmojis: ProcessedEmoji[]
  setProcessedEmojis: React.Dispatch<React.SetStateAction<ProcessedEmoji[]>>
  isProcessing: boolean
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
  currentFileIndex: number
  setCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>
  currentStep: string
  setCurrentStep: React.Dispatch<React.SetStateAction<string>>
  processingError: string
  setProcessingError: React.Dispatch<React.SetStateAction<string>>

  // UI state
  isDragging: boolean
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  activeTab: "upload" | "browse"
  setActiveTab: React.Dispatch<React.SetStateAction<"upload" | "browse">>
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>

  // Editor state
  editingEmoji: ProcessedEmoji | null
  setEditingEmoji: React.Dispatch<React.SetStateAction<ProcessedEmoji | null>>
  editingEmojiIndex: number
  setEditingEmojiIndex: React.Dispatch<React.SetStateAction<number>>
  gifToEdit: File | null
  setGifToEdit: React.Dispatch<React.SetStateAction<File | null>>
  showGifEditor: boolean
  setShowGifEditor: React.Dispatch<React.SetStateAction<boolean>>
  isReEditingFromModal: boolean
  setIsReEditingFromModal: React.Dispatch<React.SetStateAction<boolean>>

  // Mobile state
  pendingMobileFile: File | null
  setPendingMobileFile: React.Dispatch<React.SetStateAction<File | null>>

  // Extension state
  extensionBannerDismissed: boolean
  setExtensionBannerDismissed: React.Dispatch<React.SetStateAction<boolean>>

  // Progress state
  downloadProgress: DownloadProgress | null
  setDownloadProgress: React.Dispatch<React.SetStateAction<DownloadProgress | null>>
  uploadProgress: UploadProgress | null
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress | null>>

  // Failed frame extraction tracking
  failedFrameExtraction: Set<string>
  setFailedFrameExtraction: React.Dispatch<React.SetStateAction<Set<string>>>

  // Connection state
  hasSlack: boolean
  setHasSlack: React.Dispatch<React.SetStateAction<boolean>>

  // Refs
  desktopLayoutRef: React.MutableRefObject<HTMLDivElement | null>
  availableLayoutHeight: number | null
  setAvailableLayoutHeight: React.Dispatch<React.SetStateAction<number | null>>
  lastTrackedSearchQuery: React.MutableRefObject<string>

  // Utilities
  track: ReturnType<typeof useTrack>

  // Actions
  updateCartOpen: (open: boolean, source: 'toolbar' | 'sheet' | 'sheet-action') => void
  handleDismissExtensionBanner: () => void
}

const CreatePageContext = createContext<CreatePageContextType | undefined>(undefined)

interface CreatePageProviderProps {
  children: ReactNode
}

export function CreatePageProvider({ children }: CreatePageProviderProps) {
  const track = useTrack()

  // File state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [processingFiles, setProcessingFiles] = useState<File[]>([])

  // Processing state
  const [processedEmojis, setProcessedEmojis] = useState<ProcessedEmoji[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [processingError, setProcessingError] = useState<string>("")

  // UI state
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<"upload" | "browse">("browse")
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Editor state
  const [editingEmoji, setEditingEmoji] = useState<ProcessedEmoji | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number>(-1)
  const [gifToEdit, setGifToEdit] = useState<File | null>(null)
  const [showGifEditor, setShowGifEditor] = useState(false)
  const [isReEditingFromModal, setIsReEditingFromModal] = useState(false)

  // Mobile state
  const [pendingMobileFile, setPendingMobileFile] = useState<File | null>(null)

  // Extension state
  const [extensionBannerDismissed, setExtensionBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('extensionBannerDismissed') === 'true'
    }
    return false
  })

  // Progress state
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  // Failed frame extraction tracking
  const [failedFrameExtraction, setFailedFrameExtraction] = useState<Set<string>>(new Set())

  // Connection state
  const [hasSlack, setHasSlack] = useState(false)

  // Refs
  const desktopLayoutRef = useRef<HTMLDivElement | null>(null)
  const [availableLayoutHeight, setAvailableLayoutHeight] = useState<number | null>(null)
  const lastTrackedSearchQuery = useRef<string>("")

  // Actions - using useCallback with functional setState for stable references
  const updateCartOpen = useCallback(
    (open: boolean, source: 'toolbar' | 'sheet' | 'sheet-action') => {
      setIsCartOpen(open)
      // Track is called outside of render, no need for dependency
    },
    []
  )

  const handleDismissExtensionBanner = useCallback(() => {
    setExtensionBannerDismissed(true)
    localStorage.setItem('extensionBannerDismissed', 'true')
    track('Emoji Creator: Extension Banner Dismissed', {})
  }, [track])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<CreatePageContextType>(() => ({
    // File state
    selectedFiles,
    setSelectedFiles,
    processingFiles,
    setProcessingFiles,

    // Processing state
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

    // UI state
    isDragging,
    setIsDragging,
    activeTab,
    setActiveTab,
    isCartOpen,
    setIsCartOpen,

    // Editor state
    editingEmoji,
    setEditingEmoji,
    editingEmojiIndex,
    setEditingEmojiIndex,
    gifToEdit,
    setGifToEdit,
    showGifEditor,
    setShowGifEditor,
    isReEditingFromModal,
    setIsReEditingFromModal,

    // Mobile state
    pendingMobileFile,
    setPendingMobileFile,

    // Extension state
    extensionBannerDismissed,
    setExtensionBannerDismissed,

    // Progress state
    downloadProgress,
    setDownloadProgress,
    uploadProgress,
    setUploadProgress,

    // Failed frame extraction tracking
    failedFrameExtraction,
    setFailedFrameExtraction,

    // Connection state
    hasSlack,
    setHasSlack,

    // Refs
    desktopLayoutRef,
    availableLayoutHeight,
    setAvailableLayoutHeight,
    lastTrackedSearchQuery,

    // Utilities
    track,

    // Actions
    updateCartOpen,
    handleDismissExtensionBanner,
  }), [
    selectedFiles,
    processingFiles,
    processedEmojis,
    isProcessing,
    currentFileIndex,
    currentStep,
    processingError,
    isDragging,
    activeTab,
    isCartOpen,
    editingEmoji,
    editingEmojiIndex,
    gifToEdit,
    showGifEditor,
    isReEditingFromModal,
    pendingMobileFile,
    extensionBannerDismissed,
    downloadProgress,
    uploadProgress,
    failedFrameExtraction,
    hasSlack,
    availableLayoutHeight,
    track,
    updateCartOpen,
    handleDismissExtensionBanner,
  ])

  return (
    <CreatePageContext.Provider value={value}>
      {children}
    </CreatePageContext.Provider>
  )
}

export function useCreatePageContext() {
  const context = useContext(CreatePageContext)
  if (context === undefined) {
    throw new Error("useCreatePageContext must be used within a CreatePageProvider")
  }
  return context
}
