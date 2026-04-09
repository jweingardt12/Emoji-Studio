import type { Transition, Variants } from "framer-motion"

// ── Spring presets ──────────────────────────────────────────────
export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 30 }
export const springGentle: Transition = { type: "spring", stiffness: 200, damping: 25 }
// ── Stagger container ──────────────────────────────────────────
export const staggerContainer = (staggerDelay = 0.08): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerDelay, delayChildren: 0.05 } },
})

// ── Entrance variants ──────────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springGentle },
}

export const scaleFade: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
}

export const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: springGentle },
}

// ── Interaction presets (spread onto motion components) ────────
export const cardHover = {
  whileHover: { y: -2, transition: springSnappy },
  whileTap: { scale: 0.98 },
} as const

export const pillHover = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.96 },
} as const
