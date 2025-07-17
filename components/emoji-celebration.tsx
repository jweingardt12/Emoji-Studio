"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"

interface EmojiCelebrationProps {
  isActive: boolean
  duration?: number
}

interface FallingEmoji {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  velocity: number
  rotationSpeed: number
  delay?: number
}

export function EmojiCelebration({ isActive, duration = 3000 }: EmojiCelebrationProps) {
  const [mounted, setMounted] = useState(false)
  const [emojis, setEmojis] = useState<FallingEmoji[]>([])
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isActive || !mounted) return

    setIsAnimating(true)
    let emojiCounter = 0
    const allEmojis: FallingEmoji[] = []
    const maxEmojis = 50 // Stop after 50 emojis total

    const spawnEmoji = () => {
      if (emojiCounter >= maxEmojis) return false // Stop spawning after max

      const side = emojiCounter % 4 // 0: top, 1: right, 2: bottom, 3: left
      let x, y
      
      switch (side) {
        case 0: // Top
          x = Math.random() * 100
          y = -10 - (Math.random() * 20)
          break
        case 1: // Right
          x = 110 + (Math.random() * 20)
          y = Math.random() * 100
          break
        case 2: // Bottom
          x = Math.random() * 100
          y = 110 + (Math.random() * 20)
          break
        case 3: // Left
          x = -10 - (Math.random() * 20)
          y = Math.random() * 100
          break
        default:
          x = 50
          y = -10
      }

      const newEmoji = {
        id: Date.now() + emojiCounter + Math.random(),
        x,
        y,
        rotation: Math.random() * 360,
        scale: 0.2 + Math.random() * 0.8,
        velocity: 0.3 + Math.random() * 1.2,
        rotationSpeed: (Math.random() - 0.5) * 15
      }

      allEmojis.push(newEmoji)
      emojiCounter++

      // Keep only recent emojis to prevent memory issues
      if (allEmojis.length > 200) {
        allEmojis.shift()
      }

      setEmojis([...allEmojis])
      return true // Successfully spawned
    }

    // Initial burst - spawn up to 30 emojis quickly
    const initialBurst = Math.min(30, maxEmojis)
    for (let i = 0; i < initialBurst; i++) {
      spawnEmoji()
    }

    // Continue spawning remaining emojis more slowly
    const interval = setInterval(() => {
      if (emojiCounter >= maxEmojis) {
        clearInterval(interval)
        return
      }

      // Spawn 2-3 emojis at a time until we hit the max
      const count = Math.min(2 + Math.floor(Math.random() * 2), maxEmojis - emojiCounter)
      for (let i = 0; i < count; i++) {
        if (!spawnEmoji()) break
      }
    }, 150)

    // Cleanup
    return () => {
      clearInterval(interval)
      setIsAnimating(false)
      setEmojis([])
    }
  }, [isActive, mounted])

  if (!mounted || !isAnimating) return null

  const celebrationContent = (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute animate-fall"
          style={{
            left: `${emoji.x}%`,
            top: `${emoji.y}%`,
            transform: `rotate(${emoji.rotation}deg) scale(${emoji.scale})`,
            '--fall-duration': `${3 / emoji.velocity}s`,
            '--rotation-amount': `${emoji.rotationSpeed * 360}deg`,
            animationDelay: `${emoji.delay || 0}s`,
          } as React.CSSProperties}
        >
          <div className="relative w-16 h-16 animate-spin-slow">
            <Image
              src="/logo.png"
              alt="Celebration"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) var(--initial-rotation);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(120vh) rotate(var(--rotation-amount));
            opacity: 0;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fall {
          animation: fall var(--fall-duration) ease-in forwards;
          will-change: transform, opacity;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  )

  return createPortal(celebrationContent, document.body)
}