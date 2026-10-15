import React from 'react';
import { HiShieldCheck, HiShieldExclamation } from 'react-icons/hi2';

interface SentryShieldLogoProps {
  size?: number;
  glow?: boolean;
  armed?: boolean;
  className?: string;
}

export default function SentryShieldLogo({
  size = 32,
  glow = true,
  armed = true,
  className = '',
}: SentryShieldLogoProps) {
  const Icon = armed ? HiShieldCheck : HiShieldExclamation;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle Organic Botanical Aura */}
      {glow && (
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-300 ${
            armed
              ? 'bg-emerald-500/25 dark:bg-emerald-400/20 opacity-80'
              : 'bg-rose-500/25 dark:bg-rose-400/20 opacity-80'
          }`}
        />
      )}

      {/* Official React Icons Shield */}
      <Icon
        className={`relative shrink-0 transition-colors duration-300 ${
          armed
            ? 'text-emerald-700 dark:text-emerald-400 drop-shadow-[0_1px_4px_rgba(21,128,61,0.3)]'
            : 'text-rose-600 dark:text-rose-400 drop-shadow-[0_1px_4px_rgba(220,38,38,0.3)]'
        }`}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
