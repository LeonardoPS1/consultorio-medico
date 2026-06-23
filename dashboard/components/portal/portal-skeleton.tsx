'use client';

import { motion } from 'framer-motion';

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-800/60 ${className ?? ''}`}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
      <Pulse className="h-4 w-24" />
      <Pulse className="h-8 w-32" />
      <Pulse className="h-3 w-40" />
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Pulse className="h-10 w-10 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <Pulse className="h-4 w-3/5" />
        <Pulse className="h-3 w-2/5" />
      </div>
      <Pulse className="h-8 w-16 rounded-lg" />
    </div>
  );
}

export function PortalSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header skeleton */}
      <div className="space-y-1">
        <Pulse className="h-6 w-44" />
        <Pulse className="h-4 w-60" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-2">
        <Pulse className="h-9 w-24 rounded-full" />
        <Pulse className="h-9 w-28 rounded-full" />
        <Pulse className="h-9 w-24 rounded-full" />
      </div>

      {/* List items */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/50">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </motion.div>
  );
}
