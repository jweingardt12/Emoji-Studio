'use client';

import React, { useEffect, useState } from 'react';

const EMOJIS = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '🥰', '🤩', '🔥', '✨', '🎉', '👍'];

export function EmojiWaterfall({ show, duration = 4000 }: { show: boolean; duration?: number }) {
  const [visible, setVisible] = useState(false);
  
  // Generate a static array of emojis when component mounts
  const [emojis] = useState(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      left: Math.random() * 100, // Random position (0-100%)
      size: Math.floor(Math.random() * 40) + 30, // Size between 30-70px
      delay: Math.random() * 2, // Random delay (0-2s)
      duration: Math.random() * 2 + 3, // Fall duration (3-5s)
      rotation: Math.random() * 360, // Random rotation
    }));
  });

  // Show/hide the animation based on the show prop
  useEffect(() => {
    if (show) {
      console.log('Emoji waterfall animation triggered');
      setVisible(true);
      
      // Hide after duration
      const timer = setTimeout(() => {
        setVisible(false);
        console.log('Emoji waterfall animation ended');
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, duration]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 9999 }}>
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute"
          style={{
            left: `${emoji.left}%`,
            top: '-50px',
            fontSize: `${emoji.size}px`,
            transform: `rotate(${emoji.rotation}deg)`,
            animation: `fallDown ${emoji.duration}s linear forwards`,
            animationDelay: `${emoji.delay}s`,
          }}
        >
          {emoji.emoji}
        </div>
      ))}
      
      <style jsx global>{`
        @keyframes fallDown {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default EmojiWaterfall;
