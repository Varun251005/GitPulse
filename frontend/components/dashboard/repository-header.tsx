import { GitBranch, Star, GitFork, BookMarked, ExternalLink, Search } from "lucide-react"
import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import { GitPulseRepo } from "@/types/api"
import Link from "next/link"

export function RepositoryHeader({ repository }: { repository: GitPulseRepo }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-6 border rounded-xl sm:rounded-2xl bg-card text-card-foreground shadow-sm relative overflow-hidden font-mono">
      <div className="space-y-2.5 sm:space-y-3 relative z-10 flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight break-all">{repository.fullName}</h2>
          </div>
          <Badge variant="secondary" className="w-fit font-medium text-[10px] sm:text-xs px-2 py-0.5 shrink-0 self-start sm:self-auto">
            {repository.isPrivate ? "Private" : "Public"}
          </Badge>
        </div>
        
        <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed font-sans">
          {repository.description || "No description provided."}
        </p>
        
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-muted-foreground mt-3 pt-2.5 border-t border-neutral-800/80 flex-wrap">
          {repository.language && (
            <span className="flex items-center gap-1 sm:gap-1.5" aria-label={`Language: ${repository.language}`}>
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary/40 inline-block"></span> 
              {repository.language}
            </span>
          )}
          <span className="flex items-center gap-1 sm:gap-1.5" aria-label={`${repository.starsCount.toLocaleString()} stars`} title="Stars">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {repository.starsCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 sm:gap-1.5" aria-label={`${repository.forksCount.toLocaleString()} forks`} title="Forks">
            <GitFork className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {repository.forksCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 sm:gap-2.5 mt-2 sm:mt-4 md:mt-0 relative z-10 w-full md:w-auto shrink-0">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto text-xs h-8 sm:h-9">
          <Link href="/">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Search Another
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto text-xs h-8 sm:h-9">
          <a 
            href={repository.url} 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            View on GitHub
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
          </a>
        </Button>
      </div>
    </div>
  )
}
