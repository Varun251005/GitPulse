"use client"

import { DashboardSection } from "./dashboard-section"
import { GitPulseCommit } from "@/types/api"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { formatDate } from "@/frontend/lib/date-utils"
import { ArrowRight, GitCommit } from "lucide-react"
import { Button } from "@/frontend/components/ui/button"

export function CommitAnalytics({ 
  commits,
  onViewAll 
}: { 
  commits: GitPulseCommit[]
  onViewAll?: () => void 
}) {
  if (!commits || commits.length === 0) {
    return (
      <DashboardSection title="Commit Activity" description="Commit frequency over time">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground bg-muted/20">
          No commits available
        </div>
      </DashboardSection>
    )
  }

  // Group by date
  const countsByDate: Record<string, number> = {}
  commits.forEach(c => {
    const d = new Date(c.committedAt).toISOString().split('T')[0]
    countsByDate[d] = (countsByDate[d] || 0) + 1
  })

  // Format and sort dates
  const data = Object.entries(countsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: formatDate(date),
      count
    }))

  return (
    <DashboardSection 
      title="Commit Activity" 
      description="Based on available recent commits"
      action={
        onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs gap-1 h-8 px-2.5 font-mono text-primary hover:bg-primary/10"
          >
            <GitCommit className="h-3.5 w-3.5" />
            <span>View all {commits.length} commits</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )
      }
    >
      <div className="h-64 mt-4 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#09090b", 
                  borderColor: "#27272a", 
                  borderRadius: "8px", 
                  color: "#ffffff",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.7)",
                  padding: "8px 12px",
                }}
                itemStyle={{ color: "#e4e4e7", fontWeight: 500 }}
                labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}
                formatter={(value) => [`${value} commits`, "Commits"]}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No valid commit dates found
          </div>
        )}
      </div>
    </DashboardSection>
  )
}
