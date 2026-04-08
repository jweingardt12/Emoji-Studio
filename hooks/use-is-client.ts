import { useState, useEffect } from "react"

/**
 * Returns true once the component has mounted on the client.
 * Use to guard browser-only code and avoid hydration mismatches.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])
  return isClient
}
