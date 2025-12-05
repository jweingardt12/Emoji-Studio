"use client"

interface SlideHeaderProps {
  year: number
}

export function SlideHeader({ year }: SlideHeaderProps) {
  return (
    <div className="text-center mb-4">
      <h1 className="text-lg font-bold text-white/90 tracking-wide">
        Slack Emojis Wrapped: {year}
      </h1>
    </div>
  )
}
