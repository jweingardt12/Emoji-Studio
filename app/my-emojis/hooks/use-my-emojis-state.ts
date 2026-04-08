"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useIsClient } from "@/hooks/use-is-client"
import { useRouter } from "next/navigation"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { type Emoji } from "@/lib/services/emoji-service"
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { getWorkspaceDisplayName } from "@/lib/utils/workspace"
import { downloadEmojisInParallel, saveZipFile } from "@/lib/utils/download-utils"
import { useTrack } from "@/lib/hooks/use-track"

/**
 * Extended Emoji type used in the My Emojis page.
 * Adds optional fields that may come from the Slack API but aren't in the base Emoji type.
 */
export interface MyEmoji extends Emoji {
  aliases?: string[]
}

export type ViewMode = "table" | "grid"
export type SortColumn = "name" | "created" | null
export type SortDirection = "asc" | "desc"
export type FilterType = "all" | "images" | "gifs"
export type FilterHasAliases = "all" | "with" | "without"

export interface EmojiStats {
  total: number
  images: number
  gifs: number
  aliases: number
  thisWeek: number
  thisMonth: number
  newest: MyEmoji | null
  recentEmojis: MyEmoji[]
}

export function useMyEmojisState() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { emojiData, loading, hasRealData, workspace, workspaceDisplayName, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const track = useTrack()
  const hasTrackedPage = useRef(false)
  const isClient = useIsClient()

  // Core selection state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState<MyEmoji | null>(null)

  // Dialog open states
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const [isAliasDialogOpen, setIsAliasDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false)

  // Form state
  const [newName, setNewName] = useState("")
  const [newAlias, setNewAlias] = useState("")

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [sortColumn, setSortColumn] = useState<SortColumn>("created")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Loading states
  const [isDeletingEmoji, setIsDeletingEmoji] = useState(false)
  const [isAddingAlias, setIsAddingAlias] = useState(false)
  const [isRenamingEmoji, setIsRenamingEmoji] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // File/processing states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processedEmoji, setProcessedEmoji] = useState<ProcessedEmoji | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<File[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [processingError, setProcessingError] = useState<string>("")

  // Filter states
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterHasAliases, setFilterHasAliases] = useState<FilterHasAliases>("all")
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection states
  const [selectedEmojiNames, setSelectedEmojiNames] = useState<Set<string>>(new Set())

  // Keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Search input ref for focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Function to refresh emoji data from Slack
  const refreshEmojiData = useCallback(async () => {
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
      let emojiArray: any[] = []
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
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: recentData,
            workspace: workspaceName,
            timestamp: Date.now()
          }
        }))
      }
    } catch (error) {
      console.error("Error refreshing emoji data:", error)
      toast.error("Failed to refresh emoji data", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [hasRealData, isRefreshing, emojiData, workspace, setEmojiData, setWorkspace, setHasRealData])

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl || !hasRealData) {
        setIsAuthChecking(false)
      } else {
        setIsAuthChecking(false)

        const lastRefreshTime = localStorage.getItem("lastEmojiRefreshTime")
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > fiveMinutes) {
          await refreshEmojiData()
          localStorage.setItem("lastEmojiRefreshTime", now.toString())
        }
      }
    }

    checkAuth()
  }, [router, hasRealData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track page view
  useEffect(() => {
    if (isClient && !hasTrackedPage.current) {
      hasTrackedPage.current = true
      const myEmojiCount = emojiData.filter((emoji: any) =>
        hasRealData ? emoji.can_delete === true && emoji.is_alias !== 1 : emoji.is_alias !== 1
      ).length
      track('my_emojis:viewed', { emoji_count: myEmojiCount })
    }
  }, [isClient, emojiData, hasRealData, track])

  // Filter emojis to show only those created by the current user
  const myEmojis = useMemo(() => emojiData.filter((emoji: any) => {
    if (!hasRealData) return emoji.is_alias !== 1
    return emoji.can_delete === true && emoji.is_alias !== 1
  }), [emojiData, hasRealData])

  const aliasMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of emojiData) {
      if ((e as any).is_alias === 1 && (e as any).alias_for) {
        const existing = map.get((e as any).alias_for)
        if (existing) existing.push((e as any).name)
        else map.set((e as any).alias_for, [(e as any).name])
      }
    }
    return map
  }, [emojiData])

  const getAliasesForEmoji = useCallback(
    (emojiName: string) => aliasMap.get(emojiName) || [],
    [aliasMap]
  )

  // Calculate statistics
  const stats = useMemo((): EmojiStats => {
    const totalEmojis = myEmojis.length
    const images = myEmojis.filter((e: any) => !e.url.toLowerCase().includes('.gif')).length
    const gifs = myEmojis.filter((e: any) => e.url.toLowerCase().includes('.gif')).length

    const totalAliases = myEmojis.reduce((count: number, emoji: any) => {
      return count + getAliasesForEmoji(emoji.name).length
    }, 0)

    const now = Date.now() / 1000
    const oneWeekAgo = now - (7 * 24 * 60 * 60)
    const oneMonthAgo = now - (30 * 24 * 60 * 60)

    const thisWeek = myEmojis.filter((e: any) => e.created && e.created >= oneWeekAgo).length
    const thisMonth = myEmojis.filter((e: any) => e.created && e.created >= oneMonthAgo).length

    const newestEmoji = myEmojis.reduce((newest: MyEmoji | null, emoji: any) => {
      if (!emoji.created) return newest
      if (!newest || emoji.created > newest.created) return emoji
      return newest
    }, null as MyEmoji | null)

    const recentEmojis = [...myEmojis]
      .filter((e: any) => e.created)
      .sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
      .slice(0, 5) as MyEmoji[]

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
  }, [myEmojis, getAliasesForEmoji])

  // Filter by search query and filters
  const filteredEmojis = useMemo(() => myEmojis.filter((emoji: any) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = emoji.name.toLowerCase().includes(query) ||
           emoji.user_display_name?.toLowerCase().includes(query)

    if (!matchesSearch) return false

    if (filterType === "images" && emoji.url.toLowerCase().includes('.gif')) return false
    if (filterType === "gifs" && !emoji.url.toLowerCase().includes('.gif')) return false

    if (filterHasAliases !== "all") {
      const aliases = getAliasesForEmoji(emoji.name)
      if (filterHasAliases === "with" && aliases.length === 0) return false
      if (filterHasAliases === "without" && aliases.length > 0) return false
    }

    return true
  }), [myEmojis, searchQuery, filterType, filterHasAliases, getAliasesForEmoji])

  // Sort filtered emojis
  const sortedEmojis = useMemo(() => [...filteredEmojis].sort((a: any, b: any) => {
    if (!sortColumn) return 0

    let aValue: any = a[sortColumn]
    let bValue: any = b[sortColumn]

    if (sortColumn === 'name') {
      aValue = a.name.toLowerCase()
      bValue = b.name.toLowerCase()
    } else if (sortColumn === 'created') {
      aValue = a.created || 0
      bValue = b.created || 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  }), [filteredEmojis, sortColumn, sortDirection])

  // Handle sort column click
  const handleSort = useCallback((column: "name" | "created") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection])

  // Bulk selection handlers
  const toggleEmojiSelection = useCallback((emojiName: string) => {
    setSelectedEmojiNames(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(emojiName)) {
        newSelected.delete(emojiName)
      } else {
        newSelected.add(emojiName)
      }
      return newSelected
    })
  }, [])

  const selectAllEmojis = useCallback(() => {
    const allNames = new Set(sortedEmojis.map((e: any) => e.name))
    setSelectedEmojiNames(allNames)
  }, [sortedEmojis])

  const clearSelection = useCallback(() => {
    setSelectedEmojiNames(new Set())
  }, [])

  // Copy actions
  const copyToClipboard = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }, [])

  const copyEmojiName = useCallback((emoji: MyEmoji) => {
    copyToClipboard(`:${emoji.name}:`, "Emoji name copied!")
  }, [copyToClipboard])

  const copyEmojiUrl = useCallback((emoji: MyEmoji) => {
    copyToClipboard(emoji.url, "Emoji URL copied!")
  }, [copyToClipboard])

  const copyEmojiMarkdown = useCallback((emoji: MyEmoji) => {
    const markdown = `![${emoji.name}](${emoji.url})`
    copyToClipboard(markdown, "Markdown copied!")
  }, [copyToClipboard])

  const copyImageToClipboard = useCallback(async (emoji: MyEmoji) => {
    try {
      if (emoji.url.toLowerCase().includes('.gif')) {
        await navigator.clipboard.writeText(emoji.url)
        toast.success("GIF URL copied! (Animated GIFs can't be copied as images)")
        return
      }

      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(emoji.url)}`)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()

      if (!ClipboardItem.supports(blob.type)) {
        await navigator.clipboard.writeText(emoji.url)
        toast.success("Image URL copied! (Image format not supported for clipboard)")
        return
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      toast.success("Image copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy image to clipboard")
    }
  }, [])

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (selectedEmojiNames.size === 0) return

    const confirmed = confirm(`Are you sure you want to delete ${selectedEmojiNames.size} emoji${selectedEmojiNames.size > 1 ? 's' : ''}?`)
    if (!confirmed) return

    toast.loading(`Deleting ${selectedEmojiNames.size} emojis...`, { id: "bulk-delete" })

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
        toast.success(`Deleted ${successCount} emoji${successCount > 1 ? 's' : ''}`, {
          id: "bulk-delete",
          description: failCount > 0 ? `${failCount} failed` : undefined
        })

        setEmojiData((prevData: any[]) => {
          const updatedData = prevData.filter((emoji: any) => {
            if (selectedEmojiNames.has(emoji.name)) return false
            if (emoji.is_alias === 1 && selectedEmojiNames.has(emoji.alias_for || '')) return false
            return true
          })

          safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-bulk-delete" })
          return updatedData
        })

        clearSelection()

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
      toast.error("Bulk delete failed", {
        id: "bulk-delete",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    }
  }, [selectedEmojiNames, clearSelection, setEmojiData, refreshEmojiData])

  const handleBulkDownload = useCallback(async () => {
    if (selectedEmojiNames.size === 0) return

    toast.loading(`Downloading ${selectedEmojiNames.size} emojis...`, { id: "bulk-download" })

    try {
      const emojisToDownload = sortedEmojis.filter((e: any) => selectedEmojiNames.has(e.name))

      const { zip, errors, successCount } = await downloadEmojisInParallel(emojisToDownload, {
        batchSize: 10,
      })

      await saveZipFile(zip, `my-emojis-${Date.now()}.zip`)

      if (errors.length > 0) {
        toast.success(`Downloaded ${successCount} emojis (${errors.length} failed)`, { id: "bulk-download" })
      } else {
        toast.success(`Downloaded ${successCount} emojis`, { id: "bulk-download" })
      }
    } catch (error) {
      toast.error("Failed to download emojis", { id: "bulk-download" })
    }
  }, [selectedEmojiNames, sortedEmojis])

  const handleBulkCopyNames = useCallback(() => {
    if (selectedEmojiNames.size === 0) return

    const names = Array.from(selectedEmojiNames).map(name => `:${name}:`).join('\n')
    copyToClipboard(names, `Copied ${selectedEmojiNames.size} emoji names!`)
  }, [selectedEmojiNames, copyToClipboard])

  const handleBulkCopyUrls = useCallback(() => {
    if (selectedEmojiNames.size === 0) return

    const emojisToGet = sortedEmojis.filter((e: any) => selectedEmojiNames.has(e.name))
    const urls = emojisToGet.map((e: any) => e.url).join('\n')
    copyToClipboard(urls, `Copied ${selectedEmojiNames.size} emoji URLs!`)
  }, [selectedEmojiNames, sortedEmojis, copyToClipboard])

  // Single emoji action handlers
  const handleRename = useCallback((emoji: MyEmoji) => {
    setSelectedEmoji(emoji)
    setNewName(emoji.name)
    setIsRenameDialogOpen(true)
  }, [])

  const handleReplace = useCallback((emoji: MyEmoji) => {
    setSelectedEmoji(emoji)
    setIsReplaceDialogOpen(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleAddAlias = useCallback((emoji: MyEmoji) => {
    setSelectedEmoji(emoji)
    setNewAlias("")
    setIsAliasDialogOpen(true)
  }, [])

  const handleDelete = useCallback((emoji: MyEmoji) => {
    setSelectedEmoji(emoji)
    setIsDeleteDialogOpen(true)
  }, [])

  const performRename = useCallback(async () => {
    if (!selectedEmoji || !newName || newName === selectedEmoji.name || isRenamingEmoji) return

    if (selectedEmoji.is_alias === 1) {
      toast.error("Cannot rename an alias", {
        description: "You can only rename actual emojis, not aliases"
      })
      return
    }

    if (emojiData.some((e: any) => e.name === newName)) {
      toast.error("Name already exists", {
        description: `An emoji with the name "${newName}" already exists.`
      })
      return
    }

    setIsRenamingEmoji(true)

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        toast.error("No Slack connection", {
          description: "Please configure Slack in Settings first."
        })
        setIsRenamingEmoji(false)
        return
      }

      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        toast.error("Invalid Slack credentials", {
          description: parsed.error || "Please update your curl command in Settings."
        })
        setIsRenamingEmoji(false)
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed

      if (!token) {
        toast.error("No authentication token found", {
          id: "rename-emoji",
          description: "Please reconnect to Slack in Settings"
        })
        setIsRenamingEmoji(false)
        return
      }

      toast.loading("Downloading emoji...", { id: "rename-emoji" })

      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(selectedEmoji.url)}`
      const imageResponse = await fetch(proxyUrl)
      if (!imageResponse.ok) {
        throw new Error("Failed to download emoji image")
      }

      const imageBlob = await imageResponse.blob()

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

      toast.loading("Deleting old emoji...", { id: "rename-emoji" })

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
        if (deleteSlackResponse.error === "emoji_not_found") {
          throw new Error(`Emoji "${selectedEmoji.name}" was not found. It may have already been deleted.`)
        }
        throw new Error(deleteSlackResponse.error || "Failed to delete old emoji")
      }

      toast.loading("Uploading with new name...", { id: "rename-emoji" })

      const workspaceMatch = parsed.url?.match(/https:\/\/([^.]+)\.slack\.com/)
      const ws = workspaceMatch?.[1] || 'slack-workspace'
      const urlParams = parsed.url ? new URL(parsed.url).searchParams : new URLSearchParams()
      const xId = urlParams.get("_x_id") || parsed.xId || ""
      const slackRoute = urlParams.get("slack_route") || parsed.teamId || ""

      const headers: Record<string, string> = {
        "Accept": "*/*",
        "Origin": `https://${ws}.slack.com`,
        "Referer": `https://${ws}.slack.com/`,
      }

      if (parsed.cookie) {
        headers["Cookie"] = parsed.cookie
      }

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

      const properUploadUrl = `https://${ws}.slack.com/api/emoji.add?_x_id=${uploadXId}&slack_route=${slackRoute}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`

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

        if (uploadResult.error === "error_name_taken" || uploadResult.details?.error === "error_name_taken") {
          errorMessage = `The emoji name ":${newName}:" is already taken. Please choose a different name.`
        } else if (uploadResult.error) {
          errorMessage = uploadResult.error
        }

        throw new Error(errorMessage)
      }

      toast.success('Emoji renamed successfully', {
        id: "rename-emoji",
        description: `"${selectedEmoji.name}" → "${newName}"`
      })

      setEmojiData((prevData: any[]) => {
        const updatedData = prevData.map((emoji: any) => {
          if (emoji.name === selectedEmoji.name) {
            return { ...emoji, name: newName }
          }
          if (emoji.is_alias === 1 && emoji.alias_for === selectedEmoji.name) {
            return { ...emoji, alias_for: newName }
          }
          return emoji
        })

        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-rename" })
        return updatedData
      })

      setIsRenameDialogOpen(false)

      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      toast.error("Failed to rename emoji", {
        id: "rename-emoji",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsRenamingEmoji(false)
    }
  }, [selectedEmoji, newName, isRenamingEmoji, emojiData, setEmojiData, refreshEmojiData])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [selectedEmoji])

  const performReplace = useCallback(async () => {
    if (!selectedEmoji || !processedEmoji) return

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        toast.error("No Slack connection", {
          description: "Please configure Slack in Settings first.",
        })
        return
      }

      const parsed = parseSlackCurl(slackCurl)
      if (!parsed.isValid) {
        throw new Error("Invalid Slack configuration")
      }

      const workspaceUrl = parsed.workspace || workspace
      const boundary = `----WebKitFormBoundaryReplace${Date.now()}`

      toast.loading("Deleting old emoji...", { id: "replace-emoji" })

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

      if (!deleteResult.ok && deleteResult.slackResponse && !deleteResult.slackResponse.ok) {
        throw new Error(deleteResult.slackResponse?.error || "Failed to delete old emoji")
      }

      toast.loading("Uploading new image...", { id: "replace-emoji" })

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

      toast.success("Emoji replaced successfully", {
        id: "replace-emoji",
        description: `"${selectedEmoji.name}" has been updated with the new image`
      })

      setEmojiData((prevData: any[]) => {
        const updatedData = prevData.map((emoji: any) => {
          if (emoji.name === selectedEmoji.name) {
            return { ...emoji, created: Math.floor(Date.now() / 1000) }
          }
          return emoji
        })

        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-replace" })
        return updatedData
      })

      setIsReplaceDialogOpen(false)
      setIsProcessing(false)
      setProcessedEmoji(null)

      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      toast.error("Failed to replace emoji", {
        id: "replace-emoji",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    }
  }, [selectedEmoji, processedEmoji, workspace, setEmojiData, refreshEmojiData])

  const performAddAlias = useCallback(async () => {
    if (!selectedEmoji || !newAlias || isAddingAlias) return

    if (emojiData.some((e: any) => e.name === newAlias)) {
      toast.error("Alias already exists", {
        description: `The alias "${newAlias}" is already in use.`
      })
      return
    }

    setIsAddingAlias(true)
    toast.loading("Creating alias...", { id: "add-alias" })

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        toast.error("No Slack connection", {
          id: "add-alias",
          description: "Please configure Slack in Settings first."
        })
        setIsAddingAlias(false)
        return
      }

      const parsed = parseSlackCurl(slackCurl)

      if (!parsed.isValid) {
        toast.error("Invalid Slack credentials", {
          id: "add-alias",
          description: parsed.error || "Please update your curl command in Settings."
        })
        setIsAddingAlias(false)
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed

      if (!token) {
        toast.error("No authentication token found", {
          id: "add-alias",
          description: "Please reconnect to Slack in Settings"
        })
        setIsAddingAlias(false)
        return
      }

      const boundary = `WebKitFormBoundary${Math.random().toString(16).substr(2, 16)}`

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

      let xId = ""
      if (cookie) {
        const dCookieMatch = cookie.match(/d=([^;]+)/)
        if (dCookieMatch && dCookieMatch[1]) {
          const dValue = dCookieMatch[1]
          const lastSemicolon = dValue.lastIndexOf(';')
          if (lastSemicolon !== -1) {
            xId = dValue.substring(lastSemicolon + 1).trim()
          }
        }
      }

      if (!xId) {
        const urlParams = parsed.url ? new URL(parsed.url).searchParams : new URLSearchParams()
        xId = urlParams.get("_x_id") || parsed.xId || ""
      }

      const slackRoute = parsed.teamId || ""

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

      toast.success("Alias added successfully", {
        id: "add-alias",
        description: `"${newAlias}" → "${selectedEmoji.name}"`
      })

      setEmojiData((prevData: any[]) => {
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

        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-add-alias" })
        return updatedData
      })

      setNewAlias("")
      setIsAliasDialogOpen(false)

      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      toast.error("Failed to add alias", {
        id: "add-alias",
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsAddingAlias(false)
    }
  }, [selectedEmoji, newAlias, isAddingAlias, emojiData, setEmojiData, refreshEmojiData])

  const performDelete = useCallback(async () => {
    if (!selectedEmoji || isDeletingEmoji) return

    setIsDeletingEmoji(true)

    try {
      const slackCurl = localStorage.getItem("slackCurlCommand")
      if (!slackCurl) {
        toast.error("No Slack connection", {
          description: "Please configure Slack in Settings first."
        })
        setIsDeletingEmoji(false)
        return
      }

      const parsed = parseSlackCurl(slackCurl)

      if (!parsed.isValid) {
        toast.error("Invalid Slack credentials", {
          description: parsed.error || "Please update your curl command in Settings.",
        })
        return
      }

      const { token, cookie, workspace: workspaceUrl } = parsed

      let actualToken = token || ""

      const dataRawMatch = slackCurl.match(/--data-raw\s+["']([^"']+)["']/)
      if (dataRawMatch) {
        const dataRaw = dataRawMatch[1]
        const tokenInDataMatch = dataRaw.match(/name=["']token["']\s*\\r\\n\\r\\n([^\\]+)/)
        if (tokenInDataMatch) {
          actualToken = tokenInDataMatch[1].trim()
        }
      }

      const formData: Record<string, string> = {
        token: actualToken || token || "",
        name: selectedEmoji.name,
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

      let result;
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError)
        const text = await response.text()
        console.error("Response text:", text)
        throw new Error("Invalid response from server")
      }

      const slackResponse = result.slackResponse || result
      if (!response.ok || !slackResponse.ok) {
        throw new Error(slackResponse.error || "Failed to delete emoji")
      }

      toast.success(`Emoji deleted!`, {
        description: `Successfully deleted "${selectedEmoji.name}"`
      })

      track('my_emojis:emoji_deleted', { emoji_name: selectedEmoji.name })

      setEmojiData((prevData: any[]) => {
        const updatedData = prevData.filter((emoji: any) => {
          if (emoji.name === selectedEmoji.name) return false
          if (emoji.is_alias === 1 && emoji.alias_for === selectedEmoji.name) return false
          return true
        })

        safePersistEmojiDataToLocalStorage(updatedData, { source: "my-emojis-delete" })
        return updatedData
      })

      setIsDeleteDialogOpen(false)

      setTimeout(async () => {
        try {
          await refreshEmojiData()
        } catch (error) {
          console.error('Background refresh failed:', error)
        }
      }, 2000)
    } catch (error) {
      toast.error("Failed to delete emoji", {
        description: error instanceof Error ? error.message : "An error occurred"
      })
    } finally {
      setIsDeletingEmoji(false)
    }
  }, [selectedEmoji, isDeletingEmoji, track, setEmojiData, refreshEmojiData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          selectAllEmojis()
        }
      }

      if (e.key === 'Escape') {
        if (selectedEmojiNames.size > 0) {
          clearSelection()
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardHelp(prev => !prev)
      }

      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowFilters(prev => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedEmojiNames.size, selectAllEmojis, clearSelection])

  return {
    // From useEmojiData
    emojiData,
    loading,
    hasRealData,
    workspace,
    workspaceDisplayName,

    // Client/mobile
    isClient,
    isMobile,

    // Core data
    myEmojis,
    sortedEmojis,
    stats,
    getAliasesForEmoji,

    // Search
    searchQuery,
    setSearchQuery,
    searchInputRef,

    // View
    viewMode,
    setViewMode,
    sortColumn,
    sortDirection,
    handleSort,

    // Selection
    selectedEmoji,
    setSelectedEmoji,
    selectedEmojiNames,
    toggleEmojiSelection,
    selectAllEmojis,
    clearSelection,

    // Filters
    filterType,
    setFilterType,
    filterHasAliases,
    setFilterHasAliases,
    showFilters,
    setShowFilters,

    // Dialog open states
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    isReplaceDialogOpen,
    setIsReplaceDialogOpen,
    isAliasDialogOpen,
    setIsAliasDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isActionsDrawerOpen,
    setIsActionsDrawerOpen,
    showKeyboardHelp,
    setShowKeyboardHelp,

    // Form state
    newName,
    setNewName,
    newAlias,
    setNewAlias,

    // Loading states
    isDeletingEmoji,
    isAddingAlias,
    isRenamingEmoji,
    isAuthChecking,
    isRefreshing,

    // File processing
    fileInputRef,
    selectedFile,
    setSelectedFile,
    processedEmoji,
    setProcessedEmoji,
    isProcessing,
    setIsProcessing,
    processingFiles,
    currentFileIndex,
    currentStep,
    setCurrentStep,
    processingError,
    setProcessingError,

    // Actions
    refreshEmojiData,
    handleRename,
    handleReplace,
    handleAddAlias,
    handleDelete,
    performRename,
    performReplace,
    performAddAlias,
    performDelete,
    handleFileSelect,

    // Copy actions
    copyEmojiName,
    copyEmojiUrl,
    copyEmojiMarkdown,
    copyImageToClipboard,

    // Bulk actions
    handleBulkDelete,
    handleBulkDownload,
    handleBulkCopyNames,
    handleBulkCopyUrls,
  }
}
