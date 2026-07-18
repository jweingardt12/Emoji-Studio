import { toast } from "sonner"

/**
 * Celebrate the very first successful sync of a real Slack workspace —
 * arguably an even bigger win than an upload. Fires once per browser
 * (tracked in localStorage) and never for the demo workspace.
 */
export function maybeCelebrateFirstSync(emojiCount: number, workspaceName: string): void {
  if (typeof window === "undefined") return
  if (!workspaceName || workspaceName === "demo-workspace") return
  try {
    if (localStorage.getItem("hasCelebratedFirstSync")) return
    localStorage.setItem("hasCelebratedFirstSync", "true")
  } catch {
    return
  }
  toast.success("Workspace connected! 🎉", {
    description: `Synced ${emojiCount.toLocaleString()} emojis from ${workspaceName}. Your dashboard is ready.`,
    duration: 6000,
  })
  celebrateUpload()
}

/**
 * Fire a short side-cannon confetti burst — used to celebrate successfully
 * uploading emoji to Slack, the app's core "win" moment.
 *
 * canvas-confetti is loaded on demand so it stays out of route bundles, and
 * the burst is skipped entirely for users who prefer reduced motion.
 */
export async function celebrateUpload(): Promise<void> {
  if (typeof window === "undefined") return
  // matchMedia can be missing in older embedded webviews (and jsdom)
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return
  }

  try {
    const { default: confetti } = await import("canvas-confetti")

    const end = Date.now() + 1000
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308"]

    const frame = () => {
      if (Date.now() > end) return

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      })

      requestAnimationFrame(frame)
    }

    frame()
  } catch {
    // Celebration is best-effort — never let it break the upload flow.
  }
}
