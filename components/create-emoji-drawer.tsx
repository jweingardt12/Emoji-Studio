'use client';

import { useState } from "react";
import { Upload, Camera, Video } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CreateEmojiDrawerProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export function CreateEmojiDrawer({ children, isMobile }: CreateEmojiDrawerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // On desktop, just navigate directly to create page
  if (!isMobile) {
    return children;
  }

  const handleFileUpload = () => {
    // Create a file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Store file in session storage for the create page to pick up
        const reader = new FileReader();
        reader.onload = (event) => {
          sessionStorage.setItem('pendingEmojiFile', JSON.stringify({
            dataUrl: event.target?.result,
            fileName: file.name,
            fileType: file.type,
            source: 'upload'
          }));
          router.push('/create');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
    setIsOpen(false);
  };

  const handleCapturePhoto = () => {
    // Create a camera input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          sessionStorage.setItem('pendingEmojiFile', JSON.stringify({
            dataUrl: event.target?.result,
            fileName: 'captured-photo.jpg',
            fileType: file.type,
            source: 'camera'
          }));
          router.push('/create');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
    setIsOpen(false);
  };

  const handleRecordVideo = () => {
    // Create a video capture input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.capture = 'environment'; // Use back camera
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          sessionStorage.setItem('pendingEmojiFile', JSON.stringify({
            dataUrl: event.target?.result,
            fileName: 'captured-video.mp4',
            fileType: file.type,
            source: 'video'
          }));
          router.push('/create');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
    setIsOpen(false);
  };

  const options = [
    {
      icon: Upload,
      label: "Upload from Device",
      onClick: handleFileUpload,
      color: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20"
    },
    {
      icon: Video,
      label: "Record Video",
      onClick: handleRecordVideo,
      color: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20"
    },
    {
      icon: Camera,
      label: "Take Photo",
      onClick: handleCapturePhoto,
      color: "bg-green-500/10 text-green-500 dark:bg-green-500/20"
    }
  ];

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="pb-safe">
        <div className="px-4 pt-4 pb-16 space-y-2">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                onClick={option.onClick}
                className={cn(
                  "w-full flex items-center gap-3 p-4",
                  "bg-card hover:bg-accent/50",
                  "rounded-xl border border-border",
                  "transition-all duration-200",
                  "active:scale-[0.98]",
                  "text-left",
                  "group"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg",
                  "flex items-center justify-center",
                  "transition-transform group-hover:scale-110",
                  option.color
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-medium text-base">{option.label}</p>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}