import { NextRequest, NextResponse } from "next/server"
import { ingestionQueue } from "@/backend/queue/ingestion.queue"
import { parseGitHubRepoUrl } from "@/backend/github/url"
import { getServerAuthSession } from "@/backend/auth/auth-options"
import { prisma } from "@/backend/db/prisma"
import { getOctokit } from "@/backend/github/client"

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const rawUrl = body?.url
  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 })
  }

  const parsed = parseGitHubRepoUrl(rawUrl.trim())
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub repository URL. Use https://github.com/owner/repo" },
      { status: 422 }
    )
  }

  const session = await getServerAuthSession()
  let userGithubToken: string | undefined

  if (session?.user?.id) {
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "github",
      },
      select: {
        access_token: true,
      },
    })
    if (account?.access_token) {
      userGithubToken = account.access_token
    }
  }

  // Pre-flight check: verify repository accessibility via GitHub API
  try {
    const octokit = getOctokit(userGithubToken)
    const { data: repoData } = await octokit.rest.repos.get({
      owner: parsed.owner,
      repo: parsed.repo,
    })

    // If repo is private and user is not authenticated (or token missing), block it
    if (repoData.private && !userGithubToken) {
      return NextResponse.json(
        {
          error: "This repository is private. Sign in with GitHub to analyze repositories you have access to.",
          code: "REPO_PRIVATE_LOGIN_REQUIRED",
        },
        { status: 403 }
      )
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    if (err?.status === 404 || err?.status === 403) {
      // If user was logged in, this means they don't have access or it doesn't exist
      if (userGithubToken) {
        return NextResponse.json(
          {
            error: "Repository not found or you do not have permission to access it.",
            code: "REPO_UNAUTHORIZED",
          },
          { status: 403 }
        )
      }

      // If user is logged out, unauthenticated 404 could be private or non-existent
      return NextResponse.json(
        {
          error: "This repository is private or does not exist. Sign in with GitHub to analyze repositories you have access to.",
          code: "REPO_PRIVATE_LOGIN_REQUIRED",
        },
        { status: 403 }
      )
    }

    console.error("[Ingest Preflight Error]", err?.message || error)
    return NextResponse.json(
      { error: "Could not reach GitHub to verify the repository. Please try again." },
      { status: 502 }
    )
  }

  // Enqueue ingestion job
  try {
    const canonicalUrl = `https://github.com/${parsed.owner}/${parsed.repo}`

    const job = await ingestionQueue.add(
      "ingest-repository",
      {
        url: canonicalUrl,
        triggeredBy: session?.user?.id ? "user" : "public",
        userId: session?.user?.id,
      },
      {
        jobId: `repo:${parsed.owner}:${parsed.repo}`,
      }
    )

    return NextResponse.json(
      {
        jobId: job.id,
        owner: parsed.owner,
        repo: parsed.repo,
        message: "Ingestion queued successfully.",
      },
      { status: 202 }
    )
  } catch (error) {
    console.error("[Ingest API Error]", error)
    return NextResponse.json(
      { error: "Failed to queue ingestion job. Please ensure Redis is running." },
      { status: 500 }
    )
  }
}
