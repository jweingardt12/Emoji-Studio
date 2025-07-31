"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { Download, Plus, CheckCircle } from "lucide-react"

interface ChromeExtensionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChromeExtensionModal({ isOpen, onClose }: ChromeExtensionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChromeIcon className="h-5 w-5 text-blue-500" />
            Install Chrome Extension
          </DialogTitle>
          <DialogDescription>
            Follow these steps to install the Emoji Studio Chrome extension
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                <Download className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">1. Download the extension</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to download the latest version of the extension
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                <Plus className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">2. Open Chrome Extensions</p>
                <p className="text-sm text-muted-foreground">
                  Go to <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome://extensions/</code> in your browser
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">3. Enable Developer Mode & Load Extension</p>
                <p className="text-sm text-muted-foreground">
                  Toggle "Developer mode" on, click "Load unpacked", and select the extracted extension folder
                </p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> After installation, you can right-click any image on the web and select "Send to Emoji Studio" to instantly create emojis!
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            asChild
          >
            <a 
              href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa?utm_source=item-share-cb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Extension
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}