import { DashboardShell } from "@/frontend/components/dashboard/dashboard-shell"
import { Skeleton } from "@/frontend/components/ui/skeleton"

export default function Loading() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-card shadow-sm h-32">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        
        {/* Summary Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-lg p-6 h-32 bg-card shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-lg p-6 h-80 bg-card shadow-sm">
              <Skeleton className="h-6 w-32 mb-6" />
              <Skeleton className="h-full w-full opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
