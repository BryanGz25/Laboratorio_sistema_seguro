import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/** Panel glassmorphism: fondo translúcido, desenfoque y borde sutil. */
export const GlassCard = ({ children, className = '' }: GlassCardProps) => (
  <div
    className={`rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md ${className}`}
  >
    {children}
  </div>
);
