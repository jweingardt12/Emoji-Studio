// lib/safe-openpanel.ts
import { OpenPanel } from '@openpanel/nextjs';

// Ensure this file is treated as a module
export {};

let openpanelInstance: OpenPanel;

if (typeof window !== 'undefined') {
  openpanelInstance = new OpenPanel({
    clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
    trackScreenViews: true,
    trackAttributes: true,
    trackOutgoingLinks: true,
  });
} else {
  // Provide a mock/dummy instance for SSR or environments where window is not defined
  openpanelInstance = {
    track: (eventName: string, properties?: Record<string, any>) => {
      console.log(`OpenPanel Track (SSR - No-op): ${eventName}`, properties);
    },
    identify: (profileId: string, properties?: Record<string, any>) => {
      console.log(`OpenPanel Identify (SSR - No-op): ${profileId}`, properties);
    },
    profile: (properties: Record<string, any>) => {
      console.log('OpenPanel Profile (SSR - No-op):', properties);
    },
    // Add other methods if your app tries to call them during SSR
  } as any; // Cast to 'any' to satisfy OpenPanel type for the mock
}

export const openpanel = openpanelInstance;