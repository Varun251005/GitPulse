"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/frontend/components/ui/input"
import { Button } from "@/frontend/components/ui/button"
import { Search, Loader2 } from "lucide-react"

export function RepositoryInput() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!url.trim()) {
      setError("Please enter a repository URL")
      return
    }
    
    setIsLoading(true)

    // Basic validation to extract owner and repo
    let owner = ""
    let repo = ""
    
    try {
      // Handle standard GitHub URLs
      if (url.includes("github.com/")) {
        const urlParts = new URL(url.startsWith("http") ? url : `https://${url}`)
        const pathParts = urlParts.pathname.split("/").filter(Boolean)
        if (pathParts.length >= 2) {
          owner = pathParts[0]
          repo = pathParts[1]
        }
      } 
      // Handle "owner/repo" format directly
      else if (url.includes("/") && url.split("/").length === 2) {
        const parts = url.split("/")
        owner = parts[0].trim()
        repo = parts[1].trim()
      }

      if (owner && repo) {
        router.push(`/repos/${owner}/${repo}`)
      } else {
        setError("Invalid format. Use https://github.com/owner/repo or owner/repo")
        setIsLoading(false)
      }
    } catch (err) {
      setError("Invalid URL format")
      setIsLoading(false)
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
    </form>
  )
}

