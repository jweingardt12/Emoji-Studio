"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { generateDemoData } from "@/lib/demo-data"
import { BarChartBig, Users, Lock, Wand2, CheckCircle, GithubIcon, MessageSquare, Download } from "lucide-react"
import Link from "next/link"
import { EmojiWaterfall } from "./emoji-waterfall"
import { useAnalytics } from "@/lib/analytics"
import { useOpenPanel } from '@/lib/safe-openpanel'
import { TextShimmer } from '@/components/ui/text-shimmer';

// Simple mobile detection with SSR compatibility
function useIsMobile() {
  // Initialize to false for server-side rendering
  const [isMobile, setIsMobile] = useState(false)
  
  // Only run this effect on the client side
  useEffect(() => {
    // Set initial value immediately on client
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent))
    }
    
    // Run once on mount
    checkMobile()
    
    // Add event listener for resize
    window.addEventListener("resize", checkMobile)
    
    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  
  return isMobile
}

export function DashboardOverlay() {
  const { useDemoData, setUseDemoData, setHasRealData } = useEmojiData()
  const router = useRouter()
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false) // Initialize to false
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const [isMounted, setIsMounted] = useState(false)
  const [isAnimatedIn, setIsAnimatedIn] = useState(false)
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false) // New state
  const [showChatBubble, setShowChatBubble] = useState(false) // For chat bubble animation
  const [showEmojiWaterfall, setShowEmojiWaterfall] = useState(false) // For emoji waterfall animation
  const { track: opTrack } = useOpenPanel();

  // Check localStorage on mount and manage demo data
  useEffect(() => {
    const storedData = localStorage.getItem("emojiData")
    const hasData = !!(storedData && JSON.parse(storedData).length > 0)
    setHasLocalStorageData(hasData)
    setIsInitialCheckDone(true) // Mark initial check as done

    // If no data in localStorage, enable demo data (original logic)
    if (!hasData && !useDemoData) {
      setUseDemoData(true)
    }
  }, [useDemoData, setUseDemoData]) // Keep dependencies for demo data logic

  // Effect for entry animation, depends on initial check and data presence
  useEffect(() => {
    if (isInitialCheckDone && !hasLocalStorageData) {
      // Set mounted immediately to prevent background flash
      setIsMounted(true)
      
      // Small delay for smooth animation entrance
      const timer = setTimeout(() => {
        setIsAnimatedIn(true)
      }, 100) // 100ms delay for smooth entrance
      
      // Prevent scrolling when overlay is active
      document.body.style.overflow = 'hidden'
      
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    } else {
      setIsMounted(false) // Reset if overlay shouldn't be shown or check isn't done
      setIsAnimatedIn(false)
      // Re-enable scrolling when overlay is not active
      document.body.style.overflow = ''
    }

    // Cleanup function to ensure scrolling is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = ''
    }
  }, [isInitialCheckDone, hasLocalStorageData])

  // Effect for chat bubble animation - delay by 1.5 seconds
  useEffect(() => {
    if (isAnimatedIn) {
      const timer = setTimeout(() => {
        setShowChatBubble(true)
      }, 1500) // 1.5 second delay
      return () => clearTimeout(timer)
    } else {
      setShowChatBubble(false)
    }
  }, [isAnimatedIn])

  // Do not render anything until the initial local storage check is complete
  if (!isInitialCheckDone) {
    return null
  }

  // Show overlay only when there's no real data in localStorage
  if (hasLocalStorageData) {
    return null
  }

  // Function to import demo data with 3-second loading animation
  const importDemoData = async () => {
    setIsImporting(true)
    setImportError(null)
    try {
      console.log("Starting demo data import...")
      
      // Track demo data import event
      opTrack('demo_data_import_start', {
        source: 'dashboard_overlay'
      })
      
      // Get demo data
      const demoData = await generateDemoData()
      
      if (!demoData || demoData.length === 0) {
        throw new Error("Failed to generate demo data")
      }
      
      console.log(`Successfully generated ${demoData.length} demo emojis`)
      
      // Show loading animation for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Store demo data in localStorage
      localStorage.setItem("emojiData", JSON.stringify(demoData))
      localStorage.setItem("workspace", "Slack Emoji Collection")
      
      // Track successful demo data import
      opTrack('demo_data_import_success', {
        emoji_count: demoData.length,
        source: 'dashboard_overlay'
      })
      
      // Update state
      setHasRealData(true)
      
      // Dispatch event to notify components that emoji data has been updated
      window.dispatchEvent(new Event("emojiDataUpdated"))
      
      // Show emoji waterfall animation - IMPORTANT: Set this after data is loaded
      console.log("Starting emoji waterfall animation...")
      setShowEmojiWaterfall(true)
      
      // Wait for animation to complete before redirecting (4 seconds)
      // This matches the duration prop we'll pass to EmojiWaterfall
      await new Promise(resolve => setTimeout(resolve, 4000))
      console.log("Emoji animation complete, redirecting...")
      
      // Reset the animation state
      setShowEmojiWaterfall(false)
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error importing demo data:", error)
      setImportError(error instanceof Error ? error.message : "Failed to import demo data")
    } finally {
      setIsImporting(false)
    }
  };

  if (!isMounted) return null;
  
  const overlayContent = (
    <div
      className={`
        fixed inset-0 bg-black/70 backdrop-blur-sm
        flex items-center justify-center p-4
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        z-[99999]
        ${isAnimatedIn ? "opacity-100" : "opacity-0"}
      `}
      style={{ 
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        // Prevent clicks from going through to elements behind the overlay
        e.stopPropagation();
      }}
    >
      {/* Emoji Waterfall Animation */}
      <EmojiWaterfall show={showEmojiWaterfall} duration={4000} />
      <div
        className={`
          bg-card border border-border rounded-xl shadow-lg
          max-w-2xl w-full p-4 sm:p-6 md:p-8
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isMounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"}
        `}
      >
        <div className="flex flex-col items-center text-center mb-6">
          {/* Logo section with responsive positioning */}
          <div className={`relative ${isMobile ? 'mt-12 mb-12' : 'mb-4'}`}>
            {/* Glowing border container */}
            <div className="absolute inset-0 rounded-full glow-border"></div>
            {/* Logo container */}
            <div className="relative z-10 bg-primary/10 p-4 rounded-full flex items-center justify-center">
              <div className="relative w-16 h-16">
                <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
              </div>
            </div>
            {/* Chat Bubble with responsive positioning */}
            <div className={`
              absolute ${isMobile ? 'top-[-10px] right-[-10px]' : 'top-1/2 -translate-y-1/3 right-full mr-3'} 
              bg-black text-white ${isMobile ? 'text-[10px]' : 'text-sm'} ${isMobile ? 'px-2 py-1.5' : 'px-4 py-3'} rounded-md ${isMobile ? 'w-[130px]' : 'w-[220px]'} shadow-lg
              border border-white/30
              transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${showChatBubble ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 translate-x-4'}
            `}>
              <span className="leading-tight text-center block ${isMobile ? '' : 'font-medium'}">
                Sometimes the most<br/>
                important OKRs are LOLs
              </span>
              {/* Chat bubble tail pointing to logo - repositioned for mobile */}
              <div className={`absolute 
                ${isMobile ? 'left-[10px] bottom-[-8px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black' : 
                'right-[-8px] top-1/3 border-t-[6px] border-t-transparent border-l-[8px] border-l-black border-b-[6px] border-b-transparent'}`}>
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2">Emoji Studio</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-semibold mb-2">Emoji Studio is the Slack Custom Emoji dashboard you've been looking for.</h4>
            <ul className="space-y-2 my-4 text-muted-foreground">
              <li className="flex items-start">
                <BarChartBig className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                <span>Visualize emoji creation trends and usage patterns over time.</span>
              </li>
              <li className="flex items-start">
                <Users className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                <span>Understand company culture by seeing top emoji creators in your workspace.</span>
              </li>
              <li className="flex items-start">
                <Download className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                <span>Download one–or all–emojis for backup and portability.</span>
              </li>
              <li className="flex items-start">
                <Lock className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                <span>Securely import your Slack data locally – nothing leaves your browser.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  // Track about page navigation
                  opTrack('navigate', {
                    destination: 'about',
                    source: 'dashboard_overlay'
                  });
                  // Re-enable scrolling before navigation
                  document.body.style.overflow = '';
                  // Navigate immediately for better UX
                  router.push("/about");
                }}
                className="w-full sm:flex-1"
              >
                About this project
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  // Track settings page navigation
                  opTrack('navigate', {
                    destination: 'settings',
                    source: 'dashboard_overlay'
                  });
                  // Re-enable scrolling before navigation
                  document.body.style.overflow = '';
                  // Navigate immediately for better UX
                  router.push("/settings");
                }}
                className="w-full sm:flex-1"
              >
                Import your emojis →
              </Button>
            </div>
            <button
              onClick={async () => { 
                opTrack('button_click', { 
                  action: 'use_demo_data',
                  source: 'dashboard_overlay' 
                });
                setIsImporting(true);
                setImportError(null);
                try {
                  console.log("Starting demo data import...")
                  
                  // Track demo data import event
                  opTrack('demo_data_import_start', {
                    source: 'dashboard_overlay'
                  })
                  
                  // Get demo data
                  const demoData = await generateDemoData()
                  
                  if (!demoData || demoData.length === 0) {
                    throw new Error("Failed to generate demo data")
                  }
                  
                  console.log(`Successfully generated ${demoData.length} demo emojis`)
                  
                  // Show loading animation for 3 seconds
                  await new Promise(resolve => setTimeout(resolve, 3000))
                  
                  // Store demo data in localStorage
                  localStorage.setItem("emojiData", JSON.stringify(demoData))
                  localStorage.setItem("workspace", "Slack Emoji Collection")
                  
                  // Track successful demo data import
                  opTrack('demo_data_import_success', {
                    emoji_count: demoData.length,
                    source: 'dashboard_overlay'
                  })
                  
                  // Update state
                  setHasRealData(true)
                  
                  // Dispatch event to notify components that emoji data has been updated
                  window.dispatchEvent(new Event("emojiDataUpdated"))
                  
                  // Show emoji waterfall animation - IMPORTANT: Set this after data is loaded
                  console.log("Starting emoji waterfall animation...")
                  setShowEmojiWaterfall(true)
                  
                  // Wait for animation to complete before redirecting (4 seconds)
                  // This matches the duration prop we'll pass to EmojiWaterfall
                  await new Promise(resolve => setTimeout(resolve, 4000))
                  console.log("Emoji animation complete, redirecting...")
                  
                  // Reset the animation state
                  setShowEmojiWaterfall(false)
                  
                  // Redirect to dashboard
                  router.push("/dashboard")
                } catch (error) {
                  console.error("Error importing demo data:", error)
                  setImportError(error instanceof Error ? error.message : "Failed to import demo data")
                } finally {
                  setIsImporting(false)
                }
              }}
              disabled={isImporting}
              className="text-sm text-primary hover:text-primary/80 hover:underline mt-3 transition-colors"
            >
              {isImporting ? (
                <TextShimmer
                  duration={1.5}
                  className="text-sm"
                >
                  Importing...
                </TextShimmer>
              ) : (
                "Try with demo data →"
              )}
            </button>
            {importError && <p className="text-sm text-red-500 text-center mt-2">Error: {importError}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground flex justify-center items-center">
          <a
            href="https://jwe.in?utm_source=emojistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
            onClick={() => {
              // Track creator link click
              opTrack('external_link_click', {
                destination: 'creator_website',
                url: 'https://jwe.in?utm_source=emojistudio',
                source: 'dashboard_overlay'
              });
            }}
          >
            Created by Jason
          </a>
          <span className="mx-2">|</span>
          <a
            href="https://github.com/jweingardt12/Emoji-Studio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors inline-flex items-center"
            onClick={() => {
              // Track GitHub link click
              opTrack('external_link_click', {
                destination: 'github_repo',
                url: 'https://github.com/jweingardt12/Emoji-Studio',
                source: 'dashboard_overlay'
              });
            }}
          >
            <GithubIcon className="w-4 h-4 mr-1.5" />
            GitHub
          </a>
        </div>
      </div>
    </div>
  )

  // Use createPortal to render the overlay at the document body level
  // This ensures it appears above all other elements including the sidebar
  return typeof document !== 'undefined' 
    ? createPortal(overlayContent, document.body)
    : null;
}
