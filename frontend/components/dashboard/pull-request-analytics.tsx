"use client"

import { DashboardSection } from "./dashboard-section"
import { GitPulsePullRequest } from "@/types/api"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ArrowRight, GitPullRequest as PRIcon } from "lucide-react"
import { Button } from "@/frontend/components/ui/button"

const COLORS = {
  Open: "hsl(var(--chart-2, 160 84% 39%))",
  Closed: "hsl(var(--chart-1, 0 84% 60%))",
  Merged: "hsl(var(--chart-3, 280 65% 60%))"
}

export function PullRequestAnalytics({ 
  pullRequests,
  onViewAll 
}: { 
  pullRequests: GitPulsePullRequest[]
  onViewAll?: () => void 
}) {
  if (!pullRequests || pullRequests.length === 0) {
    return (
      <DashboardSection title="Pull Requests" description="Pull request merge trends">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground bg-muted/20">
          No pull requests found
        </div>
      </DashboardSection>
    )
  }

  let open = 0
  let closed = 0
  let merged = 0

  pullRequests.forEach(pr => {
    if (pr.mergedAt) {
      merged++
    } else if (pr.state === "closed") {
      closed++
    } else {
      open++
    }
  })

  const data = [
    { name: "Open", value: open, color: COLORS.Open },
    { name: "Closed (Not Merged)", value: closed, color: COLORS.Closed },
    { name: "Merged", value: merged, color: COLORS.Merged },
  ].filter(d => d.value > 0)

  return (
    <DashboardSection 
      title="Pull Requests" 
      description="Recent PR state distribution"
      action={
        onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs gap-1 h-8 px-2.5 font-mono text-primary hover:bg-primary/10"
          >
            <PRIcon className="h-3.5 w-3.5" />
            <span>View all {pullRequests.length} PRs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )
      }
    >
      <div className="h-64 mt-4 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No PR state data available
          </div>
        )}
      </div>
    </DashboardSection>
  )
}
