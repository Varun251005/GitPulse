"use client"

import React, { useState, useMemo } from "react"
import { GitPulseIssue } from "@/types/api"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { 
  CircleDot, 
  CheckCircle2, 
  Search, 
  MessageSquare, 
  ExternalLink, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Sparkles 
} from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/frontend/lib/date-utils"

interface IssuesListViewProps {
  issues: GitPulseIssue[]
  repoOwner: string
  repoName: string
}

export function IssuesListView({
  issues,
  repoOwner,
  repoName,
}: IssuesListViewProps) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "closed">("all")
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)

  // Counts
  const counts = useMemo(() => {
    let open = 0
    let closed = 0

    issues.forEach((i) => {
      if (i.state === "closed") {
        closed++
      } else {
        open++
      }
    })

    return { total: issues.length, open, closed }
  }, [issues])

  // Filter Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (stateFilter === "open" && issue.state !== "open") return false
      if (stateFilter === "closed" && issue.state !== "closed") return false

      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const title = issue.title.toLowerCase()
        const num = issue.number.toString()
        const author = (issue.author?.username || "").toLowerCase()
        if (!title.includes(q) && !num.includes(q) && !author.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [issues, stateFilter, search])

  return (
    <div className="space-y-5 font-mono">
      {/* Search & Filter Header */}
      <div className="bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search issues by title, #, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 brutal-input !max-w-none text-sm"
            />
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1.5">
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
              <CircleDot className="h-3 w-3" />
              Open ({counts.open})
            </Button>
            <Button
              variant={stateFilter === "closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStateFilter("closed")}
              className="rounded-lg text-xs h-8 px-3 gap-1 font-mono text-neutral-400 border-neutral-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Closed ({counts.closed})
            </Button>
          </div>

        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const isExpanded = expandedIssue === issue.number
            const hasBody = Boolean(issue.body && issue.body.trim().length > 0)
            const isOpen = issue.state === "open"

            return (
              <div
                key={issue.githubId || issue.number}
                className="p-4 sm:p-5 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-all shadow-md space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0 mt-0.5">
                      <CircleDot className={`h-4 w-4 ${isOpen ? "text-emerald-400" : "text-neutral-500"}`} />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Issue Title and Number */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOpen ? (
                          <Badge className="bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 gap-1.5 py-0.5 px-2 font-mono text-xs">
                            <CircleDot className="h-3 w-3" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 gap-1.5 py-0.5 px-2 font-mono text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Closed
                          </Badge>
                        )}
                        <span className="text-xs text-neutral-400 font-bold font-mono">#{issue.number}</span>
                        <h4 className="text-sm font-semibold text-white break-words">
                          {issue.title}
                        </h4>
                      </div>

                      {/* Author & Meta */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
                        {issue.author?.avatarUrl ? (
                          <Image
                            src={issue.author.avatarUrl}
                            alt={issue.author.username}
                            width={18}
                            height={18}
                            className="rounded-full ring-1 ring-neutral-700"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold">
                            {(issue.author?.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-neutral-300 font-medium">@{issue.author?.username || "ghost"}</span>
                        <span className="text-neutral-600">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Opened {formatDate(issue.openedAt)}
                        </span>
                        {issue.closedAt && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="text-neutral-400">
                              Closed {formatDate(issue.closedAt)}
                            </span>
                          </>
                        )}
                        {issue.commentsCount > 0 && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="flex items-center gap-1 text-primary">
                              <MessageSquare className="h-3 w-3" />
                              {issue.commentsCount} comments
                            </span>
                          </>
                        )}
                      </div>

                      {/* Expandable Body */}
                      {hasBody && (
                        <div>
                          <button
                            onClick={() => setExpandedIssue(isExpanded ? null : issue.number)}
                            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 pt-1 underline underline-offset-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" /> Hide issue description
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" /> View issue description
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3.5 bg-neutral-900/80 rounded-lg text-xs text-neutral-300 whitespace-pre-wrap font-sans border border-neutral-800 leading-relaxed">
                              {issue.body}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: GitHub Link */}
                  <a
                    href={`https://github.com/${repoOwner}/${repoName}/issues/${issue.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors self-start shrink-0"
                    title="View issue on GitHub"
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
          <h3 className="font-semibold text-white">No issues found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {search || stateFilter !== "all"
              ? "No issues matched your filter criteria."
              : "No issues have been tracked for this repository yet."}
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
