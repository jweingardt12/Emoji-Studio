"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Emoji, getUserLeaderboard, type UserWithEmojiCount } from "@/lib/services/emoji-service"
import { ArrowLeft, Copy, Download, User, Calendar, Hash, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"

export default function EmojiDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const emojiName = decodeURIComponent(params.name as string)
  const fromExtension = searchParams.get('from') === 'extension'

  const { emojiData, loading } = useEmojiData()

  // Find the emoji synchronously using useMemo to prevent flash of "not found"
  const emoji = useMemo(() => {
    if (loading || emojiData.length === 0) return undefined; // undefined = still searching
    return emojiData.find(
      e => e.name.toLowerCase() === emojiName.toLowerCase()
    ) || null; // null = searched but not found
  }, [emojiData, loading, emojiName])

  // Find creator and their other emojis
  const { creator, creatorEmojis } = useMemo(() => {
    if (!emoji) return { creator: null, creatorEmojis: [] };

    const leaderboard = getUserLeaderboard(emojiData, Math.floor(Date.now() / 1000))
    const creatorInfo = leaderboard.find(u => u.user_id === emoji.user_id) || null

    const otherEmojis = emojiData.filter(e =>
      e.user_id === emoji.user_id &&
      e.name !== emoji.name &&
      !e.is_alias
    ).slice(0, 12)

    return { creator: creatorInfo, creatorEmojis: otherEmojis }
  }, [emoji, emojiData])

  const copyEmojiCode = () => {
    navigator.clipboard.writeText(`:${emojiName}:`)
    toast.success("Copied to clipboard!")
  }

  const downloadEmoji = async () => {
    if (!emoji) return
    try {
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(emoji.url)}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${emoji.name}.${emoji.url.includes('.gif') ? 'gif' : 'png'}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Downloaded!")
    } catch (error) {
      toast.error("Download failed")
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // undefined = still loading/searching, null = searched but not found
  if (loading || emoji === undefined) {
    return <EmojiDetailSkeleton />
  }

  if (emoji === null) {
    return <EmojiNotFound name={emojiName} />
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Back navigation */}
      <Link href="/explorer" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Explorer
      </Link>

      {/* Main emoji card */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Large emoji preview */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center p-4">
                <img
                  src={emoji.url}
                  alt={`:${emoji.name}:`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            {/* Emoji info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold font-mono mb-4">:{emoji.name}:</h1>

              <div className="space-y-4 mb-6">
                {/* Creator */}
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by</span>
                  <Link
                    href={`/explorer?search=${encodeURIComponent(emoji.user_id)}`}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {emoji.user_display_name || 'Unknown'}
                  </Link>
                </div>

                {/* Date */}
                {emoji.created && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Added on</span>
                    <span className="font-semibold">
                      {formatDate(emoji.created)}
                    </span>
                  </div>
                )}

                {/* Alias info */}
                {emoji.is_alias && emoji.alias_for && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Alias for</span>
                    <Link
                      href={`/emoji/${encodeURIComponent(emoji.alias_for)}`}
                      className="font-mono hover:text-primary transition-colors"
                    >
                      :{emoji.alias_for}:
                    </Link>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                <Button onClick={copyEmojiCode} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <Button onClick={downloadEmoji} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creator's other emojis */}
      {creatorEmojis.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>More from {emoji.user_display_name?.split(' ')[0] || 'this creator'}</span>
              {creator && creator.emoji_count > creatorEmojis.length && (
                <Link
                  href={`/explorer?search=${encodeURIComponent(emoji.user_id)}`}
                  className="text-sm font-normal text-primary hover:underline inline-flex items-center gap-1"
                >
                  View all {creator.emoji_count} emojis
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {creatorEmojis.map(e => (
                <Link
                  key={e.name}
                  href={`/emoji/${encodeURIComponent(e.name)}`}
                  className="group flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <img
                    src={e.url}
                    alt={`:${e.name}:`}
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                    :{e.name.length > 10 ? e.name.slice(0, 10) + '...' : e.name}:
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* From extension banner */}
      {fromExtension && (
        <div className="text-center text-sm text-muted-foreground">
          Opened from Emoji Studio Chrome Extension
        </div>
      )}
    </div>
  )
}

function EmojiDetailSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Skeleton className="w-32 h-6 mb-6" />
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-48 h-48 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-3 pt-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmojiNotFound({ name }: { name: string }) {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
      <div className="py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Emoji Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The emoji &quot;:{name}:&quot; was not found in your synced data.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/explorer">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Explorer
            </Button>
          </Link>
          <Link href="/settings">
            <Button>
              Sync Workspace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
