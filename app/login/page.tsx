"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUserProfile } from "@/frontend/lib/user-context"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import { ArrowRight, Loader2, AlertCircle, Sparkles, User, AtSign } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { user, login } = useUserProfile()

  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // If already logged in, redirect to /repos
  React.useEffect(() => {
    if (user) {
      router.push("/repos")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const cleanUsername = username.trim().replace(/^@/, "")
    if (!cleanUsername) {
      setError("Please enter your GitHub username.")
      return
    }

    setIsSubmitting(true)
    const result = await login(cleanUsername, displayName)
    setIsSubmitting(false)

    if (result.success) {
      router.push("/repos")
    } else {
      setError(result.error || "Failed to sign in. Please check your GitHub username.")
    }
  }

  return (
    <div className="grid-background min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-3 sm:px-4 py-8 sm:py-12 text-foreground font-mono">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="inline-flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-neutral-900 border-2 border-neutral-700 shadow-lg text-primary">
            <GithubIcon className="h-8 w-8 sm:h-10 sm:w-10 fill-current text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            Connect GitHub
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto font-sans">
            Enter your GitHub username to access your public repositories and analytics.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-neutral-950/90 backdrop-blur-md p-4 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-neutral-800 shadow-2xl space-y-5 sm:space-y-6">
          
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-destructive/15 border-2 border-destructive/30 rounded-xl text-destructive text-xs sm:text-sm font-mono">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
              <p className="flex-1 leading-snug break-words">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* GitHub Username Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <label htmlFor="username" className="text-xs uppercase tracking-wider font-bold text-neutral-300 flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-primary" />
                GitHub Username <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. torvalds or octocat"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="brutal-input"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-400">
                The GitHub username to fetch public repositories from.
              </p>
            </div>

            {/* Custom Display Name Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <label htmlFor="displayName" className="text-xs uppercase tracking-wider font-bold text-neutral-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Custom Display Name
              </label>
              <div className="relative">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="e.g. Linus Torvalds"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="brutal-input"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-400">
                Your custom name to display across GitPulse (optional).
              </p>
            </div>

            {/* Neo-brutalist Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="brutal-btn w-full flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="text-xs sm:text-sm">Verifying User...</span>
                </>
              ) : (
                <>
                  <GithubIcon className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                  <span className="text-xs sm:text-sm">Continue with GitHub</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 shrink-0" />
                </>
              )}
            </button>
          </form>

          {/* Tips / Info */}
          <div className="pt-3 sm:pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              Instant public repo access
            </span>
            <Link href="/" className="text-[11px] sm:text-xs text-neutral-400 hover:text-white underline underline-offset-4 transition-colors">
              Back home
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}
