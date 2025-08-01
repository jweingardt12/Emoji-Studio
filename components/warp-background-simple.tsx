"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { HTMLAttributes, useCallback, useMemo } from "react";

interface WarpBackgroundSimpleProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
}

const Beam = ({
  index,
  side,
  beamSize,
  delay,
  duration,
  color,
}: {
  index: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  beamSize: number;
  delay: number;
  duration: number;
  color: string;
}) => {
  const position = (index / beamSize) * 100;
  
  const getMotionProps = () => {
    switch (side) {
      case 'top':
        return {
          style: { 
            left: `${position}%`, 
            width: '4px',
            height: '100vh',
            background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}`,
          },
          initial: { y: '-120vh' }, // Start further off-screen
          animate: { y: '120vh' }, // End further off-screen
        };
      case 'bottom':
        return {
          style: { 
            left: `${position}%`, 
            width: '4px',
            height: '100vh',
            background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}`,
          },
          initial: { y: '120vh' }, // Start further off-screen
          animate: { y: '-120vh' }, // End further off-screen
        };
      case 'left':
        return {
          style: { 
            top: `${position}%`, 
            width: '100vw',
            height: '4px',
            background: `linear-gradient(to right, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}`,
          },
          initial: { x: '-120vw' }, // Start further off-screen
          animate: { x: '120vw' }, // End further off-screen
        };
      case 'right':
        return {
          style: { 
            top: `${position}%`, 
            width: '100vw',
            height: '4px',
            background: `linear-gradient(to right, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}`,
          },
          initial: { x: '120vw' }, // Start further off-screen
          animate: { x: '-120vw' }, // End further off-screen
        };
    }
  };

  const props = getMotionProps();

  return (
    <motion.div
      className="absolute opacity-60 flex items-center justify-center"
      style={props.style}
      initial={props.initial}
      animate={props.animate}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {/* Logo at the leading edge */}
      <img 
        src="/logo.png" 
        alt="" 
        className={cn(
          "absolute w-12 h-12 object-contain",
          side === 'top' ? 'bottom-[-24px]' : '',
          side === 'bottom' ? 'top-[-24px]' : '',
          side === 'left' ? 'right-[-24px]' : '',
          side === 'right' ? 'left-[-24px]' : ''
        )}
        style={{
          filter: `drop-shadow(0 0 20px ${color}) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))`
        }}
      />
    </motion.div>
  );
};

export const WarpBackgroundSimple: React.FC<WarpBackgroundSimpleProps> = ({
  children,
  className,
  beamsPerSide = 5,
  beamSize = 20,
  beamDelayMax = 5,
  beamDelayMin = 0,
  beamDuration = 8,
  ...props
}) => {
  const generateBeams = useCallback((side: 'top' | 'bottom' | 'left' | 'right') => {
    const beams = [];
    for (let i = 0; i < beamsPerSide; i++) {
      const delay = Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue}, 100%, 60%)`;
      beams.push({ index: i, side, delay, color });
    }
    return beams;
  }, [beamsPerSide, beamDelayMax, beamDelayMin]);

  const allBeams = useMemo(() => [
    ...generateBeams('top'),
    ...generateBeams('bottom'),
    ...generateBeams('left'),
    ...generateBeams('right'),
  ], [generateBeams]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)} {...props}>
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Animated beams */}
      {allBeams.map((beam, idx) => (
        <Beam
          key={`${beam.side}-${idx}`}
          index={beam.index}
          side={beam.side}
          beamSize={beamsPerSide}
          delay={beam.delay}
          duration={beamDuration}
          color={beam.color}
        />
      ))}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};