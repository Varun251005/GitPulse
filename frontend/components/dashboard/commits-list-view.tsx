"use client"

import React, { useState, useMemo } from "react"
import { GitPulseCommit, GitPulseContributor } from "@/types/api"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { 
  GitCommit, 
  Search, 
  User, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Sparkles
} from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/frontend/lib/date-utils"

interface CommitsListViewProps {
  commits: GitPulseCommit[]
  contributors: GitPulseContributor[]
  selectedContributor?: string | null
  onSelectContributor?: (username: string | null) => void
  repoOwner: string
  repoName: string
}

export function CommitsListView({
  commits,
  contributors,
  selectedContributor = null,
  onSelectContributor,
  repoOwner,
  repoName,
}: CommitsListViewProps) {
  const [search, setSearch] = useState("")
  const [activeContributor, setActiveContributor] = useState<string | null>(selectedContributor || null)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)

  // Sync external filter when prop changes
  React.useEffect(() => {
    if (selectedContributor !== undefined) {
      setActiveContributor(selectedContributor)
    }
  }, [selectedContributor])

  const handleContributorChange = (author: string | null) => {
    setActiveContributor(author)
    if (onSelectContributor) {
      onSelectContributor(author)
    }
  }

  const handleCopySha = (sha: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(sha)
    setCopiedSha(sha)
    setTimeout(() => setCopiedSha(null), 2000)
  }

  // Filter commits
  const filteredCommits = useMemo(() => {
    return commits.filter((commit) => {
      // Author filter
      if (activeContributor) {
        const authorUsername = commit.author?.username?.toLowerCase()
        if (authorUsername !== activeContributor.toLowerCase()) {
          return false
        }
      }

      // Search query (message, sha, author)
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const msg = commit.message.toLowerCase()
        const sha = commit.sha.toLowerCase()
        const author = (commit.author?.username || "").toLowerCase()
        if (!msg.includes(q) && !sha.includes(q) && !author.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [commits, activeContributor, search])

  // Get list of unique authors from commits
  const commitAuthors = useMemo(() => {
    const authorsMap = new Map<string, { username: string; avatarUrl: string | null; count: number }>()
    
    commits.forEach((c) => {
      const username = c.author?.username || "Unknown"
      const existing = authorsMap.get(username)
      if (existing) {
        existing.count++
      } else {
        authorsMap.set(username, {
          username,
          avatarUrl: c.author?.avatarUrl || null,
          count: 1,
        })
      }
    })

    return Array.from(authorsMap.values()).sort((a, b) => b.count - a.count)
  }, [commits])

  return (
    <div className="space-y-4 sm:space-y-5 font-mono">
      {/* Filter & Search Header */}
      <div className="bg-neutral-900/60 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-800 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search commit messages, SHAs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>

          {/* Contributor Dropdown Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <select
              value={activeContributor || ""}
              onChange={(e) => handleContributorChange(e.target.value ? e.target.value : null)}
              className="h-9 sm:h-10 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs sm:text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto flex-1 sm:flex-initial"
            >
              <option value="">All Contributors ({commits.length})</option>
              {commitAuthors.map((a) => (
                <option key={a.username} value={a.username}>
                  @{a.username} ({a.count} commits)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Pill */}
        {activeContributor && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[11px] sm:text-xs text-neutral-400">Filtering by author:</span>
            <Badge variant="secondary" className="gap-1.5 py-0.5 sm:py-1 px-2 sm:px-2.5 bg-primary/10 text-primary border border-primary/20 text-[11px] sm:text-xs">
              <User className="h-3 w-3" />
              @{activeContributor}
              <button
                onClick={() => handleContributorChange(null)}
                className="hover:bg-primary/20 rounded p-0.5 ml-1 transition-colors"
                title="Clear author filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <span className="text-[10px] sm:text-xs text-neutral-500">
              ({filteredCommits.length} matching)
            </span>
          </div>
        )}
      </div>

      {/* Commits List */}
      {filteredCommits.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredCommits.map((commit) => {
            const isExpanded = expandedCommit === commit.sha
            const lines = commit.message.split("\n")
            const titleLine = lines[0] || "No commit message"
            const bodyLines = lines.slice(1).join("\n").trim()
            const hasMoreBody = bodyLines.length > 0

            return (
              <div
                key={commit.sha}
                className="group p-3.5 sm:p-5 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-all shadow-md space-y-2.5 sm:space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                  
                  {/* Left: Author & Message */}
                  <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0 mt-0.5">
                      <GitCommit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {/* Author info */}
                        {commit.author?.avatarUrl ? (
                          <Image
                            src={commit.author.avatarUrl}
                            alt={commit.author.username}
                            width={18}
                            height={18}
                            className="rounded-full ring-1 ring-neutral-700 shrink-0"
                          />
                        ) : (
                          <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                            {(commit.author?.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <button
                          onClick={() => handleContributorChange(commit.author?.username || null)}
                          className="text-[11px] sm:text-xs font-semibold text-neutral-300 hover:text-primary transition-colors hover:underline truncate max-w-[120px] sm:max-w-none"
                          title={`Filter commits by @${commit.author?.username || "unknown"}`}
                        >
                          @{commit.author?.username || "unknown"}
                        </button>
                        <span className="text-neutral-600 text-xs">•</span>
                        <span className="text-[10px] sm:text-xs text-neutral-400 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {formatDate(commit.committedAt)}
                        </span>
                      </div>

                      {/* Commit Title Message */}
                      <p className="text-xs sm:text-sm font-medium text-white break-words leading-snug">
                        {titleLine}
                      </p>

                      {/* Expandable Commit Body */}
                      {hasMoreBody && (
                        <div>
                          <button
                            onClick={() => setExpandedCommit(isExpanded ? null : commit.sha)}
                            className="text-[10px] sm:text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 pt-0.5 underline underline-offset-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" /> Hide description
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" /> Show description
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <pre className="mt-2 p-2.5 sm:p-3 bg-neutral-900/80 rounded-lg text-[11px] sm:text-xs text-neutral-300 whitespace-pre-wrap font-mono border border-neutral-800">
                              {bodyLines}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: SHA badge & external link */}
                  <div className="flex items-center gap-2 self-start shrink-0 pt-1 sm:pt-0 sm:ml-4">
                    <button
                      onClick={(e) => handleCopySha(commit.sha, e)}
                      className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] sm:text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                      title="Click to copy full commit SHA"
                    >
                      {copiedSha === commit.sha ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-neutral-400" />
                          <span>{commit.sha.substring(0, 7)}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://github.com/${repoOwner}/${repoName}/commit/${commit.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 sm:p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors"
                      title="View commit on GitHub"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl sm:rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center space-y-2.5">
          <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-neutral-500 opacity-50" />
          <h3 className="font-semibold text-sm sm:text-base text-white">No commits found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {search || activeContributor
              ? "No commits matched your search filter criteria."
              : "No commits have been ingested for this repository yet."}
          </p>
          {(search || activeContributor) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("")
                handleContributorChange(null)
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
