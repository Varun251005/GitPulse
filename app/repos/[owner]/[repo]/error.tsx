"use client"

import { DashboardShell } from "@/frontend/components/dashboard/dashboard-shell"
import { Button } from "@/frontend/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error)
  }, [error])

  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-full">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Repository Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            This repository has not been ingested, could not be found, or an error occurred while loading analytics.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link href="/">Analyze another repository</Link>
          </Button>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </DashboardShell>
  )
}
