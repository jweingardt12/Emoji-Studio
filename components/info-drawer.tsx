"use client";

import { InfoIcon } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import * as React from "react";

interface InfoDrawerProps {
  trigger: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}

export function InfoDrawer({ trigger, title, description, children }: InfoDrawerProps) {
  return (
    <Drawer>
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
