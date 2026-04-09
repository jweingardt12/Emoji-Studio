"use client"

import { useEffect, useCallback } from "react"
import { useTrack } from "@/lib/hooks/use-track"
import { toast } from "sonner"

interface ExtensionMessageHandlerOptions {
  onProcessFiles: (files: File[]) => void
  onSetSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>
  onSetPendingMobileFile: React.Dispatch<React.SetStateAction<File | null>>
  isMobile: boolean | null
}

export function useExtensionMessages({
  onProcessFiles,
  onSetSelectedFiles,
  onSetPendingMobileFile,
  isMobile,
}: ExtensionMessageHandlerOptions) {
  const track = useTrack()

  const handleExtensionMessage = useCallback(async (event: MessageEvent) => {
    if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) return;

    if (event.data.type === 'EMOJI_STUDIO_CART_DATA') {
      const cartData = event.data.data
      const emojis = cartData?.emojis || []

      if (emojis.length > 0) {
        toast(`Processing ${emojis.length} emojis from cart`, {
          description: "Please wait while we load your emojis...",
        })

        // Convert emojis to files
        const files: File[] = []

        for (const emoji of emojis) {
          try {
            // Use image proxy to avoid CORS issues
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`
            const response = await fetch(proxyUrl)
            const blob = await response.blob()

            // Determine file extension
            let extension = 'png'
            if (blob.type.includes('gif') || emoji.url.toLowerCase().includes('.gif')) extension = 'gif'
            else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) extension = 'jpg'
            else if (blob.type.includes('webp')) extension = 'webp'

            const fileName = `${emoji.name}.${extension}`
            const file = new File([blob], fileName, { type: blob.type })

            // Add HDR metadata if applicable
            if (emoji.isHDR) {
              (file as any).isHDR = true
              ;(file as any).originalUrl = emoji.originalUrl || emoji.url
            }

            files.push(file)
          } catch (error) {
          }
        }

        if (files.length > 0) {
          onSetSelectedFiles(files)

          // Track the cart sync event
          track('chrome_extension_cart_synced', {
            emojiCount: files.length,
            workspace: cartData.workspace || 'unknown',
            source: 'extension-cart'
          })

          // Auto-start processing
          setTimeout(() => {
            onProcessFiles(files)
          }, 500)
        }
      }
    } else if (event.data.type === 'EMOJI_STUDIO_CREATE_EMOJI') {
      // Handle both new format (imageUrl directly) and old format (data object)
      const imageUrl = event.data.imageUrl || event.data.data?.imageUrl
      const originalUrl = event.data.originalUrl || event.data.data?.originalUrl
      const emojiName = event.data.emojiName || event.data.data?.name
      const isHDR = event.data.isHDR || event.data.data?.isHDR

      if (!imageUrl) {
        return
      }

      // Track the event
      track("chrome_extension_emoji_received", {
        emojiName: emojiName || 'unnamed',
        isHDR: isHDR || false,
        source: 'chrome-extension-direct'
      })

      try {
        // Show loading toast
        toast.loading("Loading image from extension...", {
          description: "Please wait while we process the image.",
        })

        let file: File

        if (imageUrl.startsWith('data:')) {
          // Handle data URL
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          // Use emoji name if provided, otherwise extract from URL
          let extension = 'png'
          if (blob.type.includes('gif')) extension = 'gif'
          else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) extension = 'jpg'
          else if (blob.type.includes('webp')) extension = 'webp'

          const fileName = emojiName ?
            `${emojiName}.${extension}` :
            (originalUrl ? originalUrl.split('/').pop() || 'extension-image' : 'extension-image')
          file = new File([blob], fileName, { type: blob.type })
        } else if (isHDR) {
          // HDR image - special handling to preserve quality
          // Use proxy for external URLs to avoid CORS
          const fetchUrl = imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)
            ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
            : imageUrl
          const response = await fetch(fetchUrl)
          const blob = await response.blob()

          // Preserve original file extension and type for HDR
          const urlParts = imageUrl.split('/')
          const urlFileName = urlParts[urlParts.length - 1] || 'hdr-emoji'
          const fileName = emojiName ?
            `${emojiName}.${urlFileName.split('.').pop() || 'heic'}` :
            urlFileName

          // Create file with HDR metadata preserved
          file = new File([blob], fileName, {
            type: blob.type || 'image/heic'
          })

          // Mark as HDR for any special processing downstream
          ;(file as any).isHDR = true
          ;(file as any).originalUrl = imageUrl

        } else {
          // Try to fetch regular URL
          // Use proxy for external URLs to avoid CORS
          const fetchUrl = imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)
            ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
            : imageUrl
          const response = await fetch(fetchUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
          }

          const blob = await response.blob()
          // Use emoji name if provided, otherwise extract from URL
          const defaultName = imageUrl.split('/').pop() || 'extension-image'

          // Determine the correct MIME type
          let mimeType = blob.type

          // If no MIME type or generic type, try to infer from filename or content
          if (!mimeType || mimeType === 'application/octet-stream') {
            if (defaultName.toLowerCase().endsWith('.gif')) {
              mimeType = 'image/gif'
            } else if (defaultName.toLowerCase().endsWith('.png')) {
              mimeType = 'image/png'
            } else if (defaultName.toLowerCase().endsWith('.jpg') || defaultName.toLowerCase().endsWith('.jpeg')) {
              mimeType = 'image/jpeg'
            } else if (defaultName.toLowerCase().endsWith('.webp')) {
              mimeType = 'image/webp'
            } else {
              // Try to detect GIF by checking magic bytes
              const arrayBuffer = await blob.slice(0, 6).arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) { // GIF
                mimeType = 'image/gif'
              } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) { // PNG
                mimeType = 'image/png'
              } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) { // JPEG
                mimeType = 'image/jpeg'
              }
            }
          }

          // Determine extension from MIME type or filename
          let extension = 'png'
          if (mimeType.includes('gif') || defaultName.toLowerCase().endsWith('.gif')) extension = 'gif'
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg'
          else if (mimeType.includes('webp')) extension = 'webp'

          const fileName = emojiName ?
            `${emojiName}.${extension}` :
            defaultName

          file = new File([blob], fileName, { type: mimeType })
        }

        // Add to selected files and process
        onSetSelectedFiles([file])

        // Auto-process after a short delay
        setTimeout(() => {
          onProcessFiles([file])
        }, 500)

      } catch (error) {
        toast.error("Failed to load image", {
          description: error instanceof Error ? error.message : "Unknown error occurred",
        })

        track("Emoji Creator: Extension Image Load Failed", {
          imageUrl: imageUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }, [onProcessFiles, onSetSelectedFiles, track])

  useEffect(() => {
    // Check for pending file from mobile drawer
    const pendingFile = sessionStorage.getItem('pendingEmojiFile')
    if (pendingFile) {
      try {
        const fileData = JSON.parse(pendingFile)
        sessionStorage.removeItem('pendingEmojiFile')

        // Convert data URL to File
        fetch(fileData.dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], fileData.fileName, { type: fileData.fileType })

            // Check if mobile at this moment (window width < 768px)
            const isCurrentlyMobile = window.innerWidth < 768

            if (isCurrentlyMobile) {
              // Use mobile-optimized flow
              onSetPendingMobileFile(file)
            } else {
              // Use desktop flow
              onSetSelectedFiles([file])

              toast(`Processing ${fileData.source === 'camera' ? 'captured photo' : fileData.source === 'video' ? 'recorded video' : 'uploaded file'}`, {
                description: "Converting to emoji format...",
              })

              // Auto-start processing
              setTimeout(() => {
                onProcessFiles([file])
              }, 500)
            }
          })
          .catch(error => {
          })
      } catch (error) {
      }
    }

    // Check if we have pending emoji data from Slackmojis or cart
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('from') === 'extension') {
      const pendingData = window.sessionStorage.getItem('pendingEmojiFromSlackmojis')
      if (pendingData) {
        try {
          const emojiData = JSON.parse(pendingData)

          // Clear the session storage
          window.sessionStorage.removeItem('pendingEmojiFromSlackmojis')

          // Process the emoji data
          setTimeout(() => {
            handleExtensionMessage({
              data: {
                type: 'EMOJI_STUDIO_CREATE_EMOJI',
                imageUrl: emojiData.imageUrl,
                originalUrl: emojiData.originalUrl,
                emojiName: emojiData.name
              }
            } as MessageEvent)
          }, 500)
        } catch (error) {
        }
      }
    } else if (urlParams.get('from') === 'extension-cart') {
      // Handle cart data from extension
      // Cart data will be sent via postMessage from the extension's inject.js script
    }

    window.addEventListener('message', handleExtensionMessage)
    return () => window.removeEventListener('message', handleExtensionMessage)
  }, [handleExtensionMessage, isMobile, onProcessFiles, onSetPendingMobileFile, onSetSelectedFiles])
}
