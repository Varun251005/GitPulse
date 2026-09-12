"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardShell } from "@/frontend/components/dashboard/dashboard-shell"
import { RepositoryHeader } from "@/frontend/components/dashboard/repository-header"
import { SummaryCards } from "@/frontend/components/dashboard/summary-cards"
import { ContributorAnalytics } from "@/frontend/components/dashboard/contributor-analytics"
import { CommitAnalytics } from "@/frontend/components/dashboard/commit-analytics"
import { PullRequestAnalytics } from "@/frontend/components/dashboard/pull-request-analytics"
import { IssueAnalytics } from "@/frontend/components/dashboard/issue-analytics"
import { DashboardData } from "@/types/api"
import { Button } from "@/frontend/components/ui/button"
import { CommitsListView } from "@/frontend/components/dashboard/commits-list-view"
import { PullRequestsListView } from "@/frontend/components/dashboard/pull-requests-list-view"
import { IssuesListView } from "@/frontend/components/dashboard/issues-list-view"
import { ContributorsListView } from "@/frontend/components/dashboard/contributors-list-view"
import { DashboardTabType } from "@/frontend/components/dashboard/summary-cards"
import { 
  Loader2, 
  AlertCircle, 
  Lock, 
  ShieldAlert, 
  LayoutDashboard, 
  GitCommit, 
  GitPullRequest, 
  CircleDot, 
  Users 
} from "lucide-react"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import Link from "next/link"
import { Skeleton } from "@/frontend/components/ui/skeleton"
import { signIn } from "next-auth/react"

const MAX_POLL_ATTEMPTS = 30 // 30 × 4s = 2 minutes max wait
const POLL_INTERVAL_MS = 4000

function LoadingAnalytics() {
  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Analyzing repository…</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Fetching repository metadata, contributors, commits, pull requests, and issues.
            This may take a moment.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-3xl">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-6 h-24 bg-card shadow-sm">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}

function ErrorState({
  message,
  errorCode,
  onRetry,
}: {
  message: string
  errorCode?: string
  onRetry: () => void
}) {
  const isPrivateLoginRequired = errorCode === "REPO_PRIVATE_LOGIN_REQUIRED"
  const isUnauthorized = errorCode === "REPO_UNAUTHORIZED"

  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 max-w-md mx-auto">
        <div
          className={`p-4 rounded-full ${
            isPrivateLoginRequired
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : isUnauthorized
              ? "bg-destructive/10 text-destructive"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {isPrivateLoginRequired ? (
            <Lock className="h-10 w-10" />
          ) : isUnauthorized ? (
            <ShieldAlert className="h-10 w-10" />
          ) : (
            <AlertCircle className="h-10 w-10" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {isPrivateLoginRequired
              ? "Private Repository"
              : isUnauthorized
              ? "Access Denied"
              : "Repository Not Found"}
          </h2>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isPrivateLoginRequired ? (
            <Button onClick={() => signIn("github")} size="default" className="gap-2">
              <GithubIcon className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          ) : (
            <Button onClick={onRetry} variant="default">
              Try again
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/">Analyze another repository</Link>
          </Button>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function RepositoryDashboard({
  params,
}: {
  params: { owner: string; repo: string }
}) {
  const { owner, repo } = params
  const [data, setData] = useState<DashboardData | null>(null)
  const [state, setState] = useState<"loading" | "error" | "done">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [errorCode, setErrorCode] = useState("")
  const [pollCount, setPollCount] = useState(0)

  // Interactive tab and filter state
  const [activeTab, setActiveTab] = useState<DashboardTabType>("overview")
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null)

  const handleSelectContributor = (username: string | null) => {
    setSelectedContributor(username)
    setActiveTab("commits")
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}`, { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setState("done")
        return true
      }
      if (res.status === 404) {
        return false // still ingesting
      }
      if (res.status === 403) {
        const json = await res.json().catch(() => ({}))
        setState("error")
        setErrorMessage(
          json.error ||
            "This repository is private. Sign in with GitHub to analyze repositories you have access to."
        )
        setErrorCode(json.code || "")
        return true
      }
      // Other errors
      setState("error")
      setErrorMessage("Failed to load repository analytics. Please try again.")
      return true
    } catch {
      setState("error")
      setErrorMessage("Network error while loading analytics. Please try again.")
      return true
    }
  }, [owner, repo])

  const startPolling = useCallback(() => {
    setState("loading")
    setErrorMessage("")
    setErrorCode("")
    setPollCount(0)
  }, [])

  useEffect(() => {
    let cancelled = false
    let attempt = 0

    const poll = async () => {
      if (cancelled) return
      const done = await fetchData()
      attempt++
      setPollCount(attempt)
      if (!done && attempt < MAX_POLL_ATTEMPTS && !cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS)
      } else if (!done && attempt >= MAX_POLL_ATTEMPTS && !cancelled) {
        setState("error")
        setErrorMessage(
          "Repository analysis is taking longer than expected. The worker may not be running. " +
            "Please start the worker with `bun run worker` and try again."
        )
      }
    }

    poll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, pollCount === 0 && state === "loading"])

  if (state === "loading") {
    return <LoadingAnalytics />
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} errorCode={errorCode} onRetry={startPolling} />
  }

  if (!data) {
    return <ErrorState message="Repository data is unavailable." onRetry={startPolling} />
  }

  const tabs = [
    {
      id: "overview" as DashboardTabType,
      label: "Overview",
      icon: LayoutDashboard,
      count: undefined,
    },
    {
      id: "commits" as DashboardTabType,
      label: "Commits",
      icon: GitCommit,
      count: data.commits.length,
    },
    {
      id: "pullRequests" as DashboardTabType,
      label: "Pull Requests",
      icon: GitPullRequest,
      count: data.pullRequests.length,
    },
    {
      id: "issues" as DashboardTabType,
      label: "Issues",
      icon: CircleDot,
      count: data.issues.length,
    },
    {
      id: "contributors" as DashboardTabType,
      label: "Contributors",
      icon: Users,
      count: data.contributors.length,
    },
  ]

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-500 font-mono">
        <RepositoryHeader repository={data.repository} />

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive
                        ? "bg-black/20 text-primary-foreground"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium tracking-tight text-white">Repository Overview</h3>
                <span className="text-xs text-neutral-400">Click any card to view detailed breakdown</span>
              </div>
              <SummaryCards
                summary={data.summary}
                onSelectTab={setActiveTab}
                activeTab={activeTab}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ContributorAnalytics
                contributors={data.contributors}
                commits={data.commits}
                onSelectContributor={handleSelectContributor}
              />
              <CommitAnalytics
                commits={data.commits}
                onViewAll={() => setActiveTab("commits")}
              />
              <PullRequestAnalytics
                pullRequests={data.pullRequests}
                onViewAll={() => setActiveTab("pullRequests")}
              />
              <IssueAnalytics
                issues={data.issues}
                onViewAll={() => setActiveTab("issues")}
              />
            </div>
          </div>
        )}

        {/* TAB 2: COMMITS LIST VIEW */}
        {activeTab === "commits" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <GitCommit className="h-5 w-5 text-emerald-400" />
                  <span>Commit History</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Search commit messages, copy SHAs, and filter by user/contributor.
                </p>
              </div>
            </div>

            <CommitsListView
              commits={data.commits}
              contributors={data.contributors}
              selectedContributor={selectedContributor}
              onSelectContributor={setSelectedContributor}
              repoOwner={owner}
              repoName={repo}
            />
          </div>
        )}

        {/* TAB 3: PULL REQUESTS LIST VIEW */}
        {activeTab === "pullRequests" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-purple-400" />
                  <span>Pull Requests</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  View merged, open, closed, and draft pull requests with descriptions and target branches.
                </p>
              </div>
            </div>

            <PullRequestsListView
              pullRequests={data.pullRequests}
              repoOwner={owner}
              repoName={repo}
              defaultBranch={data.repository.defaultBranch}
            />
          </div>
        )}

        {/* TAB 4: ISSUES LIST VIEW */}
        {activeTab === "issues" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CircleDot className="h-5 w-5 text-amber-400" />
                  <span>Issues & Bugs</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Track open and resolved issues, comments count, and discussions.
                </p>
              </div>
            </div>

            <IssuesListView
              issues={data.issues}
              repoOwner={owner}
              repoName={repo}
            />
          </div>
        )}

        {/* TAB 5: CONTRIBUTORS LIST VIEW */}
        {activeTab === "contributors" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span>Contributors</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Click &ldquo;View Commits&rdquo; on any contributor to inspect their specific commit history.
                </p>
              </div>
            </div>

            <ContributorsListView
              contributors={data.contributors}
              commits={data.commits}
              onSelectContributor={handleSelectContributor}
            />
          </div>
        )}

      </div>
    </DashboardShell>
  )
}

