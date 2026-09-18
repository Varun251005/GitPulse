"use client"

import { DashboardSection } from "./dashboard-section"
import { GitPulseCommit, GitPulseContributor } from "@/types/api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { User } from "lucide-react"

export function ContributorAnalytics({ 
  contributors, 
  commits,
  onSelectContributor,
}: { 
  contributors: GitPulseContributor[]
  commits: GitPulseCommit[] 
  onSelectContributor?: (username: string) => void
}) {
  if (!contributors || contributors.length === 0) {
    return (
      <DashboardSection title="Contributors" description="Top contributors by commit volume">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground bg-muted/20">
          No contributors found
        </div>
      </DashboardSection>
    )
  }

  // Derive commit counts from available sample
  const commitCounts: Record<string, number> = {}
  commits.forEach(commit => {
    const author = commit.author?.username || "Unknown"
    commitCounts[author] = (commitCounts[author] || 0) + 1
  })

  // Format data for Recharts, taking top 5
  const data = Object.entries(commitCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return (
    <DashboardSection 
      title="Contributors" 
      description="Top contributors in recent commits (click a contributor to view their commits)"
    >
      <div className="h-64 mt-4 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const author = state.activePayload[0].payload.name
                  if (author && author !== "Unknown" && onSelectContributor) {
                    onSelectContributor(author)
                  }
                }
              }}
            >
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={100}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", cursor: "pointer" }}
              />
              <Tooltip 
                cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]} 
                barSize={24} 
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No contributor commit data available
          </div>
        )}
      </div>

      {/* Quick click list */}
      {data.length > 0 && onSelectContributor && (
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border/50 text-xs font-mono">
          <span className="text-muted-foreground text-[11px]">Filter commits by:</span>
          {data.map((item) => (
            <button
              key={item.name}
              onClick={() => onSelectContributor(item.name)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 hover:bg-primary hover:text-black transition-colors text-muted-foreground hover:font-bold"
            >
              <User className="h-3 w-3" />
              @{item.name} ({item.count})
            </button>
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
