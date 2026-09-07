import { GitBranch, Star, GitFork, BookMarked, ExternalLink } from "lucide-react"
import { GitBranch, Star, GitFork, BookMarked, ExternalLink, Search } from "lucide-react"
import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import { GitPulseRepo } from "@/types/api"
import Link from "next/link"

export function RepositoryHeader({ repository }: { repository: GitPulseRepo }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <BookMarked className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{repository.fullName}</h2>
          <Badge variant="secondary" className="ml-2 font-normal">
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between p-6 border rounded-lg bg-card text-card-foreground shadow-sm relative overflow-hidden">
      <div className="space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight break-all">{repository.fullName}</h2>
          </div>
          <Badge variant="secondary" className="w-fit font-medium">
            {repository.isPrivate ? "Private" : "Public"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
        
        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
          {repository.description || "No description provided."}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 pt-2 flex-wrap">
        
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-4 pt-3 border-t flex-wrap">
          {repository.language && (
            <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5" aria-label={`Language: ${repository.language}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-primary/40 inline-block"></span> 
              {repository.language}
            </span>
          )}
          <span className="flex items-center gap-1.5" title="Stars">
          <span className="flex items-center gap-1.5" aria-label={`${repository.starsCount.toLocaleString()} stars`} title="Stars">
            <Star className="h-4 w-4" /> {repository.starsCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5" title="Forks">
          <span className="flex items-center gap-1.5" aria-label={`${repository.forksCount.toLocaleString()} forks`} title="Forks">
            <GitFork className="h-4 w-4" /> {repository.forksCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end gap-3 mt-4 md:mt-0 relative z-10 w-full sm:w-auto">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/">
            <Search className="h-4 w-4 mr-2" />
            Search Another
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
          <a 
            href={repository.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
            aria-label="View on GitHub"
          >
            <GitBranch className="h-4 w-4" /> GitHub
            <ExternalLink className="h-3 w-3 ml-0.5" />
            <GitBranch className="h-4 w-4 mr-2" />
            View on GitHub
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
          </a>
        </div>
        </Button>
      </div>
    </div>
  )
}
