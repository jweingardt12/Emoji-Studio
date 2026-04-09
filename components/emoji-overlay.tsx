"use client"
import { X, Download, Info, Link, Search, ArrowLeft } from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { format } from "date-fns"
import type { Emoji } from "@/lib/services/emoji-service"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useAnalytics } from "@/lib/analytics"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useIsMobile } from "@/hooks/use-mobile"

// Component to display similar emojis in a table
interface SimilarEmojisTableProps {
  currentEmoji: Emoji | null
  allEmojis: Emoji[] | undefined
  onEmojiClick?: (emoji: Emoji) => void
  onUserClick?: (userId: string, userName: string) => void
  isMobile?: boolean
}

function SimilarEmojisTable({ currentEmoji, allEmojis, onEmojiClick, onUserClick, isMobile }: SimilarEmojisTableProps) {
  // Find similar emojis based on name matching
  const similarEmojis = useMemo(() => {
    if (!currentEmoji || !allEmojis || !Array.isArray(allEmojis) || allEmojis.length === 0) return []

    // Filter out aliases and the current emoji
    const filteredEmojis = allEmojis.filter(
      (e) =>
        e &&
        e.name &&
        e.name !== currentEmoji.name && // Not the current emoji
        !e.is_alias && // Not an alias
        e.name.length > 0, // Has a name
    )

    // Get main category/theme words from current emoji
    const currentName = currentEmoji.name.toLowerCase()

    // Common emoji themes/categories to check for
    const emojiThemes = [
      // Animals
      "cat",
      "dog",
      "bear",
      "fox",
      "wolf",
      "lion",
      "tiger",
      "monkey",
      "panda",
      "koala",
      // Expressions
      "smile",
      "laugh",
      "cry",
      "sad",
      "angry",
      "happy",
      "joy",
      "love",
      "heart",
      // Actions
      "dance",
      "run",
      "jump",
      "hug",
      "wave",
      "clap",
      "point",
      "shake",
      // Objects
      "fire",
      "water",
      "earth",
      "air",
      "star",
      "moon",
      "sun",
      // Food
      "pizza",
      "burger",
      "taco",
      "coffee",
      "beer",
      "wine",
      "cake",
      // Tech
      "computer",
      "phone",
      "code",
      "bug",
      "robot",
      // Memes
      "deal",
      "with",
      "it",
      "cool",
      "wow",
      "omg",
      "lol",
      "wtf",
      "why",
    ]

    // Extract meaningful words from the current emoji name
    const currentWords = currentEmoji.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ") // Replace non-alphanumeric with spaces
      .split(/\s+/) // Split by whitespace
      .filter((word) => word.length > 2) // Only consider words with 3+ chars

    // Find theme words in the current emoji
    const themeWords = currentWords.filter((word) =>
      // Check if this word is a known theme or contains a known theme
      emojiThemes.some((theme) => word.includes(theme) || theme.includes(word)),
    )

    // If no theme words found, use all words from the emoji name
    const searchWords = themeWords.length > 0 ? themeWords : currentWords

    // Calculate similarity scores
    const withScores = filteredEmojis.map((emoji) => {
      const emojiName = emoji.name.toLowerCase()
      const emojiWords = emojiName
        .replace(/[^a-z0-9]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2)

      // Exact word matches (highest score)
      const exactMatches = searchWords.filter((word) => emojiWords.includes(word)).length * 3

      // Partial word matches (medium score)
      const partialMatches =
        searchWords.filter(
          (word) =>
            !emojiWords.includes(word) && // Not an exact match
            (emojiWords.some((w) => w.includes(word) && w.length > 3) || // Word is part of emoji word
              emojiWords.some((w) => word.includes(w) && w.length > 3)), // Emoji word is part of word
        ).length * 2

      // Theme matches (lower score but still relevant)
      const themeMatches = themeWords.filter((theme) => emojiName.includes(theme)).length

      // Calculate final score
      const score = exactMatches + partialMatches + themeMatches

      return { emoji, score }
    })

    // Only include emojis with a meaningful score
    return withScores
      .filter((item) => item.score >= 2) // Require at least a decent match
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.emoji)
  }, [currentEmoji, allEmojis])

  if (similarEmojis.length === 0) {
    return <div className="text-sm text-muted-foreground py-2">No similar emojis found</div>
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {similarEmojis.map((emoji) => (
          <div
            key={emoji.name}
            className={`flex items-center gap-3 p-3 bg-muted/40 rounded-lg ${onEmojiClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
            onClick={() => onEmojiClick && onEmojiClick(emoji)}
          >
            <img
              src={emoji.url || "/placeholder.svg"}
              alt={`:${emoji.name}:`}
              className="h-10 w-10 object-contain flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium truncate">:{emoji.name}:</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {emoji.user_display_name && (
                  <span
                    className={onUserClick ? "cursor-pointer hover:text-primary" : ""}
                    onClick={(e) => {
                      if (onUserClick && emoji.user_id) {
                        e.stopPropagation()
                        onUserClick(emoji.user_id, emoji.user_display_name)
                      }
                    }}
                  >
                    {emoji.user_display_name.split(" ")[0]}
                  </span>
                )}
                <span>•</span>
                <span>{emoji.created ? format(new Date(emoji.created * 1000), "MMM d") : "Unknown"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Emoji</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {similarEmojis.map((emoji) => (
            <TableRow
              key={emoji.name}
              className={onEmojiClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onEmojiClick && onEmojiClick(emoji)}
            >
              <TableCell>
                <img
                  src={emoji.url || "/placeholder.svg"}
                  alt={`:${emoji.name}:`}
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
              </TableCell>
              <TableCell className="font-mono text-sm">:{emoji.name}:</TableCell>
              <TableCell>
                {emoji.user_display_name && (
                  <span
                    className={onUserClick ? "cursor-pointer hover:text-primary hover:underline" : ""}
                    onClick={(e) => {
                      if (onUserClick && emoji.user_id) {
                        e.stopPropagation() // Prevent triggering row click
                        onUserClick(emoji.user_id, emoji.user_display_name)
                      }
                    }}
                  >
                    {emoji.user_display_name.split(" ")[0]}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {emoji.created ? format(new Date(emoji.created * 1000), "MMM d, yyyy") : "Unknown"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface EmojiOverlayProps {
  emoji: Emoji | null
  onClose: () => void
  onEmojiClick?: (emoji: Emoji) => void
  onUserClick?: (userId: string, userName: string) => void
  parentRef?: React.RefObject<HTMLDivElement>
}

export default function EmojiOverlay({ emoji, onClose, onEmojiClick, onUserClick, parentRef }: EmojiOverlayProps) {
  const { emojiData } = useEmojiData()
  const analytics = useAnalytics()
  const isMobileRaw = useIsMobile()
  const isMobile = isMobileRaw ?? false // Convert null to false for component props
  const [isVisible, setIsVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Mount effect for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Animation effect - matching UserOverlay pattern
  useEffect(() => {
    if (emoji) {
      if (isMobile) {
        // For mobile, use drawer state
        setIsDrawerOpen(true)
        setImageError(false)
      } else {
        // For desktop, use the existing overlay logic
        const originalBodyOverflow = document.body.style.overflow
        const originalHtmlOverflow = document.documentElement.style.overflow
        const originalBodyPosition = document.body.style.position
        
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        
        // Prevent background scroll on main content area if parentRef is provided
        let parentOriginalOverflow = ""
        if (parentRef?.current) {
          parentOriginalOverflow = parentRef.current.style.overflow
          parentRef.current.style.overflow = "hidden"
        }
        
        // Set a tiny delay to ensure the component is mounted before animation starts
        setTimeout(() => {
          setIsVisible(true)
        }, 10)
        setImageError(false)
        
        // Cleanup: restore all scroll properties
        return () => {
          document.body.style.overflow = originalBodyOverflow
          document.documentElement.style.overflow = originalHtmlOverflow
          document.body.style.position = originalBodyPosition
          document.body.style.width = ''
          if (parentRef?.current) {
            parentRef.current.style.overflow = parentOriginalOverflow
          }
        }
      }

      // Track emoji view event
      if (emoji.name && emoji.user_display_name) {
        analytics.trackEmojiView(emoji.name, emoji.user_display_name)
      }
    } else {
      setIsVisible(false)
      setIsDrawerOpen(false)
      // Restore scroll when closing
      if (!isMobile) {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        if (parentRef?.current) parentRef.current.style.overflow = ""
      }
    }
  }, [emoji, analytics, parentRef, isMobile])
  
  // Handle drawer close - only trigger onClose if drawer was previously open
  const wasDrawerOpen = useRef(false)
  useEffect(() => {
    if (isMobile && emoji) {
      if (isDrawerOpen) {
        wasDrawerOpen.current = true
      } else if (wasDrawerOpen.current) {
        // Drawer was open and is now closed, trigger onClose
        onClose()
        wasDrawerOpen.current = false
      }
    }
  }, [isDrawerOpen, isMobile, emoji, onClose])

  // Handle overlay close with animation
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Match transition duration
  }
  
  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Get a placeholder image based on emoji name
  const getPlaceholderImage = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
  };

  // Copy emoji code to clipboard
  const copyEmojiCode = () => {
    if (emoji) {
      navigator.clipboard.writeText(`:${emoji.name}:`)
      // Track emoji copy event
      if (analytics) {
        analytics.trackEmojiCopy(emoji.name)
      }
    }
  }

  // Download emoji image
  const downloadEmoji = () => {
    if (emoji && !imageError) {
      const link = document.createElement("a")
      link.href = emoji.url
      link.download = `${emoji.name}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Track emoji download event
      if (analytics) {
        analytics.trackEmojiDownload(emoji.name)
      }
    }
  }

  if (!emoji) return null
  
  // For mobile, use Drawer component with drag-to-dismiss
  if (isMobile) {
    return (
      <Drawer open={isDrawerOpen} onOpenChange={(open) => {
        setIsDrawerOpen(open)
        if (!open) {
          onClose()
        }
      }}>
        <DrawerContent className="h-[95vh]">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border">
            <div className="flex items-center justify-between p-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  // Animate the drawer closing
                  const drawer = document.querySelector('[data-vaul-drawer]')
                  if (drawer) {
                    drawer.classList.add('animate-out')
                  }
                  setTimeout(() => {
                    setIsDrawerOpen(false)
                  }, 150)
                }} 
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
              <div className="flex-1 text-center">
                <span className="text-base font-semibold font-mono">:{emoji.name}:</span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </div>

          <div className="overflow-y-auto p-4 pb-20">
            <div className="grid grid-cols-1 gap-4">
              {/* Emoji Preview Card */}
              <div className="border border-border rounded-lg p-4">
                <div className="font-bold text-base mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-1 text-muted-foreground" />
                  Emoji Details
                </div>
                <div className="flex flex-col gap-6">
                  {/* Emoji Image and Actions */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-40 h-40 bg-primary/10 rounded-lg flex items-center justify-center">
                      {imageError ? (
                        <div className="flex h-full w-full items-center justify-center rounded bg-muted text-4xl">
                          {emoji.name.slice(0, 2)}
                        </div>
                      ) : (
                        <img
                          src={emoji.url || getPlaceholderImage(emoji.name)}
                          alt={`:${emoji.name}:`}
                          className="w-full h-full object-contain p-3"
                          onError={handleImageError}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    
                    {/* Buttons - Horizontal on mobile */}
                    <div className="flex flex-row gap-2 w-full">
                      {!imageError && (
                        <Button 
                          variant="outline" 
                          size="default"
                          onClick={downloadEmoji} 
                          className="flex-1 h-10"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="default"
                        onClick={copyEmojiCode} 
                        className="flex-1 h-10"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>

                  {/* Emoji Info */}
                  <div className="flex-grow space-y-3">
                    <div className="bg-primary/10 p-3 rounded-md">
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">NAME</div>
                      <div className="text-xl font-mono flex items-center gap-2">
                        :{emoji.name}:
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyEmojiCode}>
                              <Link className="h-3 w-3" />
                              <span className="sr-only">Copy emoji code</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy emoji code</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="bg-primary/10 p-3 rounded-md">
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">CREATED BY</div>
                      <div className="text-xl font-bold flex items-center gap-2">
                        {emoji.user_display_name && (
                          <span
                            className={onUserClick ? "cursor-pointer hover:text-primary hover:underline" : ""}
                            onClick={() => {
                              if (onUserClick && emoji.user_id) {
                                onUserClick(emoji.user_id, emoji.user_display_name)
                              }
                            }}
                          >
                            {emoji.user_display_name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-primary/10 p-3 rounded-md">
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">CREATED ON</div>
                      <div className="text-xl font-bold">
                        {emoji.created ? format(new Date(emoji.created * 1000), "MMM d, yyyy") : "Unknown date"}
                      </div>
                    </div>

                    {emoji.is_alias === 1 && emoji.alias_for && (
                      <div className="bg-primary/10 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground font-semibold tracking-widest">ALIAS FOR</div>
                        <div className="text-xl font-mono">:{emoji.alias_for}:</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Similar Emojis Table */}
              <div className="border border-border rounded-lg p-4">
                <div className="font-bold text-base mb-2 flex items-center">
                  <Search className="h-4 w-4 mr-1 text-muted-foreground" />
                  Similar Emojis
                </div>
                <SimilarEmojisTable
                  currentEmoji={emoji}
                  allEmojis={emojiData}
                  onEmojiClick={onEmojiClick}
                  onUserClick={onUserClick}
                  isMobile={isMobile}
                />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop overlay (existing code)
  const overlayContent = (
    <TooltipProvider>
      <div
        className={`fixed inset-0 z-[9999] transition-all duration-300 ease-out ${
          isMobile
            ? ""
            : "bg-black/50 backdrop-blur-sm flex items-center justify-center p-2"
        } ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={isMobile ? undefined : handleClose}
      >
        {/* Backdrop for mobile */}
        {isMobile && (
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleClose}
          />
        )}

        <div
          className={`bg-card border border-border shadow-lg w-full overflow-auto transition-all duration-300 ease-out ${
            isMobile
              ? "absolute bottom-0 left-0 right-0 h-[85vh] rounded-t-xl"
              : "rounded-xl max-w-5xl max-h-[70vh]"
          } ${
            isMobile
              ? isVisible ? "translate-y-0" : "translate-y-full"
              : isVisible ? "scale-100" : "scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky drag handle for mobile */}
          {isMobile && (
            <div className="sticky top-0 z-10 bg-card rounded-t-xl">
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="relative border-b border-border">
            {isMobile ? (
              <div className="flex items-center justify-between p-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClose} 
                  className="h-10 w-10"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back</span>
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-semibold font-mono">:{emoji.name}:</span>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
              </div>
            ) : (
              <>
                <div className="flex flex-row items-center gap-3 p-3 md:p-4 pb-2 mb-2">
                  <img src="/logo.png" alt="Emoji Dashboard Logo" width={32} height={32} className="h-8 w-8 rounded-lg shadow-md" />
                  <span className="text-lg font-semibold">Emoji Studio</span>
                  <span className="text-2xl font-light text-muted-foreground mx-2">|</span>
                  <span className="text-lg font-semibold font-mono">:{emoji.name}:</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="absolute top-3 right-3 z-10">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </>
            )}
          </div>

          <div className={isMobile ? "p-4 pb-20" : "p-3 md:p-4"}>
            <div className="grid grid-cols-1 gap-4">
              {/* Emoji Preview Card */}
              <div className={`border border-border rounded-lg ${isMobile ? "p-4" : "p-2 md:p-3"}`}>
                <div className={`font-bold ${isMobile ? "text-lg mb-3" : "text-base mb-2"} flex items-center`}>
                  <Info className={`${isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2"} text-muted-foreground`} />
                  Emoji Details
                </div>
                <div className={`flex ${isMobile ? "flex-col" : "flex-col md:flex-row"} gap-6`}>
                  {/* Left Column - Emoji Image and Actions */}
                  <div className="flex flex-col items-center gap-3">
                    <div className={`relative ${isMobile ? "w-40 h-40" : "w-32 h-32"} bg-primary/10 rounded-lg flex items-center justify-center`}>
                      {imageError ? (
                        <div className="flex h-full w-full items-center justify-center rounded bg-muted text-4xl">
                          {emoji.name.slice(0, 2)}
                        </div>
                      ) : (
                        <img
                          src={emoji.url || getPlaceholderImage(emoji.name)}
                          alt={`:${emoji.name}:`}
                          className="w-full h-full object-contain p-3"
                          onError={handleImageError}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    
                    {/* Buttons - Horizontal on mobile, vertical on desktop */}
                    <div className={`${isMobile ? "flex flex-row gap-2 w-full" : "w-full flex flex-col gap-1.5"}`}>
                      {!imageError && (
                        <Button 
                          variant="outline" 
                          size={isMobile ? "default" : "sm"}
                          onClick={downloadEmoji} 
                          className={`${isMobile ? "flex-1 h-10" : "w-full justify-center h-7 text-xs"}`}
                        >
                          <Download className={`${isMobile ? "h-4 w-4 mr-2" : "h-3 w-3 mr-1.5"}`} />
                          Download
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        onClick={copyEmojiCode} 
                        className={`${isMobile ? "flex-1 h-10" : "w-full justify-center h-7 text-xs"}`}
                      >
                        <Link className={`${isMobile ? "h-4 w-4 mr-2" : "h-3 w-3 mr-1.5"}`} />
                        Copy Code
                      </Button>
                    </div>
                  </div>

                  {/* Right Column - Emoji Info */}
                  <div className="flex-grow space-y-3">
                    <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md`}>
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">NAME</div>
                      <div className={`${isMobile ? "text-2xl" : "text-xl"} font-mono flex items-center gap-2`}>
                        :{emoji.name}:
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyEmojiCode}>
                              <Link className="h-3 w-3" />
                              <span className="sr-only">Copy emoji code</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy emoji code</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md`}>
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">CREATED BY</div>
                      <div className={`${isMobile ? "text-2xl" : "text-xl"} font-bold flex items-center gap-2`}>
                        {emoji.user_display_name && (
                          <span
                            className={onUserClick ? "cursor-pointer hover:text-primary hover:underline" : ""}
                            onClick={() => {
                              if (onUserClick && emoji.user_id) {
                                onUserClick(emoji.user_id, emoji.user_display_name)
                              }
                            }}
                          >
                            {emoji.user_display_name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md`}>
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">CREATED ON</div>
                      <div className={`${isMobile ? "text-2xl" : "text-xl"} font-bold`}>
                        {emoji.created ? format(new Date(emoji.created * 1000), "MMM d, yyyy") : "Unknown date"}
                      </div>
                    </div>

                    {emoji.is_alias === 1 && emoji.alias_for && (
                      <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md`}>
                        <div className="text-xs text-muted-foreground font-semibold tracking-widest">ALIAS FOR</div>
                        <div className={`${isMobile ? "text-2xl" : "text-xl"} font-mono`}>:{emoji.alias_for}:</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Similar Emojis Table */}
              <div className={`border border-border rounded-lg ${isMobile ? "p-4" : "p-2 md:p-3"}`}>
                <div className={`font-bold ${isMobile ? "text-lg mb-3" : "text-base mb-2"} flex items-center`}>
                  <Search className={`${isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2"} text-muted-foreground`} />
                  Similar Emojis
                </div>
                <SimilarEmojisTable
                  currentEmoji={emoji}
                  allEmojis={emojiData}
                  onEmojiClick={onEmojiClick}
                  onUserClick={onUserClick}
                  isMobile={isMobile}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )

  // Use portal to render outside of normal DOM hierarchy
  // Only render portal after component is mounted to avoid SSR issues
  if (!mounted) return null
  return createPortal(overlayContent, document.body)
}
