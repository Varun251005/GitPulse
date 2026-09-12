"use client"

import { DashboardSection } from "./dashboard-section"
import { GitPulseIssue } from "@/types/api"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ArrowRight, CircleDot } from "lucide-react"
import { Button } from "@/frontend/components/ui/button"

const COLORS = {
  Open: "hsl(var(--chart-2, 160 84% 39%))",
  Closed: "hsl(var(--chart-4, 280 65% 60%))"
}

export function IssueAnalytics({ 
  issues,
  onViewAll 
}: { 
  issues: GitPulseIssue[]
  onViewAll?: () => void 
}) {
  if (!issues || issues.length === 0) {
    return (
      <DashboardSection title="Issues" description="Issue resolution and tracking">
        <div className="flex h-44 sm:h-48 items-center justify-center rounded-xl border border-dashed text-xs sm:text-sm text-muted-foreground bg-muted/20">
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
    { name: "Closed", value: closed, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0)

  return (
    <DashboardSection 
      title="Issues" 
      description="Recent issue state distribution"
      action={
        onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-[11px] sm:text-xs gap-1 h-7 sm:h-8 px-2 sm:px-2.5 font-mono text-primary hover:bg-primary/10"
          >
            <CircleDot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>View {issues.length} issues</span>
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        )
      }
    >
      <div className="h-56 sm:h-64 mt-2 sm:mt-4 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
                formatter={(value) => [`${value} issues`, "Count"]}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs sm:text-sm text-muted-foreground">
            No issue state data available
          </div>
        )}
      </div>
    </DashboardSection>
  )
}
