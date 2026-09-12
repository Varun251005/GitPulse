"use client"

import React, { useState, useMemo } from "react"
import { GitPulseContributor, GitPulseCommit } from "@/types/api"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { 
  Users, 
  Search, 
  GitCommit, 
  ExternalLink, 
  ArrowRight, 
  Sparkles,
  Trophy
} from "lucide-react"
import Image from "next/image"

interface ContributorsListViewProps {
  contributors: GitPulseContributor[]
  commits: GitPulseCommit[]
  onSelectContributor: (username: string) => void
}

export function ContributorsListView({
  contributors,
  commits,
  onSelectContributor,
}: ContributorsListViewProps) {
  const [search, setSearch] = useState("")

  // Calculate commit count per contributor
  const contributorData = useMemo(() => {
    const commitCounts: Record<string, number> = {}
    commits.forEach((c) => {
      const username = c.author?.username?.toLowerCase() || "unknown"
      commitCounts[username] = (commitCounts[username] || 0) + 1
    })

    const list = contributors.map((c) => {
      const count = commitCounts[c.username.toLowerCase()] || 0
      return {
        ...c,
        commitsCount: count,
      }
    })

    // Sort by commits count descending
    return list.sort((a, b) => b.commitsCount - a.commitsCount)
  }, [contributors, commits])

  const filteredContributors = useMemo(() => {
    if (!search.trim()) return contributorData
    const q = search.toLowerCase().trim()
    return contributorData.filter((c) => c.username.toLowerCase().includes(q))
  }, [contributorData, search])

  return (
    <div className="space-y-5 font-mono">
      {/* Search Header */}
      <div className="bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search contributors by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 brutal-input !max-w-none text-sm"
          />
        </div>

        <div className="text-xs text-neutral-400 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span>Total: {contributors.length} unique contributors</span>
        </div>
      </div>

      {/* Grid of Contributors */}
      {filteredContributors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContributors.map((c, index) => (
            <div
              key={c.id || c.username}
              className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-all shadow-md flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {c.avatarUrl ? (
                    <Image
                      src={c.avatarUrl}
                      alt={c.username}
                      width={44}
                      height={44}
                      className="rounded-full ring-2 ring-neutral-700 group-hover:ring-primary transition-all"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-white">
                      {c.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                      @{c.username}
                    </h4>
                    <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                      <GitCommit className="h-3 w-3 text-primary" />
                      <span>{c.commitsCount} {c.commitsCount === 1 ? "commit" : "commits"}</span>
                    </p>
                  </div>
                </div>

                {index === 0 && c.commitsCount > 0 && (
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Top contributor">
                    <Trophy className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectContributor(c.username)}
                  className="flex-1 text-xs gap-1.5 font-mono border-neutral-700 hover:bg-primary hover:text-black hover:border-primary transition-all"
                >
                  <span>View Commits</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <a
                  href={`https://github.com/${c.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title={`View @${c.username} on GitHub`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-neutral-500 opacity-50" />
          <h3 className="font-semibold text-white">No contributors found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {search
              ? `No contributors matched "${search}".`
              : "No contributors available."}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-2 text-xs">
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
