"use client"

import React, { useState, useMemo } from "react"
import { GitPulsePullRequest } from "@/types/api"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { 
  GitPullRequest, 
  Search, 
  GitMerge, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ExternalLink, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Sparkles,
  GitBranch
} from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/frontend/lib/date-utils"

interface PullRequestsListViewProps {
  pullRequests: GitPulsePullRequest[]
  repoOwner: string
  repoName: string
  defaultBranch?: string
}

export function PullRequestsListView({
  pullRequests,
  repoOwner,
  repoName,
  defaultBranch = "main",
}: PullRequestsListViewProps) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "merged" | "closed" | "draft">("all")
  const [expandedPr, setExpandedPr] = useState<number | null>(null)

  // Counts
  const counts = useMemo(() => {
    let open = 0
    let merged = 0
    let closed = 0
    let draft = 0

    pullRequests.forEach((pr) => {
      if (pr.draft) draft++
      if (pr.mergedAt) {
        merged++
      } else if (pr.state === "closed") {
        closed++
      } else {
        open++
      }
    })

    return { total: pullRequests.length, open, merged, closed, draft }
  }, [pullRequests])

  // Filter PRs
  const filteredPRs = useMemo(() => {
    return pullRequests.filter((pr) => {
      // State filter
      if (stateFilter === "open" && (pr.state !== "open" || pr.mergedAt)) return false
      if (stateFilter === "merged" && !pr.mergedAt) return false
      if (stateFilter === "closed" && (pr.state !== "closed" || pr.mergedAt)) return false
      if (stateFilter === "draft" && !pr.draft) return false

      // Search query (title, number, author)
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const title = pr.title.toLowerCase()
        const num = pr.number.toString()
        const author = (pr.author?.username || "").toLowerCase()
        if (!title.includes(q) && !num.includes(q) && !author.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [pullRequests, stateFilter, search])

  const getPrBadge = (pr: GitPulsePullRequest) => {
    if (pr.mergedAt) {
      return (
        <Badge className="bg-purple-600/15 text-purple-400 border border-purple-500/30 gap-1.5 py-1 px-2.5 font-mono text-xs">
          <GitMerge className="h-3.5 w-3.5" />
          Merged
        </Badge>
      )
    }
    if (pr.draft) {
      return (
        <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 gap-1.5 py-1 px-2.5 font-mono text-xs">
          <FileText className="h-3.5 w-3.5" />
          Draft
        </Badge>
      )
    }
    if (pr.state === "open") {
      return (
        <Badge className="bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-2.5 font-mono text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Open
        </Badge>
      )
    }
    return (
      <Badge className="bg-rose-600/15 text-rose-400 border border-rose-500/30 gap-1.5 py-1 px-2.5 font-mono text-xs">
        <XCircle className="h-3.5 w-3.5" />
        Closed
      </Badge>
    )
  }

  return (
    <div className="space-y-5 font-mono">
      {/* Search & State Filter Controls */}
      <div className="bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search pull requests by title, #, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 brutal-input !max-w-none text-sm"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={stateFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStateFilter("all")}
              className="rounded-lg text-xs h-8 px-3 font-mono"
            >
              All ({counts.total})
            </Button>
            <Button
              variant={stateFilter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setStateFilter("open")}
              className="rounded-lg text-xs h-8 px-3 gap-1 font-mono text-emerald-400 border-emerald-500/20"
            >
              <CheckCircle2 className="h-3 w-3" />
              Open ({counts.open})
            </Button>
            <Button
              variant={stateFilter === "merged" ? "default" : "outline"}
              size="sm"
              onClick={() => setStateFilter("merged")}
              className="rounded-lg text-xs h-8 px-3 gap-1 font-mono text-purple-400 border-purple-500/20"
            >
              <GitMerge className="h-3 w-3" />
              Merged ({counts.merged})
            </Button>
            <Button
              variant={stateFilter === "closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStateFilter("closed")}
              className="rounded-lg text-xs h-8 px-3 gap-1 font-mono text-rose-400 border-rose-500/20"
            >
              <XCircle className="h-3 w-3" />
              Closed ({counts.closed})
            </Button>
          </div>

        </div>
      </div>

      {/* Pull Requests List */}
      {filteredPRs.length > 0 ? (
        <div className="space-y-3">
          {filteredPRs.map((pr) => {
            const isExpanded = expandedPr === pr.number
            const hasBody = Boolean(pr.body && pr.body.trim().length > 0)

            return (
              <div
                key={pr.githubId || pr.number}
                className="p-4 sm:p-5 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-all shadow-md space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  
                  {/* Left: PR info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0 mt-0.5">
                      <GitPullRequest className="h-4 w-4 text-purple-400" />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      {/* PR Title and Number */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPrBadge(pr)}
                        <span className="text-xs text-neutral-400 font-bold font-mono">#{pr.number}</span>
                        <h4 className="text-sm font-semibold text-white break-words">
                          {pr.title}
                        </h4>
                      </div>

                      {/* Author & Meta */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
                        {pr.author?.avatarUrl ? (
                          <Image
                            src={pr.author.avatarUrl}
                            alt={pr.author.username}
                            width={18}
                            height={18}
                            className="rounded-full ring-1 ring-neutral-700"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold">
                            {(pr.author?.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-neutral-300 font-medium">@{pr.author?.username || "ghost"}</span>
                        <span className="text-neutral-600">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Opened {formatDate(pr.openedAt)}
                        </span>
                        {pr.mergedAt && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="text-purple-400 flex items-center gap-1">
                              <GitMerge className="h-3 w-3" />
                              Merged {formatDate(pr.mergedAt)} into {defaultBranch}
                            </span>
                          </>
                        )}
                        {!pr.mergedAt && pr.closedAt && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="text-rose-400">
                              Closed {formatDate(pr.closedAt)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Conflict / Branch status banner */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3 text-neutral-500" />
                          Target: <span className="text-neutral-300">{defaultBranch}</span>
                        </span>
                        {pr.draft && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> Work in progress (Draft)
                          </span>
                        )}
                      </div>

                      {/* Expandable Body */}
                      {hasBody && (
                        <div>
                          <button
                            onClick={() => setExpandedPr(isExpanded ? null : pr.number)}
                            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 pt-1 underline underline-offset-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" /> Hide PR description
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" /> View PR description
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3.5 bg-neutral-900/80 rounded-lg text-xs text-neutral-300 whitespace-pre-wrap font-sans border border-neutral-800 leading-relaxed">
                              {pr.body}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: GitHub Link */}
                  <a
                    href={`https://github.com/${repoOwner}/${repoName}/pull/${pr.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors self-start shrink-0"
                    title="View PR on GitHub"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-neutral-500 opacity-50" />
          <h3 className="font-semibold text-white">No pull requests found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {search || stateFilter !== "all"
              ? "No pull requests matched your filter criteria."
              : "No pull requests have been tracked for this repository yet."}
          </p>
          {(search || stateFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("")
                setStateFilter("all")
              }}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
