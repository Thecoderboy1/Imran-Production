import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-shimmer bg-gradient-to-r from-slate-200/5 via-slate-200/10 to-slate-200/5 bg-[length:400%_100%] border border-white/5",
        variant === 'circle' ? "rounded-full" : "rounded-lg",
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-[2.5rem]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ClientSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
          <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
