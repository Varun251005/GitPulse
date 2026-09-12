"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/frontend/components/ui/card"
import { Badge } from "@/frontend/components/ui/badge"
import { Star, GitFork, Lock, Globe, ExternalLink, Loader2 } from "lucide-react"

export interface UserRepoItem {
  id: number
  githubId: number
  name: string
  fullName: string
  owner: string
  ownerAvatar?: string
  description: string | null
  url: string
  isPrivate: boolean
  language: string | null
  starsCount: number
  forksCount: number
  openIssuesCount?: number
  updatedAt: string
  defaultBranch?: string
}

function getLanguageColor(language: string | null): string {
  if (!language) return "bg-muted-foreground/40"
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-green-500",
    Rust: "bg-orange-600",
    Go: "bg-cyan-500",
    Java: "bg-amber-600",
    Ruby: "bg-red-600",
    HTML: "bg-orange-500",
    CSS: "bg-indigo-500",
    PHP: "bg-purple-500",
    C: "bg-slate-500",
    "C++": "bg-pink-600",
    "C#": "bg-emerald-600",
    Kotlin: "bg-purple-600",
    Swift: "bg-amber-500",
    Shell: "bg-lime-600",
  }
  return colors[language] || "bg-primary/50"
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "now"
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays}d`
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) return `${diffInMonths}mo`
    return `${Math.floor(diffInMonths / 12)}y`
  } catch {
    return ""
  }
}

export function RepositoryCard({ repo }: { repo: UserRepoItem }) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleCardClick = async () => {
    if (isNavigating) return
    setIsNavigating(true)

    // Trigger ingestion queue in background (fire-and-forget / non-blocking)
    fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: repo.url }),
    }).catch(() => {})

    router.push(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`)
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group relative cursor-pointer overflow-hidden border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card/60 hover:bg-card flex flex-col justify-between rounded-lg sm:rounded-xl"
    >
      <CardContent className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
        {/* Top: Name, Badge, GitHub link */}
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-sm md:text-base tracking-tight truncate group-hover:text-primary transition-colors w-full" title={repo.name}>
                {repo.name}
              </h3>
              <div className="flex items-center gap-1">
                {repo.isPrivate ? (
                  <Badge
                    variant="outline"
                    className="gap-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium text-[8px] sm:text-[10px] px-1 py-0 shrink-0"
                  >
                    <Lock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                    <span>Priv</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-0.5 font-medium text-[8px] sm:text-[10px] px-1 py-0 shrink-0"
                  >
                    <Globe className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground" />
                    <span>Pub</span>
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {isNavigating && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />}
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 sm:p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted hidden sm:inline-flex"
                aria-label={`View ${repo.fullName} on GitHub`}
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 leading-tight font-sans">
            {repo.description || "No description."}
          </p>
        </div>

        {/* Bottom: Language, Stars, Forks, Updated Time */}
        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-border/50 text-[9px] sm:text-[11px] text-muted-foreground flex-wrap gap-y-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {repo.language && (
              <span className="flex items-center gap-0.5 sm:gap-1 font-medium text-foreground/80">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getLanguageColor(repo.language)} inline-block shrink-0`} />
                <span className="truncate max-w-[42px] sm:max-w-none">{repo.language}</span>
              </span>
            )}
            <span className="flex items-center gap-0.5" title={`${repo.starsCount} stars`}>
              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {repo.starsCount}
            </span>
            <span className="flex items-center gap-0.5" title={`${repo.forksCount} forks`}>
              <GitFork className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {repo.forksCount}
            </span>
          </div>

          <span className="text-[8px] sm:text-[10px] text-neutral-500">
            {formatRelativeTime(repo.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
