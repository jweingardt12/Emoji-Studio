"use client";

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface InfoDrawerResponsiveProps {
  trigger: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}

export function InfoDrawerResponsive({ trigger, title, description, children }: InfoDrawerResponsiveProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="w-full mt-4">
            {children}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="mt-4">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="max-w-2xl mx-auto w-full px-4 py-6">
        <DrawerHeader className="px-0">
          {title && <DrawerTitle>{title}</DrawerTitle>}
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="w-full">
          {children}
        </div>
        <DrawerClose asChild>
          <Button variant="outline" className="mx-auto mt-4">Close</Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}