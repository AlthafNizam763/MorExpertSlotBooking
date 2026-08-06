import React from 'react';
import Image from 'next/image';
import logoImg from '@/app/src/images/logo.jpg';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
}

export const MorExpertLogo: React.FC<LogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textColor = 'text-slate-900',
  subtextColor = 'text-primary',
}) => {
  const logoImage = (
    <Image
      src={logoImg}
      alt="MorExpert Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain transition-transform duration-300 hover:scale-105 ${className}`}
      priority
    />
  );

  if (!showText) return logoImage;

  return (
    <div className="flex items-center gap-3">
      {logoImage}
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
