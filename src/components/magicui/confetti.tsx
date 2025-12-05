"use client";

import confetti, { type Options as ConfettiOptions, type GlobalOptions } from "canvas-confetti";
import { useEffect, useRef, useCallback } from "react";

interface ConfettiProps {
  options?: ConfettiOptions;
  globalOptions?: GlobalOptions;
  manualstart?: boolean;
  className?: string;
}

export function Confetti({
  options,
  globalOptions = { resize: true, useWorker: true },
  manualstart = false,
  className,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<ReturnType<typeof confetti.create> | null>(null);

  const fire = useCallback((opts?: ConfettiOptions) => {
    if (confettiInstance.current) {
      confettiInstance.current({
        ...options,
        ...opts,
      });
    }
  }, [options]);

  useEffect(() => {
    if (!canvasRef.current) return;

    confettiInstance.current = confetti.create(canvasRef.current, globalOptions);

    if (!manualstart) {
      fire();
    }

    return () => {
      confettiInstance.current?.reset();
    };
  }, [globalOptions, manualstart, fire]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}

// Fireworks effect
export function ConfettiFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      myConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      myConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => {
      clearInterval(interval);
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}

// Side cannons effect (great for celebrations)
export function ConfettiSideCannons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const end = Date.now() + 1 * 1000;
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308"];

    const frame = () => {
      if (Date.now() > end) return;

      myConfetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      myConfetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();

    return () => {
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}

// Stars burst from center
export function ConfettiStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308"],
    };

    function shoot() {
      myConfetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ["star"],
      });

      myConfetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ["circle"],
      });
    }

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);

    return () => {
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}
