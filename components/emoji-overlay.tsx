"use client"
import { X, Download, Info, Link, Search } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import type { Emoji } from "@/lib/services/emoji-service"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useAnalytics } from "@/lib/analytics"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Component to display similar emojis in a table
interface SimilarEmojisTableProps {
  currentEmoji: Emoji | null
  allEmojis: Emoji[] | undefined
  onEmojiClick?: (emoji: Emoji) => void
  onUserClick?: (userId: string, userName: string) => void
}

function SimilarEmojisTable({ currentEmoji, allEmojis, onEmojiClick, onUserClick }: SimilarEmojisTableProps) {
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
  const [isVisible, setIsVisible] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Animation effect - exactly matching UserOverlay
  useEffect(() => {
    if (emoji) {
      // Prevent all scrolling when overlay is open
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

      // Track emoji view event
      if (emoji.name && emoji.user_display_name) {
        analytics.trackEmojiView(emoji.name, emoji.user_display_name)
      }
      
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
    } else {
      setIsVisible(false)
      // Restore scroll when closing
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      if (parentRef?.current) parentRef.current.style.overflow = ""
    }
  }, [emoji, analytics, parentRef])

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

  return (
    <TooltipProvider>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      >
        <div
          className={`bg-card border border-border rounded-xl shadow-lg max-w-5xl w-full max-h-[70vh] overflow-auto transition-transform duration-300 ${isVisible ? "scale-100" : "scale-95"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative">
            <div className="flex flex-row items-center gap-3 p-3 md:p-4 pb-2 mb-2">
              <img src="/logo.png" alt="Emoji Dashboard Logo" className="h-8 w-8 rounded-lg shadow-md" />
              <span className="text-lg font-semibold">Emoji Studio</span>
              <span className="text-2xl font-light text-muted-foreground mx-2">|</span>
              <span className="text-lg font-semibold">:{emoji.name}:</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="absolute top-3 right-3 z-10">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3 md:p-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Emoji Preview Card */}
              <div className="border border-border rounded-lg mb-4 p-2 md:p-3">
                <div className="font-bold text-base mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                  Emoji Details
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column - Emoji Image and Actions */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-36 h-36 bg-primary/10 rounded-lg flex items-center justify-center">
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
                    
                    {/* Buttons Stacked Vertically */}
                    <div className="w-full flex flex-col gap-1.5">
                      {!imageError && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadEmoji} 
                          className="w-full justify-center h-7 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1.5" />
                          Download
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyEmojiCode} 
                        className="w-full justify-center h-7 text-xs"
                      >
                        <Link className="h-3 w-3 mr-1.5" />
                        Copy Code
                      </Button>
                    </div>
                  </div>

                  {/* Right Column - Emoji Info */}
                  <div className="flex-grow space-y-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">NAME</div>
                      <div className="text-xl font-mono flex items-center gap-2">
                        :{emoji.name}:
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyEmojiCode}>
                              <Link className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy emoji code</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="bg-primary/10 p-2 rounded-md">
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

                    <div className="bg-primary/10 p-2 rounded-md">
                      <div className="text-xs text-muted-foreground font-semibold tracking-widest">CREATED ON</div>
                      <div className="text-xl font-bold">
                        {emoji.created ? format(new Date(emoji.created * 1000), "MMM d, yyyy") : "Unknown date"}
                      </div>
                    </div>

                    {emoji.is_alias === 1 && emoji.alias_for && (
                      <div className="bg-primary/10 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground font-semibold tracking-widest">ALIAS FOR</div>
                        <div className="text-xl font-mono">:{emoji.alias_for}:</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Similar Emojis Table */}
              <div className="border border-border rounded-lg mb-4 p-2 md:p-3">
                <div className="font-bold text-base mb-2 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                  Similar Emojis
                </div>
                <SimilarEmojisTable
                  currentEmoji={emoji}
                  allEmojis={emojiData}
                  onEmojiClick={onEmojiClick}
                  onUserClick={onUserClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
