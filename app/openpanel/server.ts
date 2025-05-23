import { OpenPanel, type TrackHandlerPayload } from '@openpanel/nextjs';

// Define the filter function
function openPanelEventFilter(event: TrackHandlerPayload): boolean {
  // Check if it's a track event and if the name is 'Incoming Request'
  if (event.type === 'track' && event.payload && event.payload.name === 'Incoming Request') {
    return false; // Do not track this event
  }
  return true; // Track all other events
}

export const openpanel = new OpenPanel({
  clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!,
  clientSecret: process.env.OPENPANEL_CLIENT_SECRET!,
  filter: openPanelEventFilter, // Add the filter here
});
