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
import { useAnalytics } from "@/lib/analytics"
import { useOpenPanel } from '@/lib/safe-openpanel'
import { TextShimmer } from '@/components/ui/text-shimmer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const { track: opTrack } = useOpenPanel();

  // Check localStorage on mount and manage demo data
  useEffect(() => {
    let hasData = false;
    try {
      const storedData = localStorage.getItem("emojiData");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          hasData = true;
        } else {
          localStorage.removeItem("emojiData"); 
        }
      }
    } catch (error) {
      localStorage.removeItem("emojiData");
      hasData = false;
    }
    setHasLocalStorageData(hasData);
    setIsInitialCheckDone(true);

    if (!hasData && !useDemoData) {
      setUseDemoData(true);
    }
  }, [useDemoData, setUseDemoData]);

  // Effect for entry animation, depends on initial check and data presence
  useEffect(() => {
    if (isInitialCheckDone && !hasLocalStorageData) {
      setIsMounted(true);
      const animationTimer = setTimeout(() => {
        setIsAnimatedIn(true);
      }, 50);
      
      document.body.style.overflow = 'hidden';
      
      return () => {
        clearTimeout(animationTimer);
        document.body.style.overflow = '';
      };
    } else {
      setIsMounted(false);
      setIsAnimatedIn(false);
      document.body.style.overflow = '';
    }
  }, [isInitialCheckDone, hasLocalStorageData]);

  // Effect for chat bubble animation - delay by 1.5 seconds
  useEffect(() => {
    if (isAnimatedIn) {
      const bubbleTimer = setTimeout(() => {
        setShowChatBubble(true)
      }, 1500) // 1.5 second delay

      return () => {
        clearTimeout(bubbleTimer)
      }
    }
  }, [isAnimatedIn])

  const handleImport = async () => {
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
      
      // Wait for animation to complete before redirecting (4 seconds)
      // This matches the duration prop we'll pass to EmojiWaterfall
      await new Promise(resolve => setTimeout(resolve, 4000))
      console.log("Emoji animation complete, redirecting...")
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error importing demo data:", error)
      setImportError(error instanceof Error ? error.message : "Failed to import demo data")
    } finally {
      setIsImporting(false)
    }
  };

  const handleImportClick = handleImport;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Prevent clicks from going through to elements behind the overlay
    e.stopPropagation();
  };

  if (!isMounted) {
    return null;
  }
  
  const overlayContent = (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-500 ease-in-out \
        ${isAnimatedIn ? "opacity-100" : "opacity-0"}`}
      onClick={handleOverlayClick} // Close overlay when clicking outside the content
    >
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen bg-background/80 backdrop-blur-sm p-2 sm:p-4">
        {/* Main Content Box */}
        <div 
          className={`relative bg-background border border-border rounded-xl shadow-2xl p-3 sm:p-4 w-full sm:max-w-6xl transition-all duration-500 ease-in-out transform \
            ${isAnimatedIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside content from closing overlay
        >
          <div className="text-center">
            {/* Logo section */}
            <div className={`relative mx-auto ${isMobile ? 'mb-3 mt-4' : 'mb-4'} w-20 h-20 sm:w-24 sm:h-24`}>
              {/* Blurred colorful background - positioned to be directly behind the image */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 opacity-100 blur-lg rounded-full" />
              {/* Image container - centered on top of the background */}
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                  <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
                </div>
              </div>
            </div>

            {/* Site name */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2">
              Emoji Studio
            </h1>
            {/* Tagline */}
            <p className="text-sm sm:text-base text-muted-foreground italic mb-3 sm:mb-4">
              Sometimes the most important OKRs are LOLs.
            </p>
            {/* Text changed to H2 and positioned above bullet points */}
            <h2 className="text-xl sm:text-2xl font-medium text-foreground mb-4 sm:mb-6 max-w-md sm:max-w-3xl mx-auto">
              Emoji Studio is the Slack Custom Emoji dashboard you've been looking for.
            </h2>

            {/* Feature list */}
            <ul className="space-y-4 text-left max-w-md sm:max-w-3xl mx-auto mb-6 sm:mb-8">
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                  <BarChartBig className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-sm sm:text-base">
                  <p className="font-medium">Visualize emoji creation trends and usage patterns over time.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-sm sm:text-base">
                  <p className="font-medium">Understand company culture by seeing top emoji creators in your workspace.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-sm sm:text-base">
                  <p className="font-medium">Download one–or all–emojis for backup and portability.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-sm sm:text-base">
                  <p className="font-medium">Securely import your Slack data locally – nothing leaves your browser.</p>
                </div>
              </li>
            </ul>

            {/* Call to Action */}
            <div className="flex flex-col items-center gap-3 pt-3">
              <div className="flex flex-row items-center justify-center gap-3 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  className="sm:w-auto"
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
                >
                  About this project
                </Button>
                <Button
                  size="sm"
                  className="sm:w-auto"
                  onClick={handleImportClick} 
                >
                  Import your emojis →
                </Button>
              </div>
              <button
                onClick={handleImport}
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

            {/* Security Explanation AlertDialog */}
            <div className="w-full mt-6 mb-2 text-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                    <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                    Hang on - how is this secure?
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[60]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>How is this secure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
                      Emoji Studio requires you to dig a bit into Chrome Developer Tools and get a specific network request while on the "Add new emoji" page. This request contains a specific token and cookie, both of which are only scoped to fetching and displaying Slack emojis. All information is stored in your browser, and the requests this app makes are indistinguishable from that of the Slack app. No, you can't be caught or found out.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogAction asChild>
                      <Link href="/settings">Let's go</Link>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
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
    </div>
  )

  // Use createPortal to render the overlay at the document body level
  // This ensures it appears above all other elements including the sidebar
  return typeof document !== 'undefined' 
    ? createPortal(overlayContent, document.body)
    : null;
}
