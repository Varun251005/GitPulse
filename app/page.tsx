"use client"

import { RepositoryInput } from "@/frontend/components/dashboard/repository-input"
import { GithubLoginButton } from "@/frontend/components/ui/github-login-button"
import { Button } from "@/frontend/components/ui/button"
import { Card, CardContent } from "@/frontend/components/ui/card"
import { Users, GitPullRequest, CircleDot, ArrowRight, FolderGit2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useUserProfile } from "@/frontend/lib/user-context"
import Link from "next/link"

export default function Home() {
  const { data: session } = useSession()
  const { user, isLoading } = useUserProfile()

  const activeUser = user
    ? { name: user.displayName, username: user.username }
    : session?.user
    ? { name: session.user.name || "User", username: (session.user as { username?: string }).username || session.user.name }
    : null

  return (
    <div className="grid-background min-h-[calc(100vh-4rem)] flex flex-col justify-center text-foreground font-mono">
      <div className="container max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center justify-center text-center space-y-10">
        
        {/* Header Hero */}
        <div className="space-y-4 max-w-3xl animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
            GitHub Repository Analytics
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-sans">
            Gain insights into your repositories. Analyze contributors, commits, pull requests, issues and more.
          </p>
        </div>

        {/* Primary Action / Neo-brutalist Auth CTA */}
        <div className="flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
          {isLoading ? (
            <div className="h-16 w-56 bg-neutral-800 animate-pulse rounded-2xl border-4 border-black" />
          ) : activeUser ? (
            <div className="space-y-3">
              <Button asChild size="lg" className="h-14 px-8 text-base font-bold gap-2 shadow-lg rounded-xl font-mono">
                <Link href="/repos">
                  <FolderGit2 className="h-5 w-5" />
                  Browse Your Repositories
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
              <p className="text-xs text-neutral-400">
                Signed in as <span className="font-semibold text-white">{activeUser.name}</span>{" "}
                <span className="text-neutral-500">(@{activeUser.username})</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <GithubLoginButton text="GitHub Login" href="/login" />
              <p className="text-xs text-neutral-400 font-medium font-sans">
                Access your repositories (public and private)
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full max-w-md flex items-center gap-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">
          <div className="flex-1 border-t border-neutral-700" />
          <span>OR</span>
          <div className="flex-1 border-t border-neutral-700" />
        </div>

        {/* URL Input Form */}
        <div className="w-full max-w-2xl space-y-2 bg-neutral-900/80 backdrop-blur-md p-6 rounded-2xl border border-neutral-800 shadow-xl">
          <RepositoryInput />
          <p className="text-xs text-neutral-400 text-left px-2 pt-1">
            Example: <span className="font-mono text-neutral-200">https://github.com/facebook/react</span>
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl pt-4 text-left">
          <Card className="bg-neutral-900/70 backdrop-blur-sm hover:bg-neutral-900/90 transition-all border-neutral-800 text-white shadow-md hover:border-neutral-700">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm text-white">Contributors</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Understand your team structure and top commit authors.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/70 backdrop-blur-sm hover:bg-neutral-900/90 transition-all border-neutral-800 text-white shadow-md hover:border-neutral-700">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm text-white">Pull Requests</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Track development velocity, open and merged PRs.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/70 backdrop-blur-sm hover:bg-neutral-900/90 transition-all border-neutral-800 text-white shadow-md hover:border-neutral-700">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <CircleDot className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm text-white">Issues</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Stay on top of bug tracking and issue resolution health.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
