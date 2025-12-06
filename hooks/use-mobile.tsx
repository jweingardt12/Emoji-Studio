import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect mobile viewport
 * Returns null during SSR/hydration, boolean after client-side detection
 * This prevents hydration mismatches with animation state
 */
export function useIsMobile(): boolean | null {
  // Initialize with null to indicate "not yet determined" during SSR
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
