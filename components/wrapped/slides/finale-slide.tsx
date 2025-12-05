"use client"

import { motion } from "framer-motion"
import { WrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useEffect, useState } from "react"

interface FinaleSlideProps {
  stats: WrappedStats
  workspaceName: string
  onShare: () => void
  customEmojis?: Emoji[]
}

export function FinaleSlide({ stats, workspaceName, onShare, customEmojis = [] }: FinaleSlideProps) {
  const [confetti, setConfetti] = useState<
    Array<{ id: number; x: number; emoji: Emoji | null; delay: number; duration: number; size: number }>
  >([])

  useEffect(() => {
    // Generate confetti using custom workspace emojis
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      emoji: customEmojis.length > 0 ? customEmojis[i % customEmojis.length] : null,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      size: 24 + Math.random() * 16, // Random size between 24-40px
    }))
    setConfetti(particles)
  }, [customEmojis])

  // Key highlights for summary
  const highlights = [
    { label: "Total Emojis", value: stats.overview.totalEmojis, icon: "✨" },
    { label: "Creators", value: stats.overview.totalCreators, icon: "👥" },
    { label: "Best Day", value: stats.busiestDay.count, suffix: "emojis", icon: "📅" },
  ]

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Confetti background using custom workspace emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{ left: `${particle.x}%` }}
            initial={{ y: -50, rotate: 0, opacity: 1 }}
            animate={{
              y: "100vh",
              rotate: 720,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {particle.emoji ? (
              <img
                src={proxyImageUrl(particle.emoji.url)}
                alt={particle.emoji.name}
                style={{ width: particle.size, height: particle.size }}
                className="object-contain"
              />
            ) : (
              <span className="text-2xl">✨</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        <div className="text-6xl mb-4">🎊</div>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
          That's a Wrap!
        </h2>
        <p className="text-white/70 text-lg mb-8">{workspaceName} • {stats.year}</p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8"
      >
        <div className="grid grid-cols-3 gap-4">
          {highlights.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="text-xs text-white/50">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Top creator highlight */}
        {stats.topCreators[0] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🏆</span>
            <span className="text-white/80">
              MVP: <span className="font-bold text-white">{stats.topCreators[0].displayName.split(" ")[0]}</span>
            </span>
            {stats.topCreators[0].topEmojis[0] && (
              <img
                src={proxyImageUrl(stats.topCreators[0].topEmojis[0].url)}
                alt="Top emoji"
                className="w-6 h-6 rounded"
              />
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Share CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative z-10 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="lg"
          className="bg-white text-purple-900 hover:bg-white/90 font-bold px-8"
          onClick={onShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Your Wrapped
        </Button>
        <p className="text-white/40 text-xs">
          Create a shareable image or video
        </p>
      </motion.div>

      {/* Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 flex items-center gap-2 text-white/40 text-xs"
      >
        <img src="/logo.png" alt="Emoji Studio" className="w-5 h-5 rounded" />
        Generated with Emoji Studio
      </motion.div>
    </div>
  )
}
