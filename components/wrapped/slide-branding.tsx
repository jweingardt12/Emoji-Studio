"use client"

export function SlideBranding() {
  return (
    <div className="flex items-center justify-center gap-2 mt-6 pt-4">
      <img
        src="/logo.png"
        alt="Emoji Studio"
        className="w-5 h-5 rounded"
      />
      <span className="text-white/40 text-xs">
        Generated with Emoji Studio
      </span>
    </div>
  )
}
