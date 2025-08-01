"use client"

import { useRef, useCallback, useMemo } from "react"
import { VariableSizeGrid as Grid } from "react-window"
import { FrameThumbnail } from "./frame-thumbnail"
import type { ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import type { VideoFrame } from "@/lib/utils/video-frame-extractor"

type FrameData = ExtractedFrame | VideoFrame

interface VirtualFrameGridProps {
  frames: FrameData[]
  selectedIndices: Set<number>
  hoveredIndex: number | null
  previewPlaying: boolean
  currentPreviewIndex: number
  frameSize: number
  onToggleFrame: (index: number) => void
  onMouseEnter: (index: number) => void
  onMouseLeave: () => void
  width: number
  height: number
}

export function VirtualFrameGrid({
  frames,
  selectedIndices,
  hoveredIndex,
  previewPlaying,
  currentPreviewIndex,
  frameSize,
  onToggleFrame,
  onMouseEnter,
  onMouseLeave,
  width,
  height
}: VirtualFrameGridProps) {
  const gridRef = useRef<Grid>(null)
  
  // Calculate grid dimensions
  const gap = 12 // Gap between items
  const itemSize = frameSize + gap
  const columnCount = Math.max(1, Math.floor((width - gap) / itemSize))
  const rowCount = Math.ceil(frames.length / columnCount)
  
  // Cell renderer
  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex
    if (index >= frames.length) return null
    
    const frame = frames[index]
    const isSelected = selectedIndices.has(index)
    const isHovered = hoveredIndex === index
    const isPreviewing = previewPlaying && currentPreviewIndex === index
    
    return (
      <div
        style={{
          ...style,
          left: Number(style.left) + gap,
          top: Number(style.top) + gap,
          width: frameSize,
          height: frameSize,
        }}
      >
        <FrameThumbnail
          frame={frame}
          index={index}
          isSelected={isSelected}
          isHovered={isHovered}
          isPreviewing={isPreviewing}
          size={frameSize}
          onToggle={() => onToggleFrame(index)}
          onMouseEnter={() => onMouseEnter(index)}
          onMouseLeave={onMouseLeave}
          canSelect={selectedIndices.size < 50}
        />
      </div>
    )
  }, [
    frames,
    selectedIndices,
    hoveredIndex,
    previewPlaying,
    currentPreviewIndex,
    frameSize,
    columnCount,
    onToggleFrame,
    onMouseEnter,
    onMouseLeave
  ])
  
  // Column width callback
  const getColumnWidth = useCallback(() => itemSize, [itemSize])
  
  // Row height callback
  const getRowHeight = useCallback(() => itemSize, [itemSize])
  
  // Memoize overscan to improve scrolling performance
  const overscanRowCount = useMemo(() => Math.min(5, Math.ceil(height / itemSize)), [height, itemSize])
  const overscanColumnCount = useMemo(() => Math.min(5, Math.ceil(width / itemSize)), [width, itemSize])
  
  return (
    <Grid
      ref={gridRef}
      columnCount={columnCount}
      columnWidth={getColumnWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={getRowHeight}
      width={width}
      overscanRowCount={overscanRowCount}
      overscanColumnCount={overscanColumnCount}
      className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      style={{
        overflowX: 'hidden'
      }}
    >
      {Cell}
    </Grid>
  )
}