"use client"
import { format, isToday } from "date-fns"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { X, ArrowLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Emoji, UserWithEmojiCount } from "@/lib/services/emoji-service"

interface EmojiDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  emojis: Emoji[]
  date: Date
  isMonthView?: boolean
  onEmojiClick?: (emoji: Emoji) => void
  onUserClick?: (user: UserWithEmojiCount) => void
}

export function EmojiDetailsModal({ 
  isOpen, 
  onClose, 
  emojis, 
  date, 
  isMonthView = false,
  onEmojiClick,
  onUserClick
}: EmojiDetailsModalProps) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Mount effect for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Animation effect
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling when modal is open
      const originalBodyOverflow = document.body.style.overflow
      const originalHtmlOverflow = document.documentElement.style.overflow
      const scrollY = window.scrollY
      
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      setTimeout(() => setIsVisible(true), 10)
      
      return () => {
        const body = document.body
        const scrollYValue = Math.abs(parseInt(body.style.top || '0'))
        
        body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
        body.style.position = ''
        body.style.top = ''
        body.style.width = ''
        
        window.scrollTo(0, scrollYValue)
      }
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  // Desktop dialog for non-mobile
  if (!isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col p-3 sm:p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl">
            {isToday(date) ? 
              "Emojis added today" : 
              isMonthView ? 
                `Emojis added in ${format(date, "MMMM yyyy")}` : 
                `Emojis added on ${format(date, "MMM d, yyyy")}` 
            }
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {emojis.length} emoji{emojis.length !== 1 ? "s" : ""} found
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          {emojis.length > 0 ? (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] sm:w-[60px] py-1 px-1 sm:px-2">Emoji</TableHead>
                  <TableHead className="py-1 px-1 sm:px-2 max-w-[150px]">Name</TableHead>
                  <TableHead className="py-1 px-1 sm:px-2 hidden sm:table-cell max-w-[80px]">Added By</TableHead>
                  <TableHead className="text-right py-1 px-1 sm:px-2 max-w-[80px]">{isMonthView ? 'Date' : 'Time'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emojis.map((emoji) => (
                  <TableRow key={`${emoji.name}-${emoji.created}`}>
                    <TableCell className="font-medium py-1 px-1 sm:px-2">
                      <div 
                        className={`${onEmojiClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => onEmojiClick && onEmojiClick(emoji)}
                      >
                        <img
                          src={emoji.url}
                          alt={emoji.name}
                          className="h-6 w-6 object-contain"
                          onError={(e) => {
                            // Fallback to a text representation if image fails to load
                            const target = e.target as HTMLImageElement
                            target.outerHTML = `:${emoji.name}:`
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell 
                      className={`py-1 px-1 sm:px-2 text-sm ${onEmojiClick ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => onEmojiClick && onEmojiClick(emoji)}
                    >
                      <div className="flex flex-col">
                        <span className="truncate block">
                          :{emoji.name.length > 20 ? emoji.name.substring(0, 20) + "..." : emoji.name}:
                        </span>
                        <span className="text-xs text-muted-foreground block sm:hidden">
                          {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell 
                      className={`py-1 px-1 sm:px-2 hidden sm:table-cell ${onUserClick ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => {
                        if (onUserClick && emoji.user_id && emoji.user_display_name) {
                          // Create a minimal user object for the overlay
                          onUserClick({
                            user_id: emoji.user_id,
                            user_display_name: emoji.user_display_name,
                            emoji_count: 0, // This will be calculated in the overlay
                            most_recent_emoji_timestamp: emoji.created,
                            oldest_emoji_timestamp: 0, // Placeholder, will be calculated in UserOverlay
                            l4wepw: 0, // Placeholder, will be calculated in UserOverlay
                            l4wepwChange: 0 // Placeholder, will be calculated in UserOverlay
                          });
                        }
                      }}
                    >
                      {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap py-1 px-1 sm:px-2 text-xs sm:text-sm">
                      {isMonthView 
                        ? format(new Date(emoji.created * 1000), "MMM d") 
                        : format(new Date(emoji.created * 1000), "h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No emojis added on this day
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    )
  }

  // Mobile drawer implementation
  if (!isOpen || !mounted) return null

  const drawerContent = (
    <div
      className={`fixed inset-0 z-[9999] transition-all duration-300 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[85vh] bg-card border border-border shadow-lg rounded-t-xl overflow-hidden transition-all duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-border rounded-full" />
        </div>
        
        {/* Header */}
        <div className="relative border-b border-border">
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
              <span className="text-lg font-semibold">
                {isToday(date) ? 
                  "Today's Emojis" : 
                  isMonthView ? 
                    format(date, "MMM yyyy") : 
                    format(date, "MMM d")
                }
              </span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-20 overflow-y-auto h-full">
          <div className="text-xs text-muted-foreground mb-3">
            {emojis.length} emoji{emojis.length !== 1 ? "s" : ""} found
          </div>
          
          {emojis.length > 0 ? (
            <div className="space-y-3">
              {emojis.map((emoji) => (
                <div
                  key={`${emoji.name}-${emoji.created}`}
                  className={`flex items-center gap-3 p-3 bg-muted/40 rounded-lg ${
                    onEmojiClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""
                  }`}
                  onClick={() => onEmojiClick && onEmojiClick(emoji)}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="h-10 w-10 object-contain flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium truncate">
                      :{emoji.name}:
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span
                        className={onUserClick ? "cursor-pointer hover:text-primary" : ""}
                        onClick={(e) => {
                          if (onUserClick && emoji.user_id && emoji.user_display_name) {
                            e.stopPropagation()
                            onUserClick({
                              user_id: emoji.user_id,
                              user_display_name: emoji.user_display_name,
                              emoji_count: 0,
                              most_recent_emoji_timestamp: emoji.created,
                              oldest_emoji_timestamp: 0,
                              l4wepw: 0,
                              l4wepwChange: 0
                            })
                          }
                        }}
                      >
                        {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : "Unknown"}
                      </span>
                      <span>•</span>
                      <span>
                        {isMonthView 
                          ? format(new Date(emoji.created * 1000), "MMM d") 
                          : format(new Date(emoji.created * 1000), "h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No emojis added on this day
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(drawerContent, document.body)
}
