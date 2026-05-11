"use client"

import { Skeleton } from "@/components/ui/skeleton"

function LeadCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="flex items-start gap-2.5">
        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="pt-2 border-t border-border space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

export default function BoardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar skeleton */}
      <div className="border-b border-border px-4 sm:px-6 py-3 flex items-center gap-6">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-4 ml-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-16" />)}
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Columns skeleton */}
      <div className="flex gap-4 p-4 sm:p-6 overflow-x-auto flex-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-72 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              <LeadCardSkeleton />
              <LeadCardSkeleton />
              {i === 1 && <LeadCardSkeleton />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
