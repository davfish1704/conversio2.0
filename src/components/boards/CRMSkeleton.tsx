"use client"

/**
 * Skeleton loader for the CRM Pipeline page
 * Shows while boards and pipeline data are loading
 */

function ColumnSkeleton() {
  return (
    <div className="w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-8 bg-gray-100 rounded-full animate-pulse" />
      </div>
      {/* Lead card skeletons */}
      <div className="space-y-2">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-50">
            <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
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
  )
}

export default function CRMSkeleton() {
  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Pipeline Skeleton */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          <ColumnSkeleton />
          <ColumnSkeleton />
          <ColumnSkeleton />
          <ColumnSkeleton />
        </div>
      </div>
    </div>
  )
}
