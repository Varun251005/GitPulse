"use client"

import { DashboardSection } from "./dashboard-section"
import { GitPulseIssue } from "@/types/api"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

const COLORS = {
  Open: "hsl(var(--chart-2, 160 84% 39%))",
  Closed: "hsl(var(--chart-4, 280 65% 60%))" // fallback color
}

export function IssueAnalytics({ issues }: { issues: GitPulseIssue[] }) {
  if (!issues || issues.length === 0) {
    return (
      <DashboardSection title="Issues" description="Issue resolution and tracking">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground bg-muted/20">
          No issues found
        </div>
      </DashboardSection>
    )
  }

  let open = 0
  let closed = 0

  issues.forEach(issue => {
    if (issue.state === "closed") {
      closed++
    } else {
      open++
    }
  })

  const data = [
    { name: "Open", value: open, color: COLORS.Open },
    { name: "Closed", value: closed, color: "hsl(var(--muted-foreground))" }, // Gray for closed
  ].filter(d => d.value > 0)

  return (
    <DashboardSection title="Issues" description="Recent issue state distribution">
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
            No issue state data available
          </div>
        )}
      </div>
    </DashboardSection>
  )
}
