# GIF Frame Editor Memory Issue Fixes

## Problem
The GIF frame extractor was encountering "Out of memory" errors when trying to process large GIFs, particularly when attempting to create ImageData for fallback handling.

## Solutions Implemented

### 1. File Size Limit
- Added 50MB file size limit check before processing
- Prevents attempting to load extremely large files into memory

### 2. Dimension Limits
- Maximum dimensions: 2000x2000 pixels
- Maximum total pixels: 2 million pixels
- Prevents memory allocation issues with very large images

### 3. Removed Problematic Fallback
- Removed the ImageData creation fallback that was causing out of memory errors
- The fallback was attempting to create a canvas for GIFs without frames
- Now simply throws an error and lets the parent handle it

### 4. Better Error Messages
- Clear messages for different failure scenarios:
  - "GIF file is too large for frame extraction (max 50MB)"
  - "GIF dimensions too large for frame extraction: WxH (max 2000x2000)"
  - "GIF has too many pixels for frame extraction: N (max 2M pixels)"
  - "No frames found in GIF. This might be a static image or use an unsupported GIF format."

### 5. Improved Error Handling Flow
1. If a GIF can't be processed in the frame editor:
   - Shows appropriate error message
   - Automatically closes after 2 seconds
   - Falls back to normal GIF processing
2. The normal GIF processor has multiple fallback methods that can handle edge cases

## User Experience
- Users see helpful error messages explaining why frame editing isn't available
- GIFs are still processed successfully through the normal pipeline
- No crashes or hanging due to memory issues
- Clear size/dimension limits communicated

## Technical Details
The frame extraction process now:
1. Checks file size (< 50MB)
2. Parses GIF structure
3. Validates dimensions (< 2000x2000)
4. Validates total pixel count (< 2M)
5. Extracts frames if all checks pass
6. Falls back gracefully if any check fails