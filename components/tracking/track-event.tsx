"use client";

import { ReactNode, useCallback, CSSProperties, ElementType } from "react";
import { trackEvent } from "@/lib/openpanel-client";

interface TrackEventProps {
  /** The name of the event to track */
  eventName: string;
  /** Additional properties to include with the event */
  properties?: Record<string, any>;
  /** The element to wrap with tracking */
  children: ReactNode;
  /** Optional className to pass to the wrapper element */
  className?: string;
  /** Optional style to pass to the wrapper element */
  style?: CSSProperties;
  /** Element type to render (default: 'div') */
  as?: ElementType;
  /** Whether to track on click (default: true) */
  trackOnClick?: boolean;
  /** Whether to track on hover (default: false) */
  trackOnHover?: boolean;
  /** Whether to track on focus (default: false) */
  trackOnFocus?: boolean;
}

/**
 * A component that tracks events when interacting with its children
 */
export function TrackEvent({
  eventName,
  properties,
  children,
  className,
  style,
  as: Element = "div",
  trackOnClick = true,
  trackOnHover = false,
  trackOnFocus = false,
}: TrackEventProps) {
  const handleClick = useCallback(() => {
    if (trackOnClick) {
      trackEvent(eventName, { ...properties, action: "click" });
    }
  }, [eventName, properties, trackOnClick]);

  const handleMouseEnter = useCallback(() => {
    if (trackOnHover) {
      trackEvent(eventName, { ...properties, action: "hover" });
    }
  }, [eventName, properties, trackOnHover]);

  const handleFocus = useCallback(() => {
    if (trackOnFocus) {
      trackEvent(eventName, { ...properties, action: "focus" });
    }
  }, [eventName, properties, trackOnFocus]);

  return (
    <Element
      className={className}
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    >
      {children}
    </Element>
  );
}

/**
 * A component that tracks click events on its children
 */
export function TrackClick({
  eventName,
  properties,
  children,
  className,
  style,
  as = "div",
}: Omit<TrackEventProps, "trackOnClick" | "trackOnHover" | "trackOnFocus">) {
  return (
    <TrackEvent
      eventName={eventName}
      properties={properties}
      className={className}
      style={style}
      as={as}
      trackOnClick={true}
      trackOnHover={false}
      trackOnFocus={false}
    >
      {children}
    </TrackEvent>
  );
}

/**
 * A component that tracks hover events on its children
 */
export function TrackHover({
  eventName,
  properties,
  children,
  className,
  style,
  as = "div",
}: Omit<TrackEventProps, "trackOnClick" | "trackOnHover" | "trackOnFocus">) {
  return (
    <TrackEvent
      eventName={eventName}
      properties={properties}
      className={className}
      style={style}
      as={as}
      trackOnClick={false}
      trackOnHover={true}
      trackOnFocus={false}
    >
      {children}
    </TrackEvent>
  );
}
