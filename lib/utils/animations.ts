// Shared animation configurations for consistent UX across the app

// Timing functions
export const easings = {
  // Standard easing for most interactions
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  // Quick snap for micro-interactions
  snap: "cubic-bezier(0.2, 0, 0, 1)",
  // Smooth deceleration for page transitions
  decel: "cubic-bezier(0, 0, 0.2, 1)",
  // Bouncy spring effect
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  // Elastic for playful interactions
  elastic: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
}

// Duration presets (in ms)
export const durations = {
  instant: 50,
  fast: 150,
  normal: 200,
  slow: 300,
  page: 400,
}

// Framer Motion animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

// Stagger children animations
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

// Spring physics for natural motion
export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
}

export const gentleSpring = {
  type: "spring",
  stiffness: 200,
  damping: 25,
}

export const bouncySpring = {
  type: "spring",
  stiffness: 500,
  damping: 20,
}

// Hover scale effect
export const hoverScale = {
  scale: 1.02,
  transition: springTransition,
}

export const hoverScaleSmall = {
  scale: 1.01,
  transition: springTransition,
}

// Tap/press effect
export const tapScale = {
  scale: 0.98,
  transition: { duration: 0.1 },
}

export const tapScaleSmall = {
  scale: 0.99,
  transition: { duration: 0.05 },
}

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
}

// Card hover effects
export const cardHover = {
  rest: {
    scale: 1,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
  },
  hover: {
    scale: 1.01,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    transition: springTransition,
  },
}

// List item animations
export const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
}

// Modal/overlay animations
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
}

// Shimmer effect for loading states
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

// Pulse effect for attention
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 1,
    },
  },
}

// Success checkmark animation
export const checkmarkPath = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", stiffness: 400, damping: 40 },
      opacity: { duration: 0.1 },
    },
  },
}

// Tailwind CSS animation classes for non-Framer Motion use
export const cssAnimations = {
  fadeIn: "animate-in fade-in duration-200",
  fadeOut: "animate-out fade-out duration-150",
  slideInUp: "animate-in slide-in-from-bottom-2 duration-200",
  slideInDown: "animate-in slide-in-from-top-2 duration-200",
  slideInRight: "animate-in slide-in-from-right-4 duration-300",
  slideInLeft: "animate-in slide-in-from-left-4 duration-300",
  scaleIn: "animate-in zoom-in-95 duration-200",
  scaleOut: "animate-out zoom-out-95 duration-150",
  spinSlow: "animate-spin duration-1000",
}

// Utility function for staggered delays
export const getStaggerDelay = (index: number, baseDelay = 50) => ({
  animationDelay: `${index * baseDelay}ms`,
})

// Utility function for haptic feedback
export const triggerHaptic = (intensity: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    const durations = { light: 10, medium: 20, heavy: 40 }
    navigator.vibrate(durations[intensity])
  }
}
