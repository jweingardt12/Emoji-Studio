'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Upload, 
  Camera, 
  Video, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Download,
  Check,
  Loader2,
  Edit3,
  Send,
  Sun,
  Contrast,
  Palette,
  Scissors,
  RotateCcw,
  Gauge,
  Maximize2,
  ChevronLeft,
  X,
  Copy
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { useTrack } from "@/lib/hooks/use-track";
import { uploadEmojiToSlack, hasSlackConnection } from "@/lib/utils/slack-upload";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CreationStep = 'select' | 'processing' | 'preview' | 'edit' | 'complete'

interface MobileEmojiDrawerProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export function MobileEmojiDrawer({ children, isMobile }: MobileEmojiDrawerProps) {
  const track = useTrack();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreationStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedEmoji, setProcessedEmoji] = useState<ProcessedEmoji | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [emojiName, setEmojiName] = useState('');
  const [isUploadingToSlack, setIsUploadingToSlack] = useState(false);
  const [hasSlack, setHasSlack] = useState(false);
  const [editAdjustments, setEditAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });
  const [shouldRemoveBackground, setShouldRemoveBackground] = useState(false);
  const [backgroundRemovedPreview, setBackgroundRemovedPreview] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const [preserveHDR, setPreserveHDR] = useState(false);
  const [videoAdjustments, setVideoAdjustments] = useState({
    speed: 1.0,
    scaleMode: 'cover' as 'cover' | 'contain' | 'stretch'
  });
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Check for Slack connection
  useEffect(() => {
    setHasSlack(hasSlackConnection());
  }, []);

  // On desktop, just use the trigger as-is
  if (!isMobile) {
    return children;
  }

  // Check if we should show confirmation when closing
  const shouldConfirmClose = () => {
    // Don't confirm on initial select or complete screens
    if (currentStep === 'select' || currentStep === 'complete') {
      return false;
    }
    // Confirm if we have a file being processed or edited
    return selectedFile !== null || processedEmoji !== null;
  };

  const handleClose = (forceClose = false) => {
    if (!forceClose && shouldConfirmClose()) {
      setShowExitConfirmation(true);
      // Don't close the drawer, just show the confirmation
    } else {
      setShowExitConfirmation(false);
      setOpen(false);
      // Reset state after animation
      setTimeout(handleStartOver, 300);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    setOpen(false);
    // Reset state after animation
    setTimeout(handleStartOver, 300);
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
    // Drawer stays open, user continues editing
  };

  const handleFileInput = async (type: 'upload' | 'camera' | 'video') => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Track file input action
    track("Mobile Emoji Drawer: Input Method Selected", {
      method: type,
      step: "select"
    })

    const input = document.createElement('input');
    input.type = 'file';
    
    if (type === 'upload') {
      input.accept = 'image/*,video/*,.gif';
    } else if (type === 'camera') {
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
    } else if (type === 'video') {
      input.accept = 'video/*';
      input.setAttribute('capture', 'environment');
    }
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Immediately show loading state
        setSelectedFile(file);
        setCurrentStep('processing');
        setProcessingProgress(0);
        
        // Show file info immediately
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const fileType = file.type.startsWith('video/') ? 'video' : 
                        file.type.startsWith('image/') ? 'image' : 'file';
        
        setProcessingStatus(`Loading ${fileSizeMB}MB ${fileType}...`);
        
        // Give UI time to update before processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Process with timeout for large files
        const processingTimeout = file.size > 50 * 1024 * 1024 ? 60000 : 30000; // 60s for >50MB, 30s otherwise
        
        try {
          await Promise.race([
            processFile(file),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Processing timeout')), processingTimeout)
            )
          ]);
        } catch (error) {
          if (error instanceof Error && error.message === 'Processing timeout') {
            toast.error('Video is taking too long to process. Try a shorter video or smaller file size.');
            setCurrentStep('select');
            setSelectedFile(null);
          }
        }
      }
    };
    
    input.click();
  };

  const processFile = async (file: File) => {
    // If file is pre-edited, skip processing and go straight to preview
    if ((file as any).isPreEdited) {
      const previewUrl = URL.createObjectURL(file);
      setProcessedEmoji({
        name: emojiName || file.name.replace(/\.[^/.]+$/, '').substring(0, 22),
        originalFile: file,
        processedBlob: file,
        originalSize: file.size,
        processedSize: file.size,
        dimensions: { width: 128, height: 128 },
        format: 'PNG',
        preview: previewUrl,
        blob: previewUrl,
        processingNote: (file as any).backgroundRemoved ? 'Background removed' : 'Edited'
      });
      setCurrentStep('preview');
      return;
    }
    
    const isVideo = file.type.startsWith('video/');
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    
    try {
      // More realistic progress updates based on file size
      const isLargeFile = file.size > 10 * 1024 * 1024; // > 10MB
      
      // Initial status with file size info
      setProcessingProgress(5);
      setProcessingStatus(`Preparing ${fileSizeMB}MB ${isVideo ? 'video' : 'image'}...`);
      
      // For videos, show more detailed status
      if (isVideo) {
        // Quick initial update to show we're working
        await new Promise(resolve => setTimeout(resolve, 100));
        setProcessingProgress(10);
        setProcessingStatus('Reading video metadata...');
        
        // Show progress up to 75% during the simulation phase
        if (isLargeFile) {
          const steps = [
            { progress: 15, status: `Loading ${fileSizeMB}MB video into memory...`, delay: 300 },
            { progress: 25, status: 'Analyzing video duration and framerate...', delay: 500 },
            { progress: 35, status: 'Extracting video frames...', delay: 800 },
            { progress: 45, status: 'Processing frames for GIF conversion...', delay: 600 },
            { progress: 55, status: 'Creating animated GIF...', delay: 500 },
            { progress: 65, status: 'Optimizing file size for Slack...', delay: 400 },
            { progress: 75, status: 'Finalizing emoji...', delay: 300 }
          ];
          
          for (const step of steps) {
            setProcessingProgress(step.progress);
            setProcessingStatus(step.status);
            await new Promise(resolve => setTimeout(resolve, step.delay));
          }
        } else {
          // Faster progress for smaller videos
          const steps = [
            { progress: 20, status: 'Loading video...', delay: 200 },
            { progress: 35, status: 'Extracting frames...', delay: 300 },
            { progress: 50, status: 'Creating GIF...', delay: 300 },
            { progress: 65, status: 'Optimizing for Slack...', delay: 200 },
            { progress: 75, status: 'Finalizing...', delay: 100 }
          ];
          
          for (const step of steps) {
            setProcessingProgress(step.progress);
            setProcessingStatus(step.status);
            await new Promise(resolve => setTimeout(resolve, step.delay));
          }
        }
      } else {
        // Image processing
        const steps = [
          { progress: 20, status: 'Reading image data...', delay: 200 },
          { progress: 35, status: 'Analyzing dimensions...', delay: 200 },
          { progress: 50, status: 'Optimizing for Slack...', delay: 300 },
          { progress: 65, status: 'Applying compression...', delay: 200 },
          { progress: 75, status: 'Finalizing...', delay: 100 }
        ];
        
        for (const step of steps) {
          setProcessingProgress(step.progress);
          setProcessingStatus(step.status);
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
      }
      
      // Now do the actual processing (the remaining 25%)
      setProcessingProgress(80);
      setProcessingStatus('Processing emoji...');

      // Check if file has video adjustments
      const fileWithAdjustments = file as any;
      const options: any = {};
      
      if (fileWithAdjustments.videoAdjustments) {
        // Apply video adjustments for speed and scale mode
        options.processingOptions = {
          speed: fileWithAdjustments.videoAdjustments.speed,
          scaleMode: fileWithAdjustments.videoAdjustments.scaleMode
        };
        
      }

      // Update progress during actual processing
      setProcessingProgress(85);
      setProcessingStatus('Applying final optimizations...');
      
      // Process the actual file with options including HDR setting
      const processed = await EmojiProcessor.processFile(file, { ...options, preserveHDR });
      
      // Update to 95% after processing
      setProcessingProgress(95);
      setProcessingStatus('Preparing preview...');
      
      // Store the adjustments in processed emoji for reference
      if (options.processingOptions?.speed) {
        (processed as any).speedMultiplier = options.processingOptions.speed;
      }
      if (options.processingOptions?.scaleMode) {
        (processed as any).scaleMode = options.processingOptions.scaleMode;
      }
      
      // Generate default name from filename
      const defaultName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 22);

      setEmojiName(defaultName);
      setProcessedEmoji(processed);
      
      // Update video adjustments if they were applied
      if (fileWithAdjustments.videoAdjustments) {
        setVideoAdjustments(fileWithAdjustments.videoAdjustments);
      }
      
      // Show 100% briefly before transitioning
      setProcessingProgress(100);
      setProcessingStatus('Complete!');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setCurrentStep('preview');
      
      track("Mobile Emoji Drawer: File Processed", {
        fileName: file.name,
        fileType: file.type,
        originalSize: file.size,
        processedSize: processed.processedSize,
        speedMultiplier: options.processingOptions?.speed,
        scaleMode: options.processingOptions?.scaleMode
      });
      
    } catch (error) {
      console.error('Processing failed:', error);
      toast.error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('select');
    }
  };

  const handleDownload = async () => {
    if (!processedEmoji) return;
    
    try {
      await EmojiProcessor.downloadEmoji({
        ...processedEmoji,
        name: emojiName || processedEmoji.name
      });
      
      toast.success('Emoji downloaded!');
      setCurrentStep('complete');
      
      track("Mobile Emoji Drawer: Downloaded", {
        emojiName: emojiName,
        format: processedEmoji.format
      });
      
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleSlackUpload = async () => {
    if (!processedEmoji) return;
    
    setIsUploadingToSlack(true);
    
    try {
      const result = await uploadEmojiToSlack(processedEmoji, emojiName || processedEmoji.name);
      
      if (result.success) {
        // Don't show toast, we'll show success screen instead
        setCurrentStep('complete');
        
        // Store the successful emoji name for display
        if (!emojiName) {
          setEmojiName(result.emojiName || processedEmoji.name);
        }
        
        track("Mobile Emoji Drawer: Slack Upload Success", {
          emojiName: result.emojiName,
          format: processedEmoji.format
        });
      } else {
        toast.error(result.error || 'Failed to upload to Slack');
      }
    } catch (error) {
      toast.error('Failed to upload to Slack');
    } finally {
      setIsUploadingToSlack(false);
    }
  };

  const handleStartOver = () => {
    setSelectedFile(null);
    setProcessedEmoji(null);
    setEmojiName('');
    setCurrentStep('select');
    setEditAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100
    });
    setShouldRemoveBackground(false);
    // Clean up background removed preview URL
    if (backgroundRemovedPreview) {
      URL.revokeObjectURL(backgroundRemovedPreview);
      setBackgroundRemovedPreview(null);
    }
    setVideoAdjustments({
      speed: 1.0,
      scaleMode: 'cover'
    });
  };

  const applyVideoEdits = async () => {
    if (!processedEmoji || !selectedFile) return;
    
    setIsApplyingEdits(true);
    
    // Track video edit application
    track("Mobile Emoji Drawer: Video Edits Applied", {
      speed: videoAdjustments.speed,
      scaleMode: videoAdjustments.scaleMode
    })
    
    try {
      toast.loading('Applying video edits...', { id: 'video-edit' });
      
      // Store the adjustments to be used in processFile
      const updatedFile = new File([selectedFile], selectedFile.name, {
        type: selectedFile.type
      });
      
      // Add metadata to the file object
      (updatedFile as any).videoAdjustments = {
        speed: videoAdjustments.speed,
        scaleMode: videoAdjustments.scaleMode
      };
      
      setSelectedFile(updatedFile);
      setCurrentStep('processing');
      await processFile(updatedFile);
      
      toast.dismiss('video-edit');
      toast.success(`Video edits applied!`);
      
    } catch (error) {
      toast.error('Failed to apply video edits');
    } finally {
      setIsApplyingEdits(false);
    }
  };
  
  const applyImageEdits = async () => {
    if (!processedEmoji || !selectedFile) return;
    
    setIsApplyingEdits(true);
    
    // Track image edit application
    track("Mobile Emoji Drawer: Image Edits Applied", {
      brightness: editAdjustments.brightness,
      contrast: editAdjustments.contrast,
      saturation: editAdjustments.saturation,
      removeBackground: shouldRemoveBackground
    })
    
    try {
      // Start with the appropriate source
      let processedBlob: Blob;
      
      if (shouldRemoveBackground && backgroundRemovedPreview) {
        // Use the already processed background-removed version
        const response = await fetch(backgroundRemovedPreview);
        processedBlob = await response.blob();
      } else if (shouldRemoveBackground) {
        // Apply background removal to the original file
        try {
          // Resize and remove background
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(selectedFile);
          });
          
          canvas.width = 128;
          canvas.height = 128;
          const scale = Math.min(128 / img.width, 128 / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (128 - scaledWidth) / 2;
          const offsetY = (128 - scaledHeight) / 2;
          ctx!.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

          const resizedBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
          });

          const { removeBackgroundEnhanced } = await import('@/lib/utils/background-removal');
          processedBlob = await removeBackgroundEnhanced(resizedBlob);
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
          toast.error('Background removal failed, applying other edits only');
          processedBlob = selectedFile;
        }
      } else {
        // Use original file
        processedBlob = selectedFile;
      }
      
      // Only apply filters if they're not at default values
      const hasAdjustments = editAdjustments.brightness !== 100 || 
                            editAdjustments.contrast !== 100 || 
                            editAdjustments.saturation !== 100;
      
      if (hasAdjustments) {
        // Apply brightness/contrast/saturation adjustments
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(processedBlob);
        });
        
        // Use original dimensions, not 128x128
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Apply the CSS filters
        ctx.filter = `
          brightness(${editAdjustments.brightness}%) 
          contrast(${editAdjustments.contrast}%) 
          saturate(${editAdjustments.saturation}%)
        `;
        
        ctx.drawImage(img, 0, 0);
        
        processedBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png', 1.0); // Use max quality
        });
      }
      
      // Create a new file with the edited blob
      const editedFile = new File(
        [processedBlob], 
        processedEmoji?.name || selectedFile.name, // Keep the emoji name
        { type: 'image/png' } // Always use PNG for edited images to preserve transparency
      );
      
      // Mark that this file has been edited to preserve edits
      (editedFile as any).isPreEdited = true; // Flag to skip re-processing
      (editedFile as any).editAdjustments = { ...editAdjustments };
      (editedFile as any).backgroundRemoved = shouldRemoveBackground;
      (editedFile as any).preserveHDR = preserveHDR;
      
      // Create a preview URL for the edited image
      const previewUrl = URL.createObjectURL(processedBlob);
      
      // Update the processed emoji directly with the edited version
      setProcessedEmoji(prev => {
        if (prev) {
          return {
            ...prev,
            processedBlob,
            preview: previewUrl,
            processingNote: shouldRemoveBackground ? 'Background removed' : 'Edited'
          };
        }
        return prev;
      });
      
      setCurrentStep('preview');
      toast.success('Edits applied successfully!');
      
      toast.success('Edits applied successfully!');
      
    } catch (error) {
      console.error('Failed to apply edits:', error);
      toast.error('Failed to apply edits');
    } finally {
      setIsApplyingEdits(false);
    }
  };

  // Step navigation header
  const renderHeader = () => {
    const canGoBack = currentStep !== 'select' && currentStep !== 'complete';
    
    return (
      <DrawerHeader className="relative py-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {canGoBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if ('vibrate' in navigator) {
                  navigator.vibrate(10);
                }
                if (currentStep === 'edit') setCurrentStep('preview');
                else if (currentStep === 'preview') setCurrentStep('select');
              }}
              className="h-8 w-8 -ml-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
          ) : (
            <div className="w-8" />
          )}
          
          <DrawerTitle className="text-center flex-1 text-sm font-medium">
            {currentStep === 'select' && 'Create Emoji'}
            {currentStep === 'processing' && 'Processing'}
            {currentStep === 'preview' && 'Preview'}
            {currentStep === 'edit' && 'Edit'}
            {currentStep === 'complete' && 'Success!'}
          </DrawerTitle>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if ('vibrate' in navigator) {
                navigator.vibrate(10);
              }
              handleClose();
            }}
            className="h-8 w-8 -mr-1 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DrawerHeader>
    );
  };

  // Render different steps with animations
  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        {currentStep === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-4 pt-4 pb-6 space-y-3"
          >
            <DrawerDescription className="text-center mb-4">
              Choose how to add your content
            </DrawerDescription>
            
            {[
              {
                icon: Upload,
                label: "Upload from Device",
                action: () => handleFileInput('upload'),
                color: "bg-blue-500/10 text-blue-500",
                description: "Photos, videos, or GIFs"
              },
              {
                icon: Camera,
                label: "Take Photo",
                action: () => handleFileInput('camera'),
                color: "bg-green-500/10 text-green-500",
                description: "Use your camera"
              },
              {
                icon: Video,
                label: "Record Video",
                action: () => handleFileInput('video'),
                color: "bg-purple-500/10 text-purple-500",
                description: "Create animated emoji"
              }
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.label}
                  onClick={option.action}
                  className={cn(
                    "w-full flex items-center gap-4 p-4",
                    "bg-card rounded-xl border",
                    "transition-all active:scale-[0.98]",
                    "hover:bg-accent/50"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", option.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </motion.div>
        )}

        {currentStep === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4 pt-4 pb-6 space-y-6"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-lg">Processing Your Emoji</h3>
              <p className="text-sm text-muted-foreground">{processingStatus}</p>
              <Progress value={processingProgress} className="w-full" />
              
              {/* Show warning for large files */}
              {selectedFile && selectedFile.size > 50 * 1024 * 1024 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Large video detected ({(selectedFile.size / (1024 * 1024)).toFixed(0)}MB). 
                    This may take a minute to process.
                  </p>
                </div>
              )}
              
              {/* Show size info */}
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  File: {selectedFile.name.substring(0, 30)}
                  {selectedFile.name.length > 30 ? '...' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {currentStep === 'preview' && processedEmoji && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 pt-4 pb-6 space-y-4"
          >
            {/* Emoji Preview */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-2xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                <img
                  src={processedEmoji.preview}
                  alt="Emoji preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Emoji Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Emoji Name</Label>
              <Input
                value={emojiName}
                onChange={(e) => setEmojiName(e.target.value)}
                placeholder="Enter emoji name"
                maxLength={22}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground text-center">
                This will be the name used in Slack (:{emojiName}:)
              </p>
            </div>

            {/* File Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{processedEmoji.format}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{formatBytes(processedEmoji.processedSize)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-medium">
                    {processedEmoji.dimensions.width}×{processedEmoji.dimensions.height}px
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {hasSlack ? (
                <Button 
                  onClick={handleSlackUpload} 
                  className="w-full" 
                  size="lg"
                  disabled={isUploadingToSlack || !emojiName.trim()}
                >
                  {isUploadingToSlack ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading to Slack...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Send to Slack
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleDownload} 
                  className="w-full" 
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Emoji
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => {
                  track("Mobile Emoji Drawer: Edit Started", {
                    format: processedEmoji?.format
                  })
                  // Reset edit adjustments when entering edit mode
                  setEditAdjustments({ brightness: 100, contrast: 100, saturation: 100 })
                  setShouldRemoveBackground(false)
                  setBackgroundRemovedPreview(null)
                  setPreserveHDR(false)
                  setVideoAdjustments({ speed: 1.0, scaleMode: 'cover' })
                  setCurrentStep('edit')
                }}
                className="w-full"
                size="lg"
              >
                <Edit3 className="mr-2 h-5 w-5" />
                Edit Emoji
              </Button>
            </div>
          </motion.div>
        )}

        {currentStep === 'edit' && processedEmoji && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 pt-4 pb-6 space-y-4"
          >
            {/* Determine if it's an image or video/GIF */}
            {(() => {
              const isVideo = selectedFile?.type.startsWith('video/');
              const isGif = processedEmoji.format === 'GIF';
              const isAnimated = isVideo || isGif;
              
              return (
                <>
                  {/* Preview with filters */}
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-2xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden relative">
                      {isRemovingBackground && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                      <img
                        src={backgroundRemovedPreview || processedEmoji.preview}
                        alt="Emoji preview"
                        className="w-full h-full object-contain"
                        style={!isAnimated ? {
                          filter: `
                            brightness(${editAdjustments.brightness}%) 
                            contrast(${editAdjustments.contrast}%) 
                            saturate(${editAdjustments.saturation}%)
                          `
                        } : undefined}
                      />
                    </div>
                  </div>

                  {/* Edit Controls */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-4">
                      {/* Check if it's a video/GIF */}
                      {isAnimated ? (
                        <>
                          {/* Video/GIF Controls */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm flex items-center gap-2">
                                <Gauge className="h-4 w-4" />
                                Speed
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {videoAdjustments.speed}x
                              </span>
                            </div>
                            <Slider
                              value={[videoAdjustments.speed * 100]}
                              onValueChange={([value]) => setVideoAdjustments(prev => ({ 
                                ...prev, 
                                speed: value / 100 
                              }))}
                              min={25}
                              max={200}
                              step={25}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm flex items-center gap-2">
                              <Maximize2 className="h-4 w-4" />
                              Scale Mode
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['cover', 'contain', 'stretch'] as const).map((mode) => (
                                <Button
                                  key={mode}
                                  variant={videoAdjustments.scaleMode === mode ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setVideoAdjustments(prev => ({ 
                                    ...prev, 
                                    scaleMode: mode 
                                  }))}
                                  className="capitalize"
                                >
                                  {mode === 'cover' ? 'Fill' : mode === 'contain' ? 'Fit' : 'Stretch'}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Image Controls */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                Brightness
                              </Label>
                              <span className="text-xs text-muted-foreground">{editAdjustments.brightness}%</span>
                            </div>
                            <Slider
                              value={[editAdjustments.brightness]}
                              onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, brightness: value }))}
                              min={50}
                              max={150}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm flex items-center gap-2">
                                <Contrast className="h-4 w-4" />
                                Contrast
                              </Label>
                              <span className="text-xs text-muted-foreground">{editAdjustments.contrast}%</span>
                            </div>
                            <Slider
                              value={[editAdjustments.contrast]}
                              onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, contrast: value }))}
                              min={50}
                              max={150}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Saturation
                              </Label>
                              <span className="text-xs text-muted-foreground">{editAdjustments.saturation}%</span>
                            </div>
                            <Slider
                              value={[editAdjustments.saturation]}
                              onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, saturation: value }))}
                              min={0}
                              max={200}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          <div className="pt-4 border-t space-y-4">
                            {/* HDR Processing Toggle */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="hdr-mode" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                                  <Sun className="h-4 w-4" />
                                  <span>Process as HDR</span>
                                </Label>
                                <Switch
                                  id="hdr-mode"
                                  checked={preserveHDR}
                                  onCheckedChange={setPreserveHDR}
                                />
                              </div>
                              {preserveHDR && (
                                <p className="text-xs text-muted-foreground">
                                  Preserves full color range and quality
                                </p>
                              )}
                            </div>
                            
                            {/* Background Removal Toggle */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="remove-bg" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                                  <Scissors className="h-4 w-4" />
                                  <span>Remove Background</span>
                                </Label>
                                <Switch
                                  id="remove-bg"
                                  checked={shouldRemoveBackground}
                                  onCheckedChange={async (checked) => {
                                    setShouldRemoveBackground(checked);
                                    if (checked && selectedFile && !isAnimated) {
                                      setIsRemovingBackground(true);
                                      try {
                                        // Process the original file through background removal
                                        const { removeBackgroundEnhanced } = await import('@/lib/utils/background-removal');
                                        
                                        // First resize the image to 128x128 to match emoji dimensions
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');
                                        const img = new Image();
                                        
                                        await new Promise((resolve, reject) => {
                                          img.onload = resolve;
                                          img.onerror = reject;
                                          img.src = URL.createObjectURL(selectedFile);
                                        });
                                        
                                        canvas.width = 128;
                                        canvas.height = 128;
                                        const scale = Math.min(128 / img.width, 128 / img.height);
                                        const scaledWidth = img.width * scale;
                                        const scaledHeight = img.height * scale;
                                        const offsetX = (128 - scaledWidth) / 2;
                                        const offsetY = (128 - scaledHeight) / 2;
                                        ctx!.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                                        
                                        const resizedBlob = await new Promise<Blob>((resolve) => {
                                          canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
                                        });
                                        
                                        const result = await removeBackgroundEnhanced(resizedBlob);
                                        const url = URL.createObjectURL(result);
                                        setBackgroundRemovedPreview(url);
                                      } catch (error) {
                                        console.error('Background removal failed:', error);
                                        toast.error('Failed to remove background');
                                        setShouldRemoveBackground(false);
                                      } finally {
                                        setIsRemovingBackground(false);
                                      }
                                    } else if (!checked) {
                                      if (backgroundRemovedPreview) {
                                        URL.revokeObjectURL(backgroundRemovedPreview);
                                      }
                                      setBackgroundRemovedPreview(null);
                                    }
                                  }}
                                  disabled={isRemovingBackground}
                                />
                              </div>
                              {(shouldRemoveBackground || isRemovingBackground) && (
                                <p className="text-xs text-muted-foreground">
                                  {isRemovingBackground ? 'Removing background...' : 'Background removed from preview'}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isAnimated) {
                            setVideoAdjustments({ speed: 1.0, scaleMode: 'cover' });
                          } else {
                            setEditAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
                            setShouldRemoveBackground(false);
                            setBackgroundRemovedPreview(null);
                            setPreserveHDR(false);
                          }
                          track("Mobile Emoji Drawer: Reset Edits", {
                            type: isAnimated ? "video" : "image"
                          })
                        }}
                        className="w-full"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset All
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Apply Button */}
                  <Button 
                    onClick={isAnimated ? applyVideoEdits : applyImageEdits}
                    className="w-full" 
                    size="lg"
                    disabled={isApplyingEdits}
                  >
                    {isApplyingEdits ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Applying Edits...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                </>
              );
            })()}
          </motion.div>
        )}

        {currentStep === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4 pt-4 pb-6 space-y-6"
          >
            {/* Success animation */}
            <div className="flex justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                  delay: 0.1
                }}
                className="relative"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <Check className="h-12 w-12 text-green-500" />
                  </motion.div>
                </div>
                {/* Celebration particles */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-4 border-green-500/30"
                />
              </motion.div>
            </div>
            
            {/* Success message */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-3"
            >
              <h3 className="font-bold text-2xl">
                {hasSlack ? '🎉 Uploaded to Slack!' : '✨ Downloaded!'}
              </h3>
              
              {hasSlack && emojiName && (
                <div className="space-y-4">
                  {/* Emoji name display with copy */}
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Your new emoji</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-lg font-mono bg-background px-3 py-1.5 rounded-lg border">
                        :{emojiName}:
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(`:${emojiName}:`);
                          toast.success('Copied emoji code!');
                          if ('vibrate' in navigator) {
                            navigator.vibrate(10);
                          }
                        }}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Emoji preview */}
                  {processedEmoji && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex justify-center"
                    >
                      <div className="relative">
                        <div className="w-32 h-32 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden shadow-lg">
                          <img
                            src={processedEmoji.preview}
                            alt="Emoji preview"
                            className="w-28 h-28 object-contain"
                          />
                        </div>
                        {/* Size badge */}
                        <div className="absolute -bottom-2 -right-2 bg-background border rounded-full px-2 py-1 text-xs font-medium shadow-sm">
                          {(processedEmoji.processedSize / 1024).toFixed(0)}KB
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <p className="text-sm text-muted-foreground px-4">
                    Your emoji is now available in Slack! Start typing <strong>:{emojiName}</strong> in any channel to use it.
                  </p>
                </div>
              )}
              
              {!hasSlack && (
                <p className="text-sm text-muted-foreground px-4">
                  Your emoji has been saved to your device.
                </p>
              )}
            </motion.div>

            {/* Action buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3"
            >
              <Button 
                onClick={() => {
                  track("Mobile Emoji Drawer: Create Another", {})
                  handleStartOver()
                }} 
                className="w-full" 
                size="lg"
                variant="default"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Create Another Emoji
              </Button>
              
              {hasSlack && (
                <Button 
                  onClick={() => {
                    // Open Slack in a new tab/app
                    window.open(`https://slack.com/app_redirect?channel=general`, '_blank');
                  }} 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Open Slack
                </Button>
              )}
              
              <Button 
                onClick={() => handleClose(true)} 
                variant="ghost" 
                className="w-full" 
                size="lg"
              >
                Done
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <>
      <Drawer 
        open={open} 
        onOpenChange={(newOpen) => {
          if (!newOpen && !showExitConfirmation) {
            // User is trying to close the drawer, check if we need confirmation
            handleClose();
          } else if (newOpen) {
            // User is opening the drawer
            setOpen(true);
          }
          // If showExitConfirmation is true, don't change drawer state
        }}
        modal={true}
      >
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent 
        className={cn(
          "z-[100] flex flex-col",
          // Dynamic height based on step
          currentStep === 'select' && "h-auto max-h-[65vh]",
          currentStep === 'processing' && "h-auto max-h-[50vh]",
          currentStep === 'preview' && "h-auto max-h-[80vh]",
          currentStep === 'edit' && "h-auto max-h-[85vh]",
          currentStep === 'complete' && "h-auto max-h-[70vh]"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {renderHeader()}
        <div className={cn(
          "overflow-y-auto overflow-x-hidden overscroll-contain",
          // Add min-height for better UX
          "min-h-[200px]"
        )}>
          {renderContent()}
        </div>
      </DrawerContent>
    </Drawer>

    {/* Exit Confirmation Dialog */}
    <AlertDialog open={showExitConfirmation} onOpenChange={(open) => {
      if (!open) {
        // User dismissed the dialog (via escape or clicking outside), keep drawer open
        handleCancelExit();
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your emoji?</AlertDialogTitle>
          <AlertDialogDescription>
            You have an emoji in progress. Are you sure you want to exit? Your current work will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelExit}>Continue Editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}