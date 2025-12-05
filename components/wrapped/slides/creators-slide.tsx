"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { TopCreator } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface CreatorsSlideProps {
  topCreators: TopCreator[]
  workspaceName: string
  year: number
}

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"]
const MEDAL_COLORS = {
  1: { bg: "rgba(255, 215, 0, 0.2)", border: "rgba(255, 215, 0, 0.5)" },
  2: { bg: "rgba(192, 192, 192, 0.2)", border: "rgba(192, 192, 192, 0.5)" },
  3: { bg: "rgba(205, 127, 50, 0.2)", border: "rgba(205, 127, 50, 0.5)" },
}

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function CreatorsSlide({ topCreators, workspaceName, year }: CreatorsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const top3 = topCreators.slice(0, 3)
  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-6 w-[600px] h-[600px] overflow-hidden">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Top Emoji Creators
          </h2>
          <p className="text-white/60">
            Your workspace MVPs
          </p>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 md:gap-6 mb-8">
          {podiumOrder.map((creator, displayIndex) => {
            const actualRank = creator.rank
            const isFirst = actualRank === 1
            const podiumHeight = isFirst ? "h-32 md:h-40" : actualRank === 2 ? "h-24 md:h-32" : "h-20 md:h-28"
            const medalColor = MEDAL_COLORS[actualRank as 1 | 2 | 3]

            return (
              <motion.div
                key={creator.userId}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: displayIndex * 0.2 + 0.3,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="flex flex-col items-center"
              >
                {/* Medal */}
                <motion.div
                  className="text-4xl md:text-5xl mb-2"
                  animate={isFirst ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                  transition={{ duration: 0.5, delay: 1.5 }}
                >
                  {MEDAL_EMOJIS[actualRank - 1]}
                </motion.div>

                {/* Creator info card */}
                <div
                  className="rounded-xl p-3 md:p-4 mb-3 backdrop-blur-sm min-w-[100px] md:min-w-[120px]"
                  style={{
                    backgroundColor: medalColor?.bg || "rgba(255,255,255,0.1)",
                    border: `1px solid ${medalColor?.border || "rgba(255,255,255,0.2)"}`,
                  }}
                >
                  <p className="text-white font-semibold text-sm md:text-base truncate max-w-[100px] md:max-w-[120px]">
                    {formatName(creator.displayName)}
                  </p>
                  <p className="text-white/80 font-bold text-lg md:text-xl">
                    {creator.emojiCount}
                  </p>
                  <p className="text-white/50 text-xs">
                    emojis
                  </p>
                </div>

                {/* Sample emojis */}
                <div className="flex gap-1 mb-2">
                  {creator.topEmojis.slice(0, 3).map((emoji, i) => (
                    <motion.img
                      key={emoji.name}
                      src={proxyImageUrl(emoji.url)}
                      alt={emoji.name}
                      className="w-6 h-6 md:w-8 md:h-8 rounded"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: displayIndex * 0.2 + i * 0.1 + 0.8 }}
                    />
                  ))}
                </div>

                {/* Podium base */}
                <div
                  className={`${podiumHeight} w-20 md:w-28 rounded-t-lg bg-white/10 backdrop-blur-sm border border-white/20`}
                  style={{
                    borderBottom: "none",
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Percentage callout for #1 */}
        {top3[0] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 }}
            className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200"
          >
            <span className="font-bold">{formatName(top3[0].displayName)}</span> created{" "}
            <span className="font-bold">{top3[0].percentageOfTotal}%</span> of all emojis!
          </motion.div>
        )}

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="creators"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#78350f"
      />
    </div>
  )
}
