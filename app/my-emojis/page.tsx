"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { toast as sonner } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Edit2, ImageUp, Trash2, LetterText, Plus, Search, User, Calendar, Hash, Grid3X3, TableIcon, Loader2, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, TrendingUp, FileImage, Film, Link2, Download, Filter, X, CheckSquare, Square, Copy, ExternalLink, Clock, Command } from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { EmojiProcessingModal } from "@/components/emoji-processing-modal"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"

interface Emoji {
  name: string
  url: string
  team_id?: string
  user_id: string
  created: number
  user_display_name: string
  aliases?: string[]
  is_alias?: number
  alias_for?: string
  can_delete?: boolean
}

function MyEmojisPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { emojiData, loading, hasRealData, workspace, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [isAliasDialogOpen, setIsAliasDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAlias, setNewAlias] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [isDeletingEmoji, setIsDeletingEmoji] = useState(false)
  const [isAddingAlias, setIsAddingAlias] = useState(false)
  const [isRenamingEmoji, setIsRenamingEmoji] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [sortColumn, setSortColumn] = useState<"name" | "created" | null>("created")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Processing states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processedEmoji, setProcessedEmoji] = useState<ProcessedEmoji | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<File[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [processingError, setProcessingError] = useState<string>("")

  // Filter states
  const [filterType, setFilterType] = useState<"all" | "images" | "gifs">("all")
  const [filterHasAliases, setFilterHasAliases] = useState<"all" | "with" | "without">("all")
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection states
  const [selectedEmojiNames, setSelectedEmojiNames] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Search input ref for focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Check if user has Slack connection (authentication)
    const checkAuth = async () => {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl || !hasRealData) {
        // Don't redirect, just set auth checking to false
        setIsAuthChecking(false)
      } else {
        setIsAuthChecking(false)
        
        // Auto-refresh data on page load to ensure freshness
        const lastRefreshTime = localStorage.getItem("lastEmojiRefreshTime")
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        
        // If data is older than 5 minutes, refresh it
        if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > fiveMinutes) {
          await refreshEmojiData()
          localStorage.setItem("lastEmojiRefreshTime", now.toString())
        }
      }
    }
    
    checkAuth()
  }, [router, hasRealData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Cmd/Ctrl + A: Select all (only when not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          selectAllEmojis()
        }
      }

      // Escape: Clear selection or close dialogs
      if (e.key === 'Escape') {
        if (selectedEmojiNames.size > 0) {
          clearSelection()
        }
      }

      // Cmd/Ctrl + /: Show keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardHelp(!showKeyboardHelp)
      }

      // F: Toggle filters
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowFilters(!showFilters)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedEmojiNames.size, showFilters, showKeyboardHelp])

  // Function to refresh emoji data from Slack
  const refreshEmojiData = async () => {
    if (!hasRealData || isRefreshing) return
    
    const slackCurl = localStorage.getItem("slackCurlCommand")
    if (!slackCurl) return
    
    setIsRefreshing(true)
    try {
      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        throw new Error(parsed.error || "Invalid Slack credentials")
      }
      
      const { token, cookie, workspace: workspaceUrl } = parsed
      const url = parsed.url || ""
      
      // Create form data
      const formData: Record<string, string> = {}
      if (token) formData.token = token
      
      // Ensure we have count for emoji requests
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }
      
      // Make the request to our API endpoint
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url,
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(cookie ? { Cookie: cookie } : {}),
            },
            formData,
          },
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error from Slack API: ${errorText}`)
      }
      
      const data = await response.json()
      
      // Process the emoji data
      let emojiArray = []
      if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
      } else if (data.slackResponse && data.slackResponse.emoji) {
        const emojiObj = data.slackResponse.emoji
        if (typeof emojiObj === "object" && !Array.isArray(emojiObj)) {
          emojiArray = Object.entries(emojiObj).map(([name, url]) => ({
            name,
            url,
            is_alias: 0,
            user_id: "",
            created: Math.floor(Date.now() / 1000),
            user_display_name: "",
          }))
        }
      }
      
      // Get existing data to preserve timestamps if needed
      const existingData = emojiData || []
      const existingDataMap = new Map(existingData.map(e => [e.name, e]))
      
      // Process the emoji array with consistent fields
      const recentData = emojiArray.map((emoji: any) => {
        const existing = existingDataMap.get(emoji.name)
        return {
          name: emoji.name,
          url: emoji.url,
          team_id: emoji.team_id || "",
          user_id: emoji.user_id || "",
          // Use existing created timestamp if available and API doesn't provide one
          created: emoji.created || emoji.date_created || (existing?.created) || 0,
          is_alias: emoji.is_alias || 0,
          alias_for: emoji.alias_for || "",
          is_bad: emoji.is_bad || false,
          user_display_name: emoji.user_display_name || "",
          can_delete: emoji.can_delete || false,
          aliases: emoji.aliases || [],
        }
      })
      
      if (recentData && Array.isArray(recentData) && recentData.length > 0) {
        setEmojiData(recentData)
        const workspaceName = workspaceUrl || workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        safePersistEmojiDataToLocalStorage(recentData, { source: "my-emojis-refresh" })
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", recentData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        localStorage.setItem("lastEmojiRefreshTime", Date.now().toString())
        window.dispatchEvent(new CustomEvent("emojiDataUpdated"))
      }
    } catch (error) {
      console.error("Error refreshing emoji data:", error)
      toast({
        title: "Failed to refresh emoji data",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }
  

  // Filter emojis to show only those created by the current user
  // An emoji is "mine" if can_delete is true AND it's not an alias
  const myEmojis = emojiData.filter(emoji => {
    // In demo mode, show all non-alias emojis
    if (!hasRealData) return emoji.is_alias !== 1

    // Only include actual emojis I can delete (not aliases)
    return emoji.can_delete === true && emoji.is_alias !== 1
  })

  // Helper function to get all aliases for an emoji
  const getAliasesForEmoji = (emojiName: string) => {
    // Look through ALL emoji data, not just filtered ones
    const aliases = emojiData.filter(e =>
      e.is_alias === 1 && e.alias_for === emojiName
    ).map(e => e.name)

    return aliases
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalEmojis = myEmojis.length
    const images = myEmojis.filter(e => !e.url.toLowerCase().includes('.gif')).length
    const gifs = myEmojis.filter(e => e.url.toLowerCase().includes('.gif')).length

    // Count total aliases across all my emojis
    const totalAliases = myEmojis.reduce((count, emoji) => {
      return count + getAliasesForEmoji(emoji.name).length
    }, 0)

    // Calculate week and month metrics
    const now = Date.now() / 1000 // Convert to seconds
    const oneWeekAgo = now - (7 * 24 * 60 * 60)
    const oneMonthAgo = now - (30 * 24 * 60 * 60)

    const thisWeek = myEmojis.filter(e => e.created && e.created >= oneWeekAgo).length
    const thisMonth = myEmojis.filter(e => e.created && e.created >= oneMonthAgo).length

    // Find newest emoji
    const newestEmoji = myEmojis.reduce((newest, emoji) => {
      if (!emoji.created) return newest
      if (!newest || emoji.created > newest.created) return emoji
      return newest
    }, null as Emoji | null)

    // Get recent emojis (last 5)
    const recentEmojis = [...myEmojis]
      .filter(e => e.created)
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 5)

    return {
      total: totalEmojis,
      images,
      gifs,
      aliases: totalAliases,
      thisWeek,
      thisMonth,
      newest: newestEmoji,
      recentEmojis
    }
  }, [myEmojis, emojiData])

  // Filter by search query and filters
  const filteredEmojis = myEmojis.filter(emoji => {
    // Search query filter
    const query = searchQuery.toLowerCase()
    const matchesSearch = emoji.name.toLowerCase().includes(query) ||
           emoji.user_display_name?.toLowerCase().includes(query)

    if (!matchesSearch) return false

    // Type filter (images/gifs)
    if (filterType === "images" && emoji.url.toLowerCase().includes('.gif')) return false
    if (filterType === "gifs" && !emoji.url.toLowerCase().includes('.gif')) return false

    // Aliases filter
    if (filterHasAliases !== "all") {
      const aliases = getAliasesForEmoji(emoji.name)
      if (filterHasAliases === "with" && aliases.length === 0) return false
      if (filterHasAliases === "without" && aliases.length > 0) return false
    }

    return true
  })

  // Sort filtered emojis
  const sortedEmojis = [...filteredEmojis].sort((a, b) => {
    if (!sortColumn) return 0
    
    let aValue: any = a[sortColumn]
    let bValue: any = b[sortColumn]
    
    if (sortColumn === 'name') {
      aValue = a.name.toLowerCase()
      bValue = b.name.toLowerCase()
    } else if (sortColumn === 'created') {
      // For created date, ensure we have valid timestamps
      aValue = a.created || 0
      bValue = b.created || 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
  

  // Handle sort column click
  const handleSort = (column: "name" | "created") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Bulk selection handlers
  const toggleEmojiSelection = (emojiName: string) => {
    const newSelected = new Set(selectedEmojiNames)
    if (newSelected.has(emojiName)) {
      newSelected.delete(emojiName)
    } else {
      newSelected.add(emojiName)
    }
    setSelectedEmojiNames(newSelected)
  }

  const selectAllEmojis = () => {
    const allNames = new Set(sortedEmojis.map(e => e.name))
    setSelectedEmojiNames(allNames)
  }

  const clearSelection = () => {
    setSelectedEmojiNames(new Set())
  }

  // Copy actions
  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      sonner.success(message)
    } catch (error) {
      sonner.error("Failed to copy to clipboard")
    }
  }

  const copyEmojiName = (emoji: Emoji) => {
    copyToClipboard(`:${emoji.name}:`, "Emoji name copied!")
  }

  const copyEmojiUrl = (emoji: Emoji) => {
    copyToClipboard(emoji.url, "Emoji URL copied!")
  }

  const copyEmojiMarkdown = (emoji: Emoji) => {
    const markdown = `![${emoji.name}](${emoji.url})`
    copyToClipboard(markdown, "Markdown copied!")
  }

  const handleBulkDelete = async () => {
    if (selectedEmojiNames.size === 0) return

    // Show confirmation
    const confirmed = confirm(`Are you sure you want to delete ${selectedEmojiNames.size} emoji${selectedEmojiNames.size > 1 ? 's' : ''}?`)
    if (!confirmed) return

    sonner.loading(`Deleting ${selectedEmojiNames.size} emojis...`, { id: "bulk-delete" })

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        throw new Error("No Slack connection")
      }

      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        throw new Error("Invalid Slack credentials")
      }

      const { token, cookie, workspace: workspaceUrl } = parsed

      // Delete each emoji
      let successCount = 0
      let failCount = 0

      for (const emojiName of selectedEmojiNames) {
        try {
          const formData: Record<string, string> = {
            token: token || "",
            name: emojiName,
            _x_reason: 'customize-emoji-remove',
            _x_mode: 'online'
          }

          const response = await fetch("/api/slack-emojis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              curlRequest: {
                url: `https://${workspaceUrl}.slack.com/api/emoji.remove`,
                method: "POST",
                headers: {
                  "Cookie": cookie,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                formData: formData,
              },
            }),
          })

          const result = await response.json()
          const slackResponse = result.slackResponse || result

          if (response.ok && slackResponse.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      if (successCount > 0) {
        sonner.success(`Deleted ${successCount} emoji${successCount > 1 ? 's' : ''}`, {
          id: "bulk-delete",
          description: failCount > 0 ? `${failCount} failed` : undefined
        })

        // Remove deleted emojis from state
        setEmojiData(prevData => {
          const updatedData = prevData.filter(emoji => {
            if (selectedEmojiNames.has(emoji.name)) return false
            if (emoji.is_alias === 1 && selectedEmojiNames.has(emoji.alias_for || '')) return false
            return true
          })

          safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-bulk-delete" })
          return updatedData
        })

        clearSelection()

        // Refresh in the background
        setTimeout(async () => {
          try {
            await refreshEmojiData()
          } catch (error) {
            console.error('Background refresh failed:', error)
          }
        }, 2000)
      } else {
        throw new Error("All deletions failed")
      }
    } catch (error) {
      sonner.error("Bulk delete failed", {
        id: "bulk-delete",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    }
  }

  const handleRename = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setNewName(emoji.name)
    setIsRenameDialogOpen(true)
  }

  const handleReplace = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setIsReplaceDialogOpen(true)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAddAlias = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setNewAlias("")
    setIsAliasDialogOpen(true)
  }

  const handleDelete = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setIsDeleteDialogOpen(true)
  }

  const performRename = async () => {
    if (!selectedEmoji || !newName || newName === selectedEmoji.name || isRenamingEmoji) return

    // Check if this is an alias
    if (selectedEmoji.is_alias === 1) {
      sonner.error("Cannot rename an alias", {
        description: "You can only rename actual emojis, not aliases"
      })
      return
    }

    // Check if new name already exists
    if (emojiData.some(e => e.name === newName)) {
      sonner.error("Name already exists", {
        description: `An emoji with the name "${newName}" already exists.`
      })
      return
    }

    setIsRenamingEmoji(true)

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        sonner.error("No Slack connection", {
          description: "Please configure Slack in Settings first."
        })
        setIsRenamingEmoji(false)
        return
      }

      // Parse the curl command
      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        sonner.error("Invalid Slack credentials", {
          description: parsed.error || "Please update your curl command in Settings."
        })
        setIsRenamingEmoji(false)
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed
      
      if (!token) {
        sonner.error("No authentication token found", {
          id: "rename-emoji",
          description: "Please reconnect to Slack in Settings"
        })
        setIsRenamingEmoji(false)
        return
      }

      sonner.loading("Downloading emoji...", { id: "rename-emoji" })

      // Step 1: Download the emoji image through our proxy to avoid CORS issues
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(selectedEmoji.url)}`
      const imageResponse = await fetch(proxyUrl)
      if (!imageResponse.ok) {
        throw new Error("Failed to download emoji image")
      }
      
      const imageBlob = await imageResponse.blob()
      
      // Convert blob to base64 for uploading
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Failed to convert image to base64'))
          }
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(imageBlob)
      const downloadedImage = await base64Promise

      sonner.loading("Deleting old emoji...", { id: "rename-emoji" })

      // Step 2: Delete the old emoji
      // Ensure we're using the correct emoji name (strip colons if present)
      const emojiNameToDelete = selectedEmoji.name.replace(/^:|:$/g, '')
      
      const deleteFormData: Record<string, string> = {
        token: token,
        name: emojiNameToDelete,
        _x_reason: 'customize-emoji-remove',
        _x_mode: 'online'
      }

      const deleteResponse = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url: `https://${workspaceUrl}.slack.com/api/emoji.remove`,
            method: "POST",
            headers: {
              "Cookie": cookie,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            formData: deleteFormData,
          },
        }),
      })

      const deleteResult = await deleteResponse.json()
      const deleteSlackResponse = deleteResult.slackResponse || deleteResult
      
      if (!deleteResponse.ok || !deleteSlackResponse.ok) {
        // If emoji not found, it might have already been deleted or doesn't exist
        if (deleteSlackResponse.error === "emoji_not_found") {
          throw new Error(`Emoji "${selectedEmoji.name}" was not found. It may have already been deleted.`)
        }
        throw new Error(deleteSlackResponse.error || "Failed to delete old emoji")
      }

      sonner.loading("Uploading with new name...", { id: "rename-emoji" })

      // Step 3: Upload the emoji with the new name
      // Extract workspace URL and other parameters
      const workspaceMatch = parsed.url?.match(/https:\/\/([^.]+)\.slack\.com/)
      const workspace = workspaceMatch?.[1] || 'slack-workspace'
      const urlParams = parsed.url ? new URL(parsed.url).searchParams : new URLSearchParams()
      const xId = urlParams.get("_x_id") || parsed.xId || ""
      const slackRoute = urlParams.get("slack_route") || parsed.teamId || ""
      
      // Construct the upload URL
      const uploadUrl = `https://${workspace}.slack.com/api/emoji.add?_x_id=${xId}&slack_route=${slackRoute}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
      
      // Prepare headers
      const headers: Record<string, string> = {
        "Accept": "*/*",
        "Origin": `https://${workspace}.slack.com`,
        "Referer": `https://${workspace}.slack.com/`,
      }
      
      // Add cookie if available
      if (parsed.cookie) {
        headers["Cookie"] = parsed.cookie
      }
      
      // Extract _x_id from the d cookie for upload
      let uploadXId = ""
      if (cookie) {
        const dCookieMatch = cookie.match(/d=([^;]+)/)
        if (dCookieMatch && dCookieMatch[1]) {
          const dValue = dCookieMatch[1]
          const lastSemicolon = dValue.lastIndexOf(';')
          if (lastSemicolon !== -1) {
            uploadXId = dValue.substring(lastSemicolon + 1).trim()
          }
        }
      }
      if (!uploadXId) {
        uploadXId = xId
      }
      
      // Construct proper upload URL
      const properUploadUrl = `https://${workspace}.slack.com/api/emoji.add?_x_id=${uploadXId}&slack_route=${slackRoute}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
      
      // Make the upload request using the same endpoint
      const uploadResponse = await fetch("/api/slack-emoji-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: properUploadUrl,
          formData: {
            token: token,
            name: newName,
            mode: 'data',
            search_args: '{}',
            _x_reason: 'customize-emoji-add',
            _x_mode: 'online'
          },
          headers: headers,
          blob: downloadedImage,
          fileName: `${newName}.${selectedEmoji.url.includes('.gif') ? 'gif' : 'png'}`,
          mimeType: selectedEmoji.url.includes('.gif') ? 'image/gif' : 'image/png'
        })
      })
      
      const uploadResult = await uploadResponse.json()
      
      if (!uploadResponse.ok || uploadResult.error || uploadResult.details?.error) {
        let errorMessage = "Failed to upload emoji with new name"
        
        // Handle specific error cases
        if (uploadResult.error === "error_name_taken" || uploadResult.details?.error === "error_name_taken") {
          errorMessage = `The emoji name ":${newName}:" is already taken. Please choose a different name.`
        } else if (uploadResult.error) {
          errorMessage = uploadResult.error
        }
        
        throw new Error(errorMessage)
      }
      
      // Success!
      sonner.success('Emoji renamed successfully', {
        id: "rename-emoji",
        description: `"${selectedEmoji.name}" → "${newName}"`
      })
      
      // Optimistically update the UI immediately
      setEmojiData(prevData => {
        const updatedData = prevData.map(emoji => {
          if (emoji.name === selectedEmoji.name) {
            return { ...emoji, name: newName }
          }
          // Update aliases that point to this emoji
          if (emoji.is_alias === 1 && emoji.alias_for === selectedEmoji.name) {
            return { ...emoji, alias_for: newName }
          }
          return emoji
        })
        
        // Update localStorage with the optimistic data
        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-rename" })
        return updatedData
      })
      
      setIsRenameDialogOpen(false)
      
      // Refresh in the background without blocking UI
      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      sonner.error("Failed to rename emoji", {
        id: "rename-emoji",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsRenamingEmoji(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedEmoji) return

    setSelectedFile(file)
    setProcessingFiles([file])
    setIsProcessing(true)
    setCurrentFileIndex(0)
    setCurrentStep('loading')
    setProcessingError('')
    setProcessedEmoji(null)

    try {
      setCurrentStep('analyzing')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setCurrentStep('processing')
      const processed = await EmojiProcessor.processFile(file)
      
      // Update the processed emoji name to match the selected emoji
      processed.name = selectedEmoji.name
      
      setCurrentStep('finalizing')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setProcessedEmoji(processed)
      setCurrentStep('completed')
    } catch (error) {
      console.error('Failed to process file:', error)
      setProcessingError(error instanceof Error ? error.message : 'Unknown error')
      setCurrentStep('error')
    }
  }

  const performReplace = async () => {
    if (!selectedEmoji || !processedEmoji) return

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        toast({
          title: "No Slack connection",
          description: "Please configure Slack in Settings first.",
          variant: "destructive",
        })
        return
      }

      // Parse the slack curl to get necessary info
      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        throw new Error("Invalid Slack configuration")
      }

      const workspaceUrl = parsed.workspace || workspace
      const boundary = `----WebKitFormBoundaryReplace${Date.now()}`
      
      // Step 1: Delete the existing emoji
      sonner.loading("Deleting old emoji...", { id: "replace-emoji" })
      
      const deleteData = `------${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${parsed.token}\r\n------${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${selectedEmoji.name}\r\n------${boundary}\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\ncustomize-emoji-remove\r\n------${boundary}\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n------${boundary}--\r\n`
      
      const deleteResponse = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url: `https://${workspaceUrl}.slack.com/api/emoji.remove`,
            method: "POST",
            headers: {
              "Cookie": parsed.cookie,
              "Content-Type": `multipart/form-data; boundary=----${boundary}`,
            },
            data: deleteData,
          },
        }),
      })

      const deleteResult = await deleteResponse.json()
      if (!deleteResponse.ok || (deleteResult.error && deleteResult.error !== "No emoji data found in Slack response")) {
        throw new Error(deleteResult.error || "Failed to delete old emoji")
      }
      
      // Check if it's a successful deletion (ok: true)
      if (!deleteResult.ok && deleteResult.slackResponse && !deleteResult.slackResponse.ok) {
        throw new Error(deleteResult.slackResponse?.error || "Failed to delete old emoji")
      }
      
      // Step 2: Upload the new image with the same name
      sonner.loading("Uploading new image...", { id: "replace-emoji" })
      
      // Get the file from the processed emoji
      const response = await fetch(processedEmoji.blob)
      const blob = await response.blob()
      const fileName = `${selectedEmoji.name}.${processedEmoji.format === 'gif' ? 'gif' : 'png'}`
      
      const uploadResponse = await fetch("/api/slack-emoji-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://${workspaceUrl}.slack.com/api/emoji.add`,
          formData: {
            token: parsed.token,
            name: selectedEmoji.name,
            mode: "data",
            _x_reason: "customize-emoji-add",
            _x_mode: "online",
          },
          headers: {
            "Cookie": parsed.cookie,
            "Accept": "*/*",
            "Origin": `https://${workspaceUrl}.slack.com`,
          },
          blob: processedEmoji.blob,
          fileName: fileName,
          mimeType: blob.type,
        }),
      })

      const uploadResult = await uploadResponse.json()
      if (!uploadResponse.ok || uploadResult.error) {
        throw new Error(uploadResult.error || "Failed to upload new image")
      }
      
      sonner.success("Emoji replaced successfully", { 
        id: "replace-emoji",
        description: `"${selectedEmoji.name}" has been updated with the new image`
      })
      
      // For replace, we can't easily update the URL optimistically since we don't know the new URL
      // But we can at least update the timestamp to show it was recently modified
      setEmojiData(prevData => {
        const updatedData = prevData.map(emoji => {
          if (emoji.name === selectedEmoji.name) {
            return { ...emoji, created: Math.floor(Date.now() / 1000) }
          }
          return emoji
        })
        
        // Update localStorage with the optimistic data
        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-replace" })
        return updatedData
      })
      
      setIsReplaceDialogOpen(false)
      setIsProcessing(false)
      setProcessedEmoji(null)
      
      // Refresh in the background to get the new URL
      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      sonner.error("Failed to replace emoji", {
        id: "replace-emoji",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    }
  }

  const performAddAlias = async () => {
    if (!selectedEmoji || !newAlias || isAddingAlias) return

    // Check if alias already exists
    if (emojiData.some(e => e.name === newAlias)) {
      sonner.error("Alias already exists", {
        description: `The alias "${newAlias}" is already in use.`
      })
      return
    }

    setIsAddingAlias(true)
    sonner.loading("Creating alias...", { id: "add-alias" })

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        sonner.error("No Slack connection", {
          id: "add-alias",
          description: "Please configure Slack in Settings first."
        })
        setIsAddingAlias(false)
        return
      }

      // Use the same parsing logic as SlackCurlInput
      const parsed = parseSlackCurl(slackCurl)

      if (!parsed.isValid) {
        sonner.error("Invalid Slack credentials", {
          id: "add-alias",
          description: parsed.error || "Please update your curl command in Settings."
        })
        setIsAddingAlias(false)
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed
      
      if (!token) {
        sonner.error("No authentication token found", {
          id: "add-alias",
          description: "Please reconnect to Slack in Settings"
        })
        setIsAddingAlias(false)
        return
      }

      // Generate a boundary for multipart/form-data
      const boundary = `WebKitFormBoundary${Math.random().toString(16).substr(2, 16)}`
      
      // Create multipart/form-data body
      const formParts = [
        `------${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`,
        `------${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\nalias\r\n`,
        `------${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${newAlias.replace(/^:|:$/g, '')}\r\n`,
        `------${boundary}\r\nContent-Disposition: form-data; name="alias_for"\r\n\r\n${selectedEmoji.name.replace(/^:|:$/g, '')}\r\n`,
        `------${boundary}\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\ncustomize-emoji-add\r\n`,
        `------${boundary}\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n`,
        `------${boundary}--\r\n`
      ]
      const multipartBody = formParts.join('')
      
      // Extract _x_id from the d cookie - it should be at the end after 'd='
      let xId = ""
      if (cookie) {
        const dCookieMatch = cookie.match(/d=([^;]+)/)
        if (dCookieMatch && dCookieMatch[1]) {
          // The _x_id is the last part of the d cookie value after the last semicolon
          const dValue = dCookieMatch[1]
          const lastSemicolon = dValue.lastIndexOf(';')
          if (lastSemicolon !== -1) {
            xId = dValue.substring(lastSemicolon + 1).trim()
          }
        }
      }
      
      // If we couldn't extract from d cookie, fall back to URL params
      if (!xId) {
        const urlParams = parsed.url ? new URL(parsed.url).searchParams : new URLSearchParams()
        xId = urlParams.get("_x_id") || parsed.xId || ""
      }
      
      const slackRoute = parsed.teamId || ""
      
      // Construct the URL with proper parameters
      const aliasUrl = `https://${workspaceUrl}.slack.com/api/emoji.add?_x_id=${xId}&slack_route=${slackRoute}&_x_version_ts=noversion&fp=db&_x_num_retries=0`

      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url: aliasUrl,
            method: "POST",
            headers: {
              "Cookie": cookie,
              "Content-Type": `multipart/form-data; boundary=----${boundary}`,
              "Accept": "*/*",
              "Origin": `https://${workspaceUrl}.slack.com`,
            },
            data: multipartBody,
          },
        }),
      })

      const result = await response.json()
      
      // Check the Slack response
      const slackResponse = result.slackResponse || result
      if (!response.ok || !slackResponse.ok) {
        let errorMessage = "Failed to add alias"
        if (slackResponse.error === "error_name_taken") {
          errorMessage = `The alias "${newAlias}" is already taken`
        } else if (slackResponse.error) {
          errorMessage = slackResponse.error
        }
        throw new Error(errorMessage)
      }
      
      sonner.success("Alias added successfully", {
        id: "add-alias",
        description: `"${newAlias}" → "${selectedEmoji.name}"`
      })
      
      // Optimistically add the alias to the UI immediately
      setEmojiData(prevData => {
        // Create the new alias emoji
        const newAliasEmoji = {
          name: newAlias.replace(/^:|:$/g, ''),
          url: selectedEmoji.url,
          team_id: selectedEmoji.team_id || "",
          user_id: selectedEmoji.user_id || "",
          created: Math.floor(Date.now() / 1000),
          is_alias: 1,
          alias_for: selectedEmoji.name,
          is_bad: false,
          user_display_name: selectedEmoji.user_display_name || "",
          can_delete: selectedEmoji.can_delete || false,
          aliases: []
        }
        
        const updatedData = [...prevData, newAliasEmoji]
        
        // Update localStorage with the optimistic data
        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-add-alias" })
        return updatedData
      })
      
      // Clear the form
      setNewAlias("")
      setIsAliasDialogOpen(false)
      
      // Refresh in the background without blocking UI
      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      sonner.error("Failed to add alias", {
        id: "add-alias",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsAddingAlias(false)
    }
  }

  // Show loading while checking authentication
  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const performDelete = async () => {
    if (!selectedEmoji || isDeletingEmoji) return

    setIsDeletingEmoji(true)

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        sonner.error("No Slack connection", {
          description: "Please configure Slack in Settings first."
        })
        setIsDeletingEmoji(false)
        return
      }

      // Use the same parsing logic as SlackCurlInput
      const parsed = parseSlackCurl(slackCurl)

      if (!parsed.isValid) {
        toast({
          title: "Invalid Slack credentials",
          description: parsed.error || "Please update your curl command in Settings.",
          variant: "destructive",
        })
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed

      // Extract the actual token from the form data if it's in the curl --data-raw section
      let actualToken = token || ""
      
      // Look for token in the --data-raw section (like in the delete curl example)
      const dataRawMatch = slackCurl.match(/--data-raw\s+["']([^"']+)["']/)
      if (dataRawMatch) {
        const dataRaw = dataRawMatch[1]
        const tokenInDataMatch = dataRaw.match(/name=["']token["']\s*\\r\\n\\r\\n([^\\]+)/)
        if (tokenInDataMatch) {
          actualToken = tokenInDataMatch[1].trim()
        }
      }

      // Create form data for the delete request
      const formData: Record<string, string> = {
        token: actualToken || token || "",
        name: selectedEmoji.name,
        _x_reason: 'customize-emoji-remove',
        _x_mode: 'online'
      }
      
      // Use the same API endpoint we use for fetching emojis
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url: `https://${workspaceUrl}.slack.com/api/emoji.remove`,
            method: "POST",
            headers: {
              "Cookie": cookie,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            formData: formData,
          },
        }),
      })

      let result;
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError)
        const text = await response.text()
        console.error("Response text:", text)
        throw new Error("Invalid response from server")
      }
      
      // Check the Slack response
      const slackResponse = result.slackResponse || result
      if (!response.ok || !slackResponse.ok) {
        throw new Error(slackResponse.error || "Failed to delete emoji")
      }
      
      sonner.success(`Emoji deleted!`, {
        description: `Successfully deleted "${selectedEmoji.name}"`
      })
      
      // Optimistically update the UI immediately
      setEmojiData(prevData => {
        // Remove the deleted emoji and any aliases pointing to it
        const updatedData = prevData.filter(emoji => {
          if (emoji.name === selectedEmoji.name) return false
          if (emoji.is_alias === 1 && emoji.alias_for === selectedEmoji.name) return false
          return true
        })
        
        // Update localStorage with the optimistic data
        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-delete" })
        return updatedData
      })
      
      setIsDeleteDialogOpen(false)
      
      // Refresh in the background without blocking UI
      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      sonner.error("Failed to delete emoji", {
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsDeletingEmoji(false)
    }
  }

  if (!isClient) return null

  // Return null if no real data
  if (!hasRealData) {
    return null
  }

  return (
    <>
      <div className={`flex flex-col ${isMobile ? 'pt-4' : 'gap-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6'}`}>
        <div className={isMobile ? '' : 'px-2 sm:px-4 lg:px-6'}>
          {isMobile ? (
            // Mobile: No Card wrapper
            <>
              {/* Mobile Header */}
              <div className="px-3 pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold tracking-tight">
                    My Emojis {myEmojis.length > 0 && <span className="text-muted-foreground font-normal">({myEmojis.length})</span>}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => refreshEmojiData()}
                      disabled={isRefreshing}
                      className="h-8 w-8 border-primary/20 hover:border-primary/40"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "grid")} className="h-8">
                      <ToggleGroupItem value="table" aria-label="Table view" className="h-8 px-2">
                        <TableIcon className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 px-2">
                        <Grid3X3 className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search emojis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 h-9"
                  />
                </div>
              </div>
              {/* Mobile Content */}
              <div>
                {loading || isRefreshing ? (
                  viewMode === "table" ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <Skeleton className="h-12 w-12 rounded" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-8 w-8" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <Skeleton className="h-16 w-16 rounded-lg" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      ))}
                    </div>
                  )
                ) : sortedEmojis.length === 0 ? (
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
                ) : (viewMode === "table") ? (
                  // Mobile cards view for table mode
                  <div className="space-y-2">
                    {sortedEmojis.map((emoji) => (
                      <div key={emoji.name} className="flex items-center gap-3 p-3 border-b bg-card">
                        <div className="relative h-12 w-12 flex-shrink-0">
                          <Image
                            src={emoji.url}
                            alt={emoji.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">:{emoji.name}:</p>
                          {emoji.created && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}
                            </p>
                          )}
                          {(() => {
                            const aliases = getAliasesForEmoji(emoji.name)
                            if (aliases.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {aliases.slice(0, 2).map(alias => (
                                    <Badge key={alias} variant="outline" className="text-xs py-0 px-1">
                                      :{alias}:
                                    </Badge>
                                  ))}
                                  {aliases.length > 2 && (
                                    <Badge variant="outline" className="text-xs py-0 px-1">
                                      +{aliases.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            setSelectedEmoji(emoji)
                            setIsActionsDrawerOpen(true)
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Mobile grid view
                  <div className="grid grid-cols-2 gap-2 px-2">
                    {sortedEmojis.map((emoji) => (
                      <div
                        key={emoji.name}
                        className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        {/* Emoji Image */}
                        <div className="relative h-16 w-16">
                          <Image
                            src={emoji.url}
                            alt={emoji.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        
                        {/* Emoji Info */}
                        <div className="text-center w-full">
                          <p className="font-medium text-sm truncate">:{emoji.name}:</p>
                          {emoji.created && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}
                            </p>
                          )}
                          {emoji.is_alias === 1 && emoji.alias_for ? (
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                alias of :{emoji.alias_for}:
                              </Badge>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const aliases = getAliasesForEmoji(emoji.name)
                                if (aliases.length > 0) {
                                  return (
                                    <div className="mt-1 flex flex-wrap gap-1 justify-center">
                                      {aliases.slice(0, 2).map(alias => (
                                        <Badge key={alias} variant="outline" className="text-xs">
                                          :{alias}:
                                        </Badge>
                                      ))}
                                      {aliases.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{aliases.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </>
                          )}
                        </div>

                        {/* Action Button for Mobile */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 bg-background/80 backdrop-blur-sm"
                          onClick={() => {
                            setSelectedEmoji(emoji)
                            setIsActionsDrawerOpen(true)
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // Desktop: With Card wrapper
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                    My Emojis {myEmojis.length > 0 && <span className="text-muted-foreground font-normal">({myEmojis.length})</span>}
                  </CardTitle>                    <CardDescription>
                      {hasRealData 
                        ? `Manage the emojis you've created in ${workspace || "your workspace"}`
                        : "Connect to Slack to see and manage your emojis"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => refreshEmojiData()}
                      disabled={isRefreshing}
                      title="Refresh emoji list"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "grid")}>
                      <ToggleGroupItem value="table" aria-label="Table view">
                        <TableIcon className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="grid" aria-label="Grid view">
                        <Grid3X3 className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={searchInputRef}
                        type="search"
                        placeholder="Search emojis... (⌘K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-[300px] pl-9"
                      />
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowKeyboardHelp(true)}
                            title="Keyboard shortcuts"
                          >
                            <Command className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Keyboard shortcuts</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>

              {/* Statistics Dashboard */}
              {stats.total > 0 && (
                <div className="px-6 py-4 border-b bg-muted/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        <span>Total</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileImage className="h-3.5 w-3.5" />
                        <span>Images</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.images}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Film className="h-3.5 w-3.5" />
                        <span>GIFs</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.gifs}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Aliases</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.aliases}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>This Week</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.thisWeek}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>This Month</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.thisMonth}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {stats.recentEmojis.length > 0 && (
                <div className="px-6 py-4 border-b bg-background">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Recent Activity</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stats.recentEmojis.map((emoji) => (
                      <TooltipProvider key={emoji.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-accent cursor-pointer transition-colors">
                              <div className="relative h-6 w-6">
                                <Image
                                  src={emoji.url}
                                  alt={emoji.name}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                              <span className="text-sm font-medium">:{emoji.name}:</span>
                              {emoji.url.toLowerCase().includes('.gif') && (
                                <Badge variant="default" className="text-xs px-1 py-0">GIF</Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Created {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters and Bulk Actions Bar */}
              <div className="px-6 py-3 border-b bg-background flex flex-wrap items-center gap-3">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {(filterType !== "all" || filterHasAliases !== "all") && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                      {(filterType !== "all" ? 1 : 0) + (filterHasAliases !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>

                {selectedEmojiNames.size > 0 && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedEmojiNames.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}

                {sortedEmojis.length > 0 && (
                  <>
                    <div className="h-6 w-px bg-border ml-auto" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectedEmojiNames.size === sortedEmojis.length ? clearSelection : selectAllEmojis}
                      className="gap-2"
                    >
                      {selectedEmojiNames.size === sortedEmojis.length ? (
                        <>
                          <Square className="h-4 w-4" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4" />
                          Select All
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="px-6 py-4 border-b bg-muted/20 space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-medium">Type</Label>
                      <ToggleGroup type="single" value={filterType} onValueChange={(value) => value && setFilterType(value as any)} className="justify-start">
                        <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
                        <ToggleGroupItem value="images" size="sm">Images</ToggleGroupItem>
                        <ToggleGroupItem value="gifs" size="sm">GIFs</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-medium">Aliases</Label>
                      <ToggleGroup type="single" value={filterHasAliases} onValueChange={(value) => value && setFilterHasAliases(value as any)} className="justify-start">
                        <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
                        <ToggleGroupItem value="with" size="sm">With Aliases</ToggleGroupItem>
                        <ToggleGroupItem value="without" size="sm">Without Aliases</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                  {(filterType !== "all" || filterHasAliases !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterType("all")
                        setFilterHasAliases("all")
                      }}
                      className="gap-2 h-8"
                    >
                      <X className="h-3 w-3" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}

              <CardContent>
              {loading || isRefreshing ? (
                viewMode === "table" ? (
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
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-24 w-24 rounded-lg" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                )
              ) : sortedEmojis.length === 0 ? (
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
              ) : (
                viewMode === "table" ? (
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
                        <TableRow key={emoji.name}>
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
                              ? new Date(emoji.created * 1000).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
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
                              <TooltipProvider>
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
                              </TooltipProvider>
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
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'} gap-4`}>
                    {sortedEmojis.map((emoji) => (
                      <div
                        key={emoji.name}
                        className={`group relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${selectedEmojiNames.has(emoji.name) ? 'bg-primary/10 border-primary shadow-md' : 'bg-card hover:shadow-md'}`}
                      >
                        {/* Selection Checkbox */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 left-2 h-6 w-6 bg-background/80 backdrop-blur-sm z-10"
                          onClick={() => toggleEmojiSelection(emoji.name)}
                        >
                          {selectedEmojiNames.has(emoji.name) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Type Badge */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                          <Badge variant={emoji.url.toLowerCase().includes('.gif') ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                            {emoji.url.toLowerCase().includes('.gif') ? (
                              <>
                                <Film className="h-3 w-3 mr-0.5" />
                                GIF
                              </>
                            ) : (
                              <>
                                <FileImage className="h-3 w-3 mr-0.5" />
                                IMG
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Emoji Image */}
                        <div className={`relative ${isMobile ? 'h-16 w-16' : 'h-24 w-24'} mt-4`}>
                          <Image
                            src={emoji.url}
                            alt={emoji.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>

                        {/* Emoji Info */}
                        <div className="text-center w-full">
                          <p className="font-medium text-sm truncate">:{emoji.name}:</p>
                          {emoji.created && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}
                            </p>
                          )}
                          {emoji.is_alias === 1 && emoji.alias_for ? (
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                alias of :{emoji.alias_for}:
                              </Badge>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const aliases = getAliasesForEmoji(emoji.name)
                                if (aliases.length > 0) {
                                  return (
                                    <div className="mt-1 flex flex-wrap gap-1 justify-center">
                                      {aliases.slice(0, 2).map(alias => (
                                        <Badge key={alias} variant="outline" className="text-xs">
                                          :{alias}:
                                        </Badge>
                                      ))}
                                      {aliases.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{aliases.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {isMobile ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 bg-background/80 backdrop-blur-sm"
                            onClick={() => {
                              setSelectedEmoji(emoji)
                              setIsActionsDrawerOpen(true)
                            }}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        ) : (
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleRename(emoji)}
                                disabled={emoji.is_alias === 1}
                                title={emoji.is_alias === 1 ? "Cannot rename aliases" : undefined}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Rename
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleReplace(emoji)}
                              >
                                <ImageUp className="h-3 w-3 mr-1" />
                                Replace
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleAddAlias(emoji)}
                              >
                                <LetterText className="h-3 w-3 mr-1" />
                                Add Alias
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDelete(emoji)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
          setProcessingFiles([])
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
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Select all / Deselect all</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">⌘A</kbd>
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
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">⌘/</kbd>
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

export default function MyEmojisPageWrapper() {
  return <MyEmojisPage />
}