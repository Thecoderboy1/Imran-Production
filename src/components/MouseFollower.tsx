import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export default function MouseFollower() {
  const [isVisible, setIsVisible] = useState(false);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 150 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX - 10);
      mouseY.set(e.clientY - 10);
      if (!isVisible) setIsVisible(true);
    };

    window.addEventListener('mousemove', moveMouse);
    return () => window.removeEventListener('mousemove', moveMouse);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{
        translateX: cursorX,
        translateY: cursorY,
      }}
      className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-brand-500/50 pointer-events-none z-[9999] flex items-center justify-center mix-blend-difference"
    >
      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full glow-brand" />
    </motion.div>
  );
}
