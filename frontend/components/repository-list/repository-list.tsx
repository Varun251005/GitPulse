"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useUserProfile } from "@/frontend/lib/user-context"
import { RepositoryCard, UserRepoItem } from "./repository-card"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Skeleton } from "@/frontend/components/ui/skeleton"
import { Search, AlertCircle, RefreshCw, Lock, Globe, Sparkles, ArrowRight } from "lucide-react"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import Image from "next/image"
import Link from "next/link"

export function RepositoryList() {
  const { data: session, status: authStatus } = useSession()
  const { user, isLoading: isUserLoading } = useUserProfile()

  const [repos, setRepos] = useState<UserRepoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all")
  const [sortBy, setSortBy] = useState<"updated" | "stars" | "name">("updated")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const activeUsername = user?.username || (session?.user as { username?: string })?.username || ""

  const fetchRepos = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError("")

    try {
      const url = user?.username
        ? `/api/github/repos?username=${encodeURIComponent(user.username)}&page=${pageNum}&per_page=50&visibility=all`
        : `/api/github/repos?page=${pageNum}&per_page=50&visibility=all`

      const res = await fetch(url)

      if (res.status === 401) {
        setError("Please sign in with GitHub to view your repositories.")
        setLoading(false)
        setLoadingMore(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to load repositories from GitHub.")
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const data = await res.json()
      if (append) {
        setRepos((prev) => [...prev, ...data.repositories])
      } else {
        setRepos(data.repositories || [])
      }
      setHasMore(Boolean(data.hasMore))
      setPage(pageNum)
    } catch {
      setError("Network error while connecting to GitHub. Please try again.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.username])

  useEffect(() => {
    if (isUserLoading) return

    if (user?.username || authStatus === "authenticated") {
      fetchRepos(1)
    } else if (authStatus === "unauthenticated" && !user) {
      setLoading(false)
    }
  }, [isUserLoading, user, authStatus, fetchRepos])

  // Computed counts
  const publicCount = useMemo(() => repos.filter((r) => !r.isPrivate).length, [repos])
  const privateCount = useMemo(() => repos.filter((r) => r.isPrivate).length, [repos])

  // Filtered & Sorted Repositories
  const filteredRepos = useMemo(() => {
    let list = repos

    // Visibility filter
    if (visibility === "public") {
      list = list.filter((r) => !r.isPrivate)
    } else if (visibility === "private") {
      list = list.filter((r) => r.isPrivate)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      )
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "stars") {
        return b.starsCount - a.starsCount
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [repos, visibility, search, sortBy])

  // Unauthenticated State
  if (!isUserLoading && !user && authStatus === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 max-w-md mx-auto p-8 border-2 border-neutral-800 rounded-2xl bg-neutral-950/80 backdrop-blur shadow-2xl">
        <div className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20">
          <GithubIcon className="h-10 w-10 fill-current text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight font-mono text-white">Sign in with GitHub</h2>
          <p className="text-sm text-neutral-400">
            Connect your GitHub account to view, search, and analyze all public repositories you have access to.
          </p>
        </div>
        <Button asChild size="lg" className="w-full gap-2 font-mono brutal-btn text-black font-bold">
          <Link href="/login">
            <GithubIcon className="h-5 w-5 fill-current" />
            Sign in with GitHub
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Greeting & Stats Banner */}
      {user && (
        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 shadow-md">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                width={48}
                height={48}
                className="rounded-full ring-2 ring-primary/40 border border-neutral-700"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{user.displayName}</span>
                <span className="text-xs font-normal text-neutral-400 font-mono">(@{user.username})</span>
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                {repos.length} public {repos.length === 1 ? "repository" : "repositories"} found on GitHub
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRepos(1)}
            disabled={loading}
            className="gap-1.5 font-mono text-xs border-neutral-700 hover:bg-neutral-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Header Controls: Search, Filters, Sort */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search your repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
              aria-label="Search repositories"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-center">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "updated" | "stars" | "name")}
              className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              aria-label="Sort repositories"
            >
              <option value="updated">Last updated</option>
              <option value="stars">Most stars</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            variant={visibility === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setVisibility("all")}
            className="rounded-full text-xs h-8 px-3.5"
          >
            All {repos.length > 0 && `(${repos.length})`}
          </Button>
          <Button
            variant={visibility === "public" ? "default" : "outline"}
            size="sm"
            onClick={() => setVisibility("public")}
            className="rounded-full text-xs h-8 px-3.5 gap-1.5"
          >
            <Globe className="h-3 w-3" />
            Public {repos.length > 0 && `(${publicCount})`}
          </Button>
          <Button
            variant={visibility === "private" ? "default" : "outline"}
            size="sm"
            onClick={() => setVisibility("private")}
            className="rounded-full text-xs h-8 px-3.5 gap-1.5"
          >
            <Lock className="h-3 w-3" />
            Private {repos.length > 0 && `(${privateCount})`}
          </Button>

          {repos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchRepos(1)}
              className="h-8 px-2 ml-auto text-muted-foreground hover:text-foreground"
              title="Refresh repository list"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchRepos(1)}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg p-5 h-40 bg-card space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-full" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRepos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        /* Empty Filter/Search State */
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center space-y-3 p-8 border border-dashed rounded-xl bg-muted/20">
          <Sparkles className="h-8 w-8 text-muted-foreground opacity-50" />
          <h3 className="font-semibold text-base">No repositories found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search
              ? `No repositories matched your search "${search}".`
              : `You have no ${visibility !== "all" ? visibility : ""} repositories available.`}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-2">
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Pagination / Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchRepos(page + 1, true)}
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore && <RefreshCw className="h-4 w-4 animate-spin" />}
            Load More Repositories
          </Button>
        </div>
      )}
    </div>
  )
}
