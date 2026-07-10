'use client';

import React, { useEffect, useRef } from 'react';

export function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect de la préférence "réduire les animations" (WCAG 2.2.2) : pas d'animation continue.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Suspend l'animation quand l'onglet est masqué (économie de batterie).
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(animationFrameId);
      else animationFrameId = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drops: { x: number; y: number; length: number; speed: number; opacity: number }[] = [];
    const dropCount = 100;

    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 15 + 10,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)'; // Subtle cyan rain
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      drops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.speed * 0.1, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x += drop.speed * 0.1;

        if (drop.y > canvas.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{ filter: 'blur(1px)' }}
    />
  );
}
