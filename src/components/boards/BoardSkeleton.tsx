"use client"

/**
 * Skeleton loader for the Board Detail page
 */

export default function BoardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="grid w-full max-w-md grid-cols-3 gap-1">
        <div className="h-9 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Pipeline Columns Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-8 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
