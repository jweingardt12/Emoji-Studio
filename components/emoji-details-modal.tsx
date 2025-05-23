"use client"
import { format, isToday } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[80vh] flex flex-col p-4 sm:p-6">
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
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[100px] py-2 px-2 sm:px-4">Emoji</TableHead>
                  <TableHead className="py-2 px-2 sm:px-4">Name</TableHead>
                  <TableHead className="py-2 px-2 sm:px-4 hidden sm:table-cell">Added By</TableHead>
                  <TableHead className="text-right py-2 px-2 sm:px-4">{isMonthView ? 'Date' : 'Time'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emojis.map((emoji) => (
                  <TableRow key={`${emoji.name}-${emoji.created}`}>
                    <TableCell className="font-medium py-2 px-2 sm:px-4">
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
                      className={`py-2 px-2 sm:px-4 text-sm ${onEmojiClick ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => onEmojiClick && onEmojiClick(emoji)}
                    >
                      <div className="flex flex-col">
                        <span className="truncate block">:{emoji.name}:</span>
                        <span className="text-xs text-muted-foreground block sm:hidden">
                          {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell 
                      className={`py-2 px-2 sm:px-4 hidden sm:table-cell ${onUserClick ? 'cursor-pointer hover:text-primary' : ''}`}
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
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap py-2 px-2 sm:px-4 text-xs sm:text-sm">
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
