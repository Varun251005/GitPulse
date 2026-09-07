"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { parseGitHubRepoUrl } from "@/backend/github/url"

export function RepositoryInput() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setStatus("")

    const trimmed = url.trim()
    if (!trimmed) {
      setError("Please enter a repository URL")
      return
    }

    // Normalize user input so canonical parseGitHubRepoUrl can evaluate it
    let candidate = trimmed
    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
      if (candidate.startsWith("github.com/") || candidate.startsWith("www.github.com/")) {
        candidate = `https://${candidate}`
      } else if (!candidate.includes("://") && candidate.includes("/")) {
        candidate = `https://github.com/${candidate}`
      }
    }

    const parsed = parseGitHubRepoUrl(candidate)
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)")
      return
    }

    setIsLoading(true)
    setStatus("Queueing repository analysis…")

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://github.com/${parsed.owner}/${parsed.repo}` }),
      })

      if (res.status === 422) {
        const data = await res.json()
        setError(data.error || "Invalid GitHub repository URL.")
        setIsLoading(false)
        setStatus("")
        return
      }

      if (res.status === 403) {
        const data = await res.json()
        setError(data.error || "This repository is private. GitPulse can only analyze public repositories.")
        setIsLoading(false)
        setStatus("")
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to start analysis. Please try again.")
        setIsLoading(false)
        setStatus("")
        return
      }

      // Ingestion queued — navigate to the dashboard which will poll until ready
      setStatus("Analysis queued! Loading dashboard…")
      router.push(`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`)
    } catch {
      setError("Network error. Please check your connection and try again.")
      setIsLoading(false)
      setStatus("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col gap-2">
      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError("")
          }}
          placeholder="e.g., https://github.com/facebook/react"
          className="flex-1 h-12 text-lg px-4"
          aria-label="GitHub repository URL"
          disabled={isLoading}
        />
        <Button type="submit" size="lg" className="h-12 px-8" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Search className="h-5 w-5 mr-2" />
          )}
          Analyze
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm text-left px-2 mt-1 font-medium">{error}</p>
      )}
      {status && !error && (
        <p className="text-muted-foreground text-sm text-left px-2 mt-1">{status}</p>
      )}
    </form>
  )
}
