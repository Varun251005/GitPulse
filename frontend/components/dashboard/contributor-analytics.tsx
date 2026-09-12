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
        <div className="flex h-44 sm:h-48 items-center justify-center rounded-xl border border-dashed text-xs sm:text-sm text-muted-foreground bg-muted/20">
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
      description="Top contributors (click a bar to filter commits)"
    >
      <div className="h-56 sm:h-64 mt-2 sm:mt-4 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
              onClick={(state) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const evt = state as any
                if (evt && evt.activePayload && evt.activePayload.length > 0) {
                  const author = evt.activePayload[0]?.payload?.name
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
                width={85}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", cursor: "pointer" }}
              />
              <Tooltip 
                cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
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
                formatter={(value) => [`${value} commits`, "Total Commits"]}
                labelFormatter={(label) => `@${label}`}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]} 
                barSize={20} 
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs sm:text-sm text-muted-foreground">
            No contributor commit data available
          </div>
        )}
      </div>

      {/* Quick click list */}
      {data.length > 0 && onSelectContributor && (
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-neutral-800/80 text-xs font-mono mt-2">
          <span className="text-neutral-400 text-[10px] sm:text-[11px]">Filter by:</span>
          {data.map((item) => (
            <button
              key={item.name}
              onClick={() => onSelectContributor(item.name)}
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-primary hover:text-black hover:border-primary transition-all text-neutral-300 hover:font-bold text-[10px] sm:text-xs"
            >
              <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="truncate max-w-[90px] sm:max-w-none">@{item.name}</span>
              <span>({item.count})</span>
            </button>
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
