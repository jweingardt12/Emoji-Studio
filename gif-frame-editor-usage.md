# GIF Frame Editor Usage

## Overview
The GIF Frame Editor allows users to select which frames to include in their Slack emoji GIF, solving the quality issues caused by automatic frame reduction.

## How It Works

### 1. Automatic Detection
When you upload a GIF file larger than 50KB, the frame editor will automatically open instead of processing the file directly.

### 2. Frame Selection Interface
- **Frame Grid**: Shows all frames extracted from the GIF
- **Selection Tools**:
  - Select First 50: Selects the first 50 frames
  - Deselect All: Clears all selections
  - Every 2nd/3rd Frame: Selects frames at intervals
  - Smart Selection: Intelligently selects key frames

### 3. Preview & Export
- **Live Preview**: See how your selected frames look in animation
- **Quality Slider**: Adjust compression quality (1-100)
- **Size Control**: Set output dimensions (64-128px)
- **File Size Estimation**: Shows estimated file size before export

### 4. Frame Limits
- Maximum 50 frames for Slack compatibility
- Visual indicator when limit is reached
- Warning if estimated size exceeds 128KB

## Integration Points

### From Upload Flow
```typescript
// In processFiles() - detects GIFs and shows editor
const isGif = await isGifFile(file)
if (isGif && file.size > 50 * 1024) {
  setGifToEdit(file)
  setShowGifEditor(true)
  return
}
```

### From Processing Modal
- "Edit Frames" button appears for processed GIF emojis
- Allows re-editing frame selection after initial processing

## Benefits

1. **Better Quality**: Users can choose the most important frames instead of automatic reduction
2. **Smooth Animation**: Smart frame selection maintains animation continuity
3. **Size Control**: Real-time feedback helps stay within Slack's 128KB limit
4. **User Control**: Full control over which frames to include

## Technical Implementation

- Uses `gifuct-js` for frame extraction
- `gif.js` for encoding with Web Workers
- Canvas-based frame rendering and compositing
- Real-time preview with adjustable playback