import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Users, GitCommit, GitPullRequest, CircleDot, ArrowUpRight } from "lucide-react"
import { GitPulseSummary } from "@/types/api"

export type DashboardTabType = "overview" | "commits" | "pullRequests" | "issues" | "contributors"

export function SummaryCards({ 
  summary,
  onSelectTab,
  activeTab = "overview"
}: { 
  summary: GitPulseSummary
  onSelectTab?: (tab: DashboardTabType) => void
  activeTab?: DashboardTabType
}) {
  const cards = [
    {
      id: "contributors" as DashboardTabType,
      title: "Contributors",
      count: summary.contributorsCount,
      label: "Unique contributors",
      icon: Users,
      color: "text-blue-400 group-hover:text-blue-300",
      bgHover: "hover:border-blue-500/50 hover:bg-blue-500/5",
    },
    {
      id: "commits" as DashboardTabType,
      title: "Commits",
      count: summary.commitsCount,
      label: "Total repository commits",
      icon: GitCommit,
      color: "text-emerald-400 group-hover:text-emerald-300",
      bgHover: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
    },
    {
      id: "pullRequests" as DashboardTabType,
      title: "Pull Requests",
      count: summary.pullRequestsCount,
      label: "All pull requests & branches",
      icon: GitPullRequest,
      color: "text-purple-400 group-hover:text-purple-300",
      bgHover: "hover:border-purple-500/50 hover:bg-purple-500/5",
    },
    {
      id: "issues" as DashboardTabType,
      title: "Issues",
      count: summary.issuesCount,
      label: "All tracked issues & bugs",
      icon: CircleDot,
      color: "text-amber-400 group-hover:text-amber-300",
      bgHover: "hover:border-amber-500/50 hover:bg-amber-500/5",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 font-mono">
      {cards.map((card) => {
        const Icon = card.icon
        const isCurrentActive = activeTab === card.id

        return (
          <Card
            key={card.id}
            onClick={() => onSelectTab && onSelectTab(card.id)}
            className={`group transition-all duration-200 cursor-pointer ${card.bgHover} ${
              isCurrentActive
                ? "ring-2 ring-primary border-primary bg-neutral-900"
                : "border-neutral-800 bg-neutral-950/80"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-1.5">
                <span>{card.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color} transition-colors`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white tracking-tight">
                {card.count.toLocaleString()}
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                <span>{card.label}</span>
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details →
                </span>
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
