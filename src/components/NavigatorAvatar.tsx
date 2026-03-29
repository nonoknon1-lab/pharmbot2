import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface NavigatorAvatarProps {
  mood?: 'happy' | 'sad';
  color?: 'blue' | 'pink';
  className?: string;
}

export default function NavigatorAvatar({ mood = 'happy', color = 'blue', className = "w-10 h-10" }: NavigatorAvatarProps) {
  const shapes = {
    happy: "M20,50 C20,20 40,10 60,15 C80,20 90,40 85,65 C80,90 60,95 40,90 C20,85 15,70 20,50 Z",
    sad: "M25,55 C25,30 45,20 65,25 C85,30 95,50 90,75 C85,100 65,105 45,100 C25,95 20,80 25,55 Z"
  };

  const colors = {
    blue: {
      primary: "#3b82f6",
      secondary: "#2563eb",
      gradient: ["#60a5fa", "#2563eb"],
      glow: "rgba(59, 130, 246, 0.4)"
    },
    pink: {
      primary: "#ec4899",
      secondary: "#db2777",
      gradient: ["#f472b6", "#db2777"],
      glow: "rgba(236, 72, 153, 0.4)"
    }
  };

  const theme = colors[color];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
        style={{ backgroundColor: theme.glow }}
      />
      
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-lg relative z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: theme.gradient[0], stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: theme.gradient[1], stopOpacity: 1 }} />
          </linearGradient>
          <filter id="inner-shadow">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="2" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.2" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComponentTransfer in="shadow" result="shadow">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* Main Body Blob */}
        <motion.path
          d={shapes[mood]}
          fill={`url(#grad-${color})`}
          filter="url(#inner-shadow)"
          animate={{
            d: mood === 'happy' 
              ? [shapes.happy, "M22,48 C22,18 42,8 62,13 C82,18 92,38 87,63 C82,88 62,93 42,88 C22,83 17,68 22,48 Z", shapes.happy]
              : [shapes.sad, "M27,53 C27,28 47,18 67,23 C87,28 97,48 92,73 C87,98 67,103 47,98 C27,93 22,78 27,53 Z", shapes.sad]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Face */}
        <g transform="translate(35, 40)">
          {/* Eyes */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 1] }}
          >
            <circle cx="10" cy="10" r="3.5" fill="white" />
            <circle cx="25" cy="10" r="3.5" fill="white" />
          </motion.g>

          {/* Mouth */}
          {mood === 'happy' ? (
            <path
              d="M10,22 Q17.5,28 25,22"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M12,25 Q17.5,20 23,25"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}
        </g>

        {/* Highlights */}
        <circle cx="40" cy="30" r="8" fill="white" opacity="0.15" />
        <circle cx="35" cy="28" r="4" fill="white" opacity="0.1" />
      </svg>
    </div>
  );
}
