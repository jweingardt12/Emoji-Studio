"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit2, ImageUp, Trash2, LetterText, User, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Copy, ExternalLink, CheckSquare, Square, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/lib/utils/format-date"
import type { MyEmoji, SortColumn, SortDirection } from "../hooks/use-my-emojis-state"

interface EmojiTableViewProps {
  sortedEmojis: MyEmoji[]
  loading: boolean
  isRefreshing: boolean
  searchQuery: string
  hasRealData: boolean
  sortColumn: SortColumn
  sortDirection: SortDirection
  handleSort: (column: "name" | "created") => void
  selectedEmojiNames: Set<string>
  toggleEmojiSelection: (name: string) => void
  selectAllEmojis: () => void
  clearSelection: () => void
  getAliasesForEmoji: (name: string) => string[]
  copyEmojiName: (emoji: MyEmoji) => void
  copyEmojiUrl: (emoji: MyEmoji) => void
  copyEmojiMarkdown: (emoji: MyEmoji) => void
  copyImageToClipboard: (emoji: MyEmoji) => void
  handleRename: (emoji: MyEmoji) => void
  handleReplace: (emoji: MyEmoji) => void
  handleAddAlias: (emoji: MyEmoji) => void
  handleDelete: (emoji: MyEmoji) => void
}

export function EmojiTableView({
  sortedEmojis,
  loading,
  isRefreshing,
  searchQuery,
  hasRealData,
  sortColumn,
  sortDirection,
  handleSort,
  selectedEmojiNames,
  toggleEmojiSelection,
  selectAllEmojis,
  clearSelection,
  getAliasesForEmoji,
  copyEmojiName,
  copyEmojiUrl,
  copyEmojiMarkdown,
  copyImageToClipboard,
  handleRename,
  handleReplace,
  handleAddAlias,
  handleDelete,
}: EmojiTableViewProps) {
  if (loading || isRefreshing) {
    return (
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Emoji</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Aliases</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (sortedEmojis.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {searchQuery ? "No emojis found matching your search." : "You haven't created any emojis yet."}
        </p>
        {!hasRealData && (
          <p className="text-sm text-muted-foreground mt-2">
            Connect to Slack in Settings to see your emojis.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[500px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={selectedEmojiNames.size === sortedEmojis.length ? clearSelection : selectAllEmojis}
              >
                {selectedEmojiNames.size === sortedEmojis.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead className="w-20">Emoji</TableHead>
            <TableHead className="min-w-[150px]">
              <Button
                variant="ghost"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => handleSort('name')}
              >
                Name
                {sortColumn === 'name' ? (
                  sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead className="min-w-[120px] hidden sm:table-cell">
              <Button
                variant="ghost"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => handleSort('created')}
              >
                Date Added
                {sortColumn === 'created' ? (
                  sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px] hidden md:table-cell">Aliases</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEmojis.map((emoji) => (
            <ContextMenu key={emoji.name}>
              <ContextMenuTrigger asChild>
                <TableRow
                  onContextMenu={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleEmojiSelection(emoji.name)}
                    >
                      {selectedEmojiNames.has(emoji.name) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="relative h-10 w-10">
                      <Image
                        src={emoji.url}
                        alt={emoji.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="block truncate max-w-[200px]" title={`:${emoji.name}:`}>
                      :{emoji.name}:
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {emoji.created
                      ? formatDate(emoji.created, 'MMM d, yyyy')
                      : "Unknown"
                    }
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {emoji.is_alias === 1 && emoji.alias_for ? (
                      <Badge variant="secondary" className="text-xs">
                        alias of :{emoji.alias_for}:
                      </Badge>
                    ) : (
                      <>
                        {(() => {
                          const aliases = getAliasesForEmoji(emoji.name)
                          if (aliases.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1">
                                {aliases.map(alias => (
                                  <Badge key={alias} variant="outline" className="text-xs">
                                    :{alias}:
                                  </Badge>
                                ))}
                              </div>
                            )
                          }
                          return <span className="text-muted-foreground">-</span>
                        })()}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Desktop Actions */}
                    <div className="hidden sm:flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyEmojiName(emoji)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy name</TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRename(emoji)}
                        title={emoji.is_alias === 1 ? "Cannot rename aliases" : "Rename emoji"}
                        disabled={emoji.is_alias === 1}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReplace(emoji)}
                        title="Replace image"
                      >
                        <ImageUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddAlias(emoji)}
                        title="Add alias"
                      >
                        <LetterText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(emoji)}
                        title="Delete emoji"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Mobile Actions Dropdown */}
                    <div className="sm:hidden flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRename(emoji)}
                            disabled={emoji.is_alias === 1}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReplace(emoji)}>
                            <ImageUp className="h-4 w-4 mr-2" />
                            Replace
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddAlias(emoji)}>
                            <LetterText className="h-4 w-4 mr-2" />
                            Add Alias
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copyEmojiName(emoji)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Name
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyEmojiUrl(emoji)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyEmojiMarkdown(emoji)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Markdown
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(emoji)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={(e) => {
                  e.stopPropagation()
                  copyEmojiName(emoji)
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Name
                </ContextMenuItem>
                <ContextMenuItem onClick={(e) => {
                  e.stopPropagation()
                  copyEmojiUrl(emoji)
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copy URL
                </ContextMenuItem>
                <ContextMenuItem onClick={(e) => {
                  e.stopPropagation()
                  copyImageToClipboard(emoji)
                }}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Copy Image
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleRename(emoji)
                }} disabled={emoji.is_alias === 1}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(emoji)
                }} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
