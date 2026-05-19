import React from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LockedFeatureProps {
  isLocked: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
  className?: string;
}

export function LockedFeature({ 
  isLocked, 
  onUpgrade, 
  children,
  className 
}: LockedFeatureProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div 
      className={cn("relative overflow-hidden cursor-pointer group/locked", className)}
      onClick={onUpgrade}
    >
      {/* The real component renders underneath */}
      <div className="select-none pointer-events-none">
        {children}
      </div>

      {/* The Blur Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[12px] z-50 flex items-center justify-center transition-all duration-500 group-hover/locked:bg-slate-900/40">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-brand-500/40 border border-brand-400/20"
        >
          Upgrade to Pro
        </motion.button>
      </div>
    </div>
  );
}

export function ProLabel() {
  return (
    <span className="ml-1.5 px-1.5 py-0.5 bg-brand-500 text-white text-[8px] font-black rounded uppercase tracking-tighter shadow-lg shadow-brand-500/20">
      PRO
    </span>
  );
}

export function ProTooltip({ label, className }: { label: string, className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="flex items-center gap-1">
        {label}
        <Lock size={10} className="text-brand-500" />
      </span>
      <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest leading-none mt-0.5">Pro Feature</span>
    </div>
  );
}
