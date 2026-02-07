"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { useCreatePageContext } from "./CreatePageContext"

interface ExtensionBannerProps {
  hasSlack: boolean
  loading: boolean
}

const FLOATING_BLOBS = [
  { className: "-top-12 -left-12 w-32 h-32 bg-blue-500/20", animate: { x: [0, 10, 0], y: [0, -10, 0] }, duration: 8, delay: 0 },
  { className: "-bottom-12 -right-12 w-32 h-32 bg-purple-500/20", animate: { x: [0, -10, 0], y: [0, 10, 0] }, duration: 8, delay: 1 },
  { className: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-pink-500/10", animate: { scale: [1, 1.2, 1] }, duration: 6, delay: 0.5 },
]

export const ExtensionBanner = memo(function ExtensionBanner({
  hasSlack,
  loading,
}: ExtensionBannerProps) {
  const { extensionBannerDismissed, handleDismissExtensionBanner } = useCreatePageContext()

  // Don't show if has Slack, loading, or dismissed
  if (hasSlack || loading || extensionBannerDismissed) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex-none mb-4 relative overflow-hidden"
    >
      {/* Glass container */}
      <div className="glass-liquid rounded-2xl p-4 relative" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12), 0 8px 32px 0 rgba(0,0,0,0.4), 0 0 0 1px var(--wrapped-glass-border)' }}>
        {/* Floating gradient blobs in background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {FLOATING_BLOBS.map((blob, i) => (
            <motion.div
              key={i}
              className={`absolute ${blob.className} rounded-full blur-3xl`}
              animate={blob.animate}
              transition={{
                duration: blob.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: blob.delay
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Animated icon container */}
            <motion.div
              className="flex-shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <ChromeIcon className="h-5 w-5 text-blue-400" />
            </motion.div>
            <div>
              <p className="text-sm font-medium">Import emojis from any website with our Chrome extension</p>
              <p className="text-xs text-muted-foreground">Connect to Slack in one click and add images, GIFs, or videos as emojis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Gradient CTA button */}
            <Button
              size="sm"
              asChild
              className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <a
                href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ChromeIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Get Extension</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                {/* Shimmer effect */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/10"
              onClick={handleDismissExtensionBanner}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
