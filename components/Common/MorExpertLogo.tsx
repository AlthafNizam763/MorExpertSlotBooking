import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
}

export const MorExpertLogo: React.FC<LogoProps> = ({
  className = 'w-10 h-10',
  size = 40,
  showText = false,
  textColor = 'text-slate-900',
  subtextColor = 'text-primary',
}) => {
  const logoSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
    >
      <defs>
        {/* Rich gradient matching the exact blue-to-black metallic hexagon */}
        <linearGradient id="meHexGradient" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#1E7BE3" />
          <stop offset="40%" stopColor="#0B4FA6" />
          <stop offset="75%" stopColor="#072045" />
          <stop offset="100%" stopColor="#020813" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0A2540" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Isometric 3D Hexagon with smooth rounded corners */}
      <path
        d="M60 8
           C 63.5 8, 66.5 9.8, 68.3 12.8
           L 103.7 33.2
           C 106.8 35, 108.7 38.3, 108.7 41.8
           L 108.7 82.6
           C 108.7 86.1, 106.8 89.4, 103.7 91.2
           L 68.3 111.6
           C 66.5 114.6, 63.5 116.4, 60 116.4
           C 56.5 116.4, 53.5 114.6, 51.7 111.6
           L 16.3 91.2
           C 13.2 89.4, 11.3 86.1, 11.3 82.6
           L 11.3 41.8
           C 11.3 38.3, 13.2 35, 16.3 33.2
           L 51.7 12.8
           C 53.5 9.8, 56.5 8, 60 8 Z"
        fill="url(#meHexGradient)"
        filter="url(#logoShadow)"
      />

      {/* Central Vertical Gap Line */}
      <path
        d="M60 21 L60 103"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Left Face: 2 Curved Parallel Stripes */}
      <path
        d="M35 37 L35 87"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M48 29 L48 95"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Right Face: 3 Horizontal Stripes ('E') */}
      <path
        d="M72 43 L95 43"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M72 62 L92 62"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M72 81 L95 81"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!showText) return logoSvg;

  return (
    <div className="flex items-center gap-3">
      {logoSvg}
      <div>
        <span className={`text-xl font-bold tracking-tight block ${textColor}`}>
          MorExpert
        </span>
        <span className={`block text-[10px] uppercase font-bold tracking-widest ${subtextColor}`}>
          Slot Booking
        </span>
      </div>
    </div>
  );
};
