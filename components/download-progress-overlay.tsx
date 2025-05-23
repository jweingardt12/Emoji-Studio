import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface DownloadProgressOverlayProps {
  isOpen: boolean;
  progress: number;
  processedFiles: number;
  totalFiles: number;
  onCancel: () => void;
}

const DownloadProgressOverlay: React.FC<DownloadProgressOverlayProps> = ({ 
  isOpen,
  progress,
  processedFiles,
  totalFiles,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      modal={true} 
      onOpenChange={(openState) => {
        if (!openState) {
          onCancel(); 
        }
      }}
    >
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center mb-2">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Downloading Emojis
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Please keep this window open while your emojis are being prepared.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Progress value={progress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {processedFiles} / {totalFiles} emojis processed
          </p>
          {progress === 100 && totalFiles > 0 && (
            <p className="text-center text-sm text-green-600 mt-2">
              Finalizing your download...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadProgressOverlay;
