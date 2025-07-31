# GIF Export Flow

## Overview
When a GIF is created from the frame editor (either from a GIF or video), it now shows the processing modal with all the action buttons.

## User Flow

### 1. Initial Upload
- User uploads a video (>50 frames) or large GIF
- Frame editor opens automatically

### 2. Frame Selection & Export
- User selects frames in the timeline editor
- Clicks "Export N Frames" or "Create GIF"
- GIF is generated with selected frames

### 3. Processing Modal Display
- Frame editor closes
- Processing modal opens showing:
  - Preview of the created GIF
  - File name (editable)
  - File info (format, size)
  - Action buttons

### 4. Available Actions
- **Edit Frames**: Re-opens the frame editor to adjust selection
- **Download**: Downloads the GIF to local machine
- **Send to Slack**: Uploads directly to connected Slack workspace

### 5. Edit Frames Flow
- Clicking "Edit Frames" temporarily hides the processing modal
- Frame editor re-opens with the original file
- User can adjust frame selection
- On export, returns to processing modal with updated GIF

## State Management

### Key State Transitions:
1. **Frame Editor → Processing Modal**: On export, sets processed emoji and shows modal
2. **Processing Modal → Frame Editor**: On edit, hides modal and shows editor
3. **Frame Editor → Processing Modal**: On re-export or cancel, returns to modal

### Preserved State:
- Original file reference maintained for re-editing
- Processed emoji data preserved during editing
- Celebration animation triggers on successful export

## Benefits
- Consistent experience for all GIF creation methods
- Full access to all features (download, Slack upload, re-edit)
- Seamless transitions between editors
- No loss of work when switching between views