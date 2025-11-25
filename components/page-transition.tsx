"use client"

import { ReactNode, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Wrapper component for smooth page entrance animations.
 * Provides a consistent fade-in and slide-up effect for page content.
 */
export function PageTransition({ children, className, delay = 0 }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </div>
  )
}

interface StaggeredContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

/**
 * Container for staggered child animations.
 * Wraps children with incremental animation delays.
 */
export function StaggeredContainer({
  children,
  className,
  staggerDelay = 50,
}: StaggeredContainerProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <PageTransition key={index} delay={index * staggerDelay}>
              {child}
            </PageTransition>
          ))
        : children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Consistent page header with title, description, and optional actions.
 * Includes entrance animation.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <PageTransition className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </PageTransition>
  )
}

interface ContentSectionProps {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Animated content section with entrance animation.
 */
export function ContentSection({
  children,
  className,
  delay = 100,
}: ContentSectionProps) {
  return (
    <PageTransition delay={delay} className={className}>
      {children}
    </PageTransition>
  )
}
