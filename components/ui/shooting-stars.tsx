"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState, useRef } from "react"

interface ShootingStar {
  id: number
  x: number
  y: number
  angle: number
  scale: number
  speed: number
  distance: number
}

interface ShootingStarsProps {
  minSpeed?: number
  maxSpeed?: number
  minDelay?: number
  maxDelay?: number
  starColor?: string
  trailColor?: string
  starWidth?: number
  starHeight?: number
  className?: string
}

const getRandomStartPoint = () => {
  const side = Math.floor(Math.random() * 4)
  const offset = Math.random() * (typeof window !== "undefined" ? window.innerWidth : 600)

  switch (side) {
    case 0:
      return { x: offset, y: 0, angle: 45 }
    case 1:
      return { x: typeof window !== "undefined" ? window.innerWidth : 600, y: offset, angle: 135 }
    case 2:
      return { x: offset, y: typeof window !== "undefined" ? window.innerHeight : 600, angle: 225 }
    case 3:
      return { x: 0, y: offset, angle: 315 }
    default:
      return { x: 0, y: 0, angle: 45 }
  }
}

export function ShootingStars({
  minSpeed = 10,
  maxSpeed = 30,
  minDelay = 1200,
  maxDelay = 4200,
  starColor = "#9E00FF",
  trailColor = "#2EB9DF",
  starWidth = 10,
  starHeight = 1,
  className,
}: ShootingStarsProps) {
  const [star, setStar] = useState<ShootingStar | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const createStar = () => {
      const { x, y, angle } = getRandomStartPoint()
      const newStar: ShootingStar = {
        id: Date.now(),
        x,
        y,
        angle,
        scale: 1,
        speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
        distance: 0,
      }
      setStar(newStar)

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay
      setTimeout(createStar, randomDelay)
    }

    createStar()
  }, [minSpeed, maxSpeed, minDelay, maxDelay])

  useEffect(() => {
    const moveStar = () => {
      if (star) {
        setStar((prevStar) => {
          if (!prevStar) return null
          const newX =
            prevStar.x +
            prevStar.speed * Math.cos((prevStar.angle * Math.PI) / 180)
          const newY =
            prevStar.y +
            prevStar.speed * Math.sin((prevStar.angle * Math.PI) / 180)
          const newDistance = prevStar.distance + prevStar.speed
          const newScale = 1 + newDistance / 100

          const windowWidth = typeof window !== "undefined" ? window.innerWidth : 600
          const windowHeight = typeof window !== "undefined" ? window.innerHeight : 600

          if (
            newX < -20 ||
            newX > windowWidth + 20 ||
            newY < -20 ||
            newY > windowHeight + 20
          ) {
            return null
          }
          return {
            ...prevStar,
            x: newX,
            y: newY,
            distance: newDistance,
            scale: newScale,
          }
        })
      }
    }

    const animationFrame = requestAnimationFrame(moveStar)
    return () => cancelAnimationFrame(animationFrame)
  }, [star])

  return (
    <svg
      ref={svgRef}
      className={cn("w-full h-full absolute inset-0 pointer-events-none", className)}
    >
      {star && (
        <rect
          key={star.id}
          x={star.x}
          y={star.y}
          width={starWidth * star.scale}
          height={starHeight}
          fill={`url(#shooting-star-gradient-${star.id})`}
          transform={`rotate(${star.angle}, ${
            star.x + (starWidth * star.scale) / 2
          }, ${star.y + starHeight / 2})`}
        />
      )}
      <defs>
        <linearGradient id={`shooting-star-gradient-${star?.id || 0}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} />
          <stop offset="100%" style={{ stopColor: starColor, stopOpacity: 1 }} />
        </linearGradient>
      </defs>
    </svg>
  )
}
