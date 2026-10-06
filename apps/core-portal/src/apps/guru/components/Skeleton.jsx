import React from 'react';

/**
 * Skeleton Components - Design System Portal Guru
 * Menyediakan kerangka placeholder animasi pulsa saat memuat data (Loading State).
 */
export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ${
            i === lines - 1 ? 'w-3/5' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };
  return (
    <div
      className={`rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0 ${sizes[size] || sizes.md} ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = ({ rows = 2, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <SkeletonText lines={rows} />
    </div>
  );
};

export const SkeletonList = ({ count = 3, className = '' }) => {
  return (
    <div className={`divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 min-h-[44px]">
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
