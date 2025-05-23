"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";
import { ReactNode } from "react";

interface OpenPanelWrapperProps {
  children: ReactNode;
}

// OpenPanel client ID from your OpenPanel dashboard
const OPENPANEL_CLIENT_ID = "15656b4d-85f1-4332-b4c2-2c5cc9b31bcc";

/**
 * OpenPanel wrapper component that provides analytics tracking
 * Following the official OpenPanel Next.js documentation
 */
export function OpenPanelWrapper({ children }: OpenPanelWrapperProps) {
  return (
    <>
      {/* OpenPanel component from the SDK - this handles script loading automatically */}
      <OpenPanelComponent
        clientId={OPENPANEL_CLIENT_ID}
        trackScreenViews={true}
        trackAttributes={true}
        trackOutgoingLinks={true}
        // Removed filter function to prevent process is not defined errors
      />
      {children}
    </>
  );
}
