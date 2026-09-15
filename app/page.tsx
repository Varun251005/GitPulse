"use client"

import { DashboardShell } from "@/frontend/components/dashboard/dashboard-shell"
import { RepositoryInput } from "@/frontend/components/dashboard/repository-input"
import { Button } from "@/frontend/components/ui/button"
import { Card, CardContent } from "@/frontend/components/ui/card"
import { Users, GitPullRequest, CircleDot, ArrowRight, FolderGit2 } from "lucide-react"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import { useSession, signIn } from "next-auth/react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()

  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-4xl mx-auto text-center space-y-8 py-8 md:py-16">
        {/* Header Hero */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            GitHub Repository Analytics
          </h1>
          <p className="text-muted-foreground text-base md:text-xl leading-relaxed">
            Gain insights into your repositories. Analyze contributors, commits, pull requests, issues and more.
          </p>
        </div>

        {/* Primary Action / Auth CTA */}
        <div className="w-full max-w-md space-y-2">
          {status === "loading" ? (
            <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
          ) : session ? (
            <div className="space-y-2">
              <Button asChild size="lg" className="w-full h-12 text-base font-semibold gap-2 shadow-sm">
                <Link href="/repos">
                  <FolderGit2 className="h-5 w-5" />
                  Browse Your Repositories
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{session.user?.name || session.user?.email}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => signIn("github", { callbackUrl: "/repos" })}
                size="lg"
                className="w-full h-12 text-base font-semibold gap-2.5 shadow-sm"
              >
                <GithubIcon className="h-5 w-5" />
                Sign in with GitHub
              </Button>
              <p className="text-xs text-muted-foreground">
                Access your repositories (public and private)
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full max-w-md flex items-center gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex-1 border-t border-border" />
          <span>OR</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* URL Input Form */}
        <div className="w-full max-w-2xl space-y-2">
          <RepositoryInput />
          <p className="text-xs text-muted-foreground text-left px-2">
            Example: <span className="font-mono text-foreground/80">https://github.com/facebook/react</span>
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-8 text-left">
          <Card className="bg-card/50 hover:bg-card transition-colors border-border/60">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm">Contributors</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Understand your team and top commit authors.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 hover:bg-card transition-colors border-border/60">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm">Pull Requests</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Track development velocity, open and merged PRs.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 hover:bg-card transition-colors border-border/60">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <CircleDot className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm">Issues</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stay on top of bug tracking and issue resolution.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
