'use client';

import { useState } from "react";
import { Upload, Camera, Video } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CreateEmojiDrawerProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export function CreateEmojiDrawer({ children, isMobile }: CreateEmojiDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // On desktop, just navigate directly to create page
  if (!isMobile) {
    return children;
  }

  const handleFileInput = (type: 'upload' | 'camera' | 'video') => {
    // Close drawer first
    setOpen(false);
    
    // Wait for drawer to close then open file picker
    setTimeout(() => {
      const input = document.createElement('input');
      input.type = 'file';
      
      if (type === 'upload') {
        input.accept = 'image/*,video/*,.gif';
      } else if (type === 'camera') {
        input.accept = 'image/*';
        // Use setAttribute for better mobile compatibility
        input.setAttribute('capture', 'environment');
      } else if (type === 'video') {
        input.accept = 'video/*';
        // Use setAttribute for better mobile compatibility  
        input.setAttribute('capture', 'environment');
      }
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        console.log('[CreateEmojiDrawer] File selected:', {
          type,
          fileName: file?.name,
          fileType: file?.type,
          fileSize: file?.size
        });
        
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result;
            if (!dataUrl) {
              console.error('[CreateEmojiDrawer] FileReader produced no data');
              return;
            }
            
            const fileData = {
              dataUrl: dataUrl,
              fileName: type === 'upload' ? file.name : type === 'camera' ? 'captured-photo.jpg' : 'captured-video.mp4',
              fileType: file.type,
              source: type
            };
            
            console.log('[CreateEmojiDrawer] Storing file data and navigating to /create');
            console.log('[CreateEmojiDrawer] Data URL length:', String(dataUrl).length);
            
            try {
              sessionStorage.setItem('pendingEmojiFile', JSON.stringify(fileData));
              console.log('[CreateEmojiDrawer] Data stored in sessionStorage successfully');
              
              // Verify storage
              const stored = sessionStorage.getItem('pendingEmojiFile');
              console.log('[CreateEmojiDrawer] Verified storage, length:', stored?.length);
              
              console.log('[CreateEmojiDrawer] Navigating to /create...');
              router.push('/create');
            } catch (error) {
              console.error('[CreateEmojiDrawer] Error storing data or navigating:', error);
              // If sessionStorage fails (quota exceeded), try alternative approach
              if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.error('[CreateEmojiDrawer] SessionStorage quota exceeded, file too large');
                // Could show an error toast here
              }
            }
          };
          reader.onerror = (error) => {
            console.error('[CreateEmojiDrawer] FileReader error:', error);
          };
          
          console.log('[CreateEmojiDrawer] Starting to read file as data URL...');
          reader.readAsDataURL(file);
        } else {
          console.log('[CreateEmojiDrawer] No file selected');
        }
      };
      
      // Add error handling for input click
      input.addEventListener('cancel', () => {
        console.log('[CreateEmojiDrawer] File selection cancelled');
      });
      
      input.click();
    }, 300); // Wait for drawer close animation
  };

  const options = [
    {
      icon: Upload,
      label: "Upload from Device",
      action: () => handleFileInput('upload'),
      color: "bg-blue-500/10 text-blue-500"
    },
    {
      icon: Video,
      label: "Record Video",
      action: () => handleFileInput('video'),
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      icon: Camera,
      label: "Take Photo",
      action: () => handleFileInput('camera'),
      color: "bg-green-500/10 text-green-500"
    }
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen} modal={true}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="z-[100]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DrawerHeader>
          <DrawerTitle>Create New Emoji</DrawerTitle>
          <DrawerDescription>Choose how to add your content</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">
          
          <div className="space-y-2">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.label}
                  onClick={option.action}
                  className={cn(
                    "w-full flex items-center gap-3 p-3",
                    "bg-card rounded-lg border",
                    "transition-all active:scale-[0.98]"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", option.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-medium text-sm">{option.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}