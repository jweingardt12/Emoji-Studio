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
      className="flex-none mb-4"
    >
      <div className="rounded-xl bg-card border border-border p-4 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <ChromeIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Import emojis from any website with our Chrome extension</p>
              <p className="text-xs text-muted-foreground">Connect to Slack in one click and add images, GIFs, or videos as emojis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              asChild
              className="group"
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
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
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
