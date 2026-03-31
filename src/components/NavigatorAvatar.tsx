import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface NavigatorAvatarProps {
  mood?: 'happy' | 'sad';
  color?: 'blue' | 'pink';
  className?: string;
}

export default function NavigatorAvatar({ mood = 'happy', color = 'blue', className = "w-10 h-10" }: NavigatorAvatarProps) {
  const theme = {
    primary: "#10b981", // Emerald green (Pharmacy Cross)
    coat: "#ffffff",
    skin: "#fde047", // Warm skin tone
    hair: "#334155", // Slate 700
    glasses: "#0ea5e9", // Blue glasses
    accent: "#3b82f6" // Blue capsule
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-md relative z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Soft Glow */}
        <circle cx="50" cy="50" r="45" fill={theme.primary} opacity="0.05" />

        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Body / Lab Coat */}
          <path 
            d="M25,100 C25,70 35,65 50,65 C65,65 75,70 75,100 Z" 
            fill={theme.coat} 
            stroke="#e2e8f0" 
            strokeWidth="2" 
          />
          
          {/* Coat Collar & Inner Shirt */}
          <path d="M45,65 L50,75 L55,65 Z" fill="#bae6fd" />
          <path 
            d="M35,65 L50,85 L65,65" 
            fill="none" 
            stroke="#cbd5e1" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Green Cross Badge (Pharmacy Symbol) */}
          <g transform="translate(62, 72) scale(0.5)">
            <path 
              d="M10,0 L14,0 L14,10 L24,10 L24,14 L14,14 L14,24 L10,24 L10,14 L0,14 L0,10 L10,10 Z" 
              fill={theme.primary} 
            />
          </g>

          {/* Neck */}
          <rect x="45" y="55" width="10" height="12" fill="#fcd34d" />

          {/* Head */}
          <circle cx="50" cy="42" r="18" fill={theme.skin} />

          {/* Hair (Neat Professional Cut) */}
          <path 
            d="M30,45 C30,20 70,20 70,45 C73,30 65,18 50,18 C35,18 27,30 30,45 Z" 
            fill={theme.hair} 
          />
          {/* Hair Bangs */}
          <path 
            d="M32,40 C35,30 45,25 55,28 C60,29 65,35 68,40" 
            fill="none" 
            stroke={theme.hair} 
            strokeWidth="4" 
            strokeLinecap="round" 
          />

          {/* Glasses */}
          <rect x="35" y="36" width="12" height="8" rx="2" fill="none" stroke={theme.glasses} strokeWidth="1.5" />
          <rect x="53" y="36" width="12" height="8" rx="2" fill="none" stroke={theme.glasses} strokeWidth="1.5" />
          <line x1="47" y1="40" x2="53" y2="40" stroke={theme.glasses} strokeWidth="1.5" />

          {/* Eyes */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
          >
            <circle cx="41" cy="40" r="2" fill="#1e293b" />
            <circle cx="59" cy="40" r="2" fill="#1e293b" />
          </motion.g>

          {/* Blush */}
          {mood === 'happy' && (
            <>
              <circle cx="36" cy="46" r="2.5" fill="#f87171" opacity="0.4" filter="blur(1px)" />
              <circle cx="64" cy="46" r="2.5" fill="#f87171" opacity="0.4" filter="blur(1px)" />
            </>
          )}

          {/* Mouth */}
          {mood === 'happy' ? (
            <path 
              d="M46,48 Q50,52 54,48" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
            />
          ) : (
            <path 
              d="M47,50 Q50,48 53,50" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
            />
          )}
        </motion.g>

        {/* Floating Capsule (Pharmacy Element) */}
        <motion.g 
          animate={{ y: [0, -4, 0], rotate: [-15, 5, -15] }} 
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          transform="translate(15, 30)"
        >
          {/* Top half (Blue) */}
          <path d="M0,6 Q0,0 5,0 Q10,0 10,6 L10,10 L0,10 Z" fill={theme.accent} />
          {/* Bottom half (White) */}
          <path d="M0,10 L10,10 L10,14 Q10,20 5,20 Q0,20 0,14 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
          {/* Shine */}
          <path d="M2,4 L2,8" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </motion.g>

        {/* Floating Sparkles for Happy Mood */}
        {mood === 'happy' && (
          <motion.g 
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} 
            transition={{ duration: 2, repeat: Infinity }}
          >
            <path d="M80,25 L82,30 L87,32 L82,34 L80,39 L78,34 L73,32 L78,30 Z" fill="#fbbf24" />
          </motion.g>
        )}
      </svg>
    </div>
  );
}
