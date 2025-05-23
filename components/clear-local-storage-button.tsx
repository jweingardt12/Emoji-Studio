"use client"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function ClearLocalStorageButton() {
  const handleClear = () => {
    try {
      localStorage.clear()
      toast({
        title: "Local storage cleared",
        description: "All browser data for this app has been removed.",
        variant: "default",
      })
      // Dispatch event for app-wide updates
      window.dispatchEvent(new CustomEvent("localStorageCleared"))

      // Force reload to update UI state
      window.location.reload()
    } catch (error) {
      console.error("Error clearing local storage:", error)
      toast({
        title: "Failed to clear local storage",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  return (
    <Button variant="destructive" onClick={handleClear} className="mt-2">
      Clear Local Storage
    </Button>
  )
}
