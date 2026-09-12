import { DashboardShell } from "@/frontend/components/dashboard/dashboard-shell"
import { RepositoryList } from "@/frontend/components/repository-list/repository-list"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Repositories - GitPulse",
  description: "Browse and analyze your public and private GitHub repositories.",
}

export default function RepositoriesPage() {
  return (
    <DashboardShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Your Repositories</h1>
          <p className="text-muted-foreground text-sm">
            Browse and analyze your public and private GitHub repositories.
          </p>
        </div>

        <RepositoryList />
      </div>
    </DashboardShell>
  )
}

