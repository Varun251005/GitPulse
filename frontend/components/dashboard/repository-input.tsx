"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/frontend/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import { parseGitHubRepoUrl } from "@/backend/github/url"
import { signIn } from "next-auth/react"

export function RepositoryInput() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [errorCode, setErrorCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrorCode("")
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
        setError(
          data.error ||
            "This repository is private. Sign in with GitHub to analyze repositories you have access to."
        )
        setErrorCode(data.code || "")
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
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row w-full items-stretch gap-3">
        <div className="brutal-input-container flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError("")
              setErrorCode("")
            }}
            placeholder="https://github.com/facebook/react"
            className="brutal-input"
            aria-label="GitHub repository URL"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="brutal-btn"
          disabled={isLoading}
          aria-label="Analyze repository"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analyzing</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Analyze</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-red-950/80 border-2 border-red-500 rounded text-left mt-1">
          <p className="text-red-200 text-sm font-mono">{error}</p>
          {errorCode === "REPO_PRIVATE_LOGIN_REQUIRED" && (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => signIn("github")}
              className="gap-1.5 shrink-0 self-start sm:self-center font-mono font-bold"
            >
              <GithubIcon className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </div>
      )}

      {status && !error && (
        <p className="text-neutral-400 text-sm font-mono text-left px-2 mt-1">{status}</p>
      )}
    </form>
  )
}
