"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, Check, Hash, ChevronDown, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { springSnappy } from "@/lib/motion"

interface ScanProgressProps {
  status: "idle" | "scanning" | "complete" | "error"
  currentChannel: string
  channelsDone: number
  channelsTotal: number
  reactionsFound: number
  onCancel: () => void
  onRetry?: () => void
  scannedChannels?: string[]
}

export function ScanProgress({
  status,
  currentChannel,
  channelsDone,
  channelsTotal,
  reactionsFound,
  onCancel,
  onRetry,
  scannedChannels = [],
}: ScanProgressProps) {
  const [expanded, setExpanded] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => {
    if (status === "complete" && channelsDone > 0) {
      setShowComplete(true)
      const timer = setTimeout(() => setShowComplete(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [status, channelsDone])

  const percent =
    channelsTotal > 0 ? Math.round((channelsDone / channelsTotal) * 100) : 0

  // Determine which state to render
  const activeState =
    status === "error" ? "error" :
    showComplete && status === "complete" ? "complete" :
    status === "scanning" ? "scanning" :
    null

  return (
    <AnimatePresence mode="wait">
      {activeState === "error" && (
        <motion.div
          key="error"
          className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springSnappy}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Scan failed</p>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Check your connection and try again.
              </p>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {activeState === "complete" && (
        <motion.div
          key="complete"
          className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springSnappy}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Scan complete</p>
              <p className="text-xs text-muted-foreground">
                Found {reactionsFound.toLocaleString()} reactions across {channelsDone} channel{channelsDone !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {activeState === "scanning" && (
        <motion.div
          key="scanning"
          className="rounded-xl border bg-card overflow-hidden"
          initial={{ opacity: 0, scale: 0.98, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={springSnappy}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative shrink-0">
              <motion.div
                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-sm font-bold tabular-nums text-primary">
                  {percent}
                </span>
              </motion.div>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" className="text-muted/40" />
                <motion.circle
                  cx="16" cy="16" r="14"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={88} // 2 * pi * r(14) = 87.96
                  animate={{ strokeDashoffset: 88 - (88 * percent) / 100 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                <motion.span
                  key={currentChannel}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium truncate"
                >
                  {currentChannel || "..."}
                </motion.span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{channelsDone}/{channelsTotal}</span>
                <span className="text-border">|</span>
                <motion.span
                  key={reactionsFound}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="tabular-nums font-medium text-foreground"
                >
                  {reactionsFound.toLocaleString()}
                </motion.span>
                <span>reactions</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {scannedChannels.length > 0 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-7 px-2 text-xs text-muted-foreground gap-1"
                >
                  <Check className="h-3 w-3 text-primary" />
                  {scannedChannels.length}
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                </Button>
              )}
              <Button
                variant="ghost" size="sm"
                onClick={onCancel}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Cancel scan"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="h-0.5 w-full bg-muted/40">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 px-4 py-3 bg-muted/20 max-h-[120px] overflow-y-auto">
                  {scannedChannels.map((name, i) => (
                    <motion.span
                      key={name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i, 20) * 0.02, duration: 0.15 }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <Check className="h-2.5 w-2.5 text-primary" />
                      {name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
