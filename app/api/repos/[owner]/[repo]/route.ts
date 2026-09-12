import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/backend/db/prisma"
import { getServerAuthSession } from "@/backend/auth/auth-options"
import { getOctokit } from "@/backend/github/client"

interface RouteParams {
  params: {
    owner: string
    repo: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { owner, repo } = params

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Invalid repository parameters provided." },
      { status: 400 }
    )
  }

  try {
    // Single efficient query avoiding N+1
    const dbRepo = await prisma.repo.findUnique({
      where: {
        owner_name: {
          owner,
          name: repo,
        },
      },
      include: {
        _count: {
          select: {
            contributors: true,
            commits: true,
            pullRequests: true,
            issues: true,
          },
        },
        contributors: {
          take: 100,
          select: {
            id: true,
            githubId: true,
            username: true,
            avatarUrl: true,
          },
        },
        commits: {
          take: 100,
          orderBy: { committedAt: "desc" },
          include: {
            contributor: {
              select: { username: true, avatarUrl: true },
            },
          },
        },
        pullRequests: {
          take: 100,
          orderBy: { openedAt: "desc" },
          include: {
            author: {
              select: { username: true, avatarUrl: true },
            },
          },
        },
        issues: {
          take: 100,
          orderBy: { openedAt: "desc" },
          include: {
            author: {
              select: { username: true, avatarUrl: true },
            },
          },
        },
      },
    })

    if (!dbRepo) {
      return NextResponse.json(
        { error: "Repository not found or has not been ingested yet." },
        { status: 404 }
      )
    }

    // Authorization check for private repositories:
    // User must be authenticated and have access to the private repo on GitHub.
    if (dbRepo.isPrivate) {
      const session = await getServerAuthSession()
      if (!session?.user?.id) {
        return NextResponse.json(
          {
            error: "This repository is private. Sign in with GitHub to analyze repositories you have access to.",
            code: "REPO_PRIVATE_LOGIN_REQUIRED",
          },
          { status: 403 }
        )
      }

      const account = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: "github",
        },
        select: {
          access_token: true,
        },
      })

      if (!account?.access_token) {
        return NextResponse.json(
          {
            error: "GitHub account not connected. Please sign in again.",
            code: "AUTH_REQUIRED",
          },
          { status: 403 }
        )
      }

      try {
        const octokit = getOctokit(account.access_token)
        await octokit.rest.repos.get({ owner, repo })
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error?.status === 404 || error?.status === 403) {
          return NextResponse.json(
            {
              error: "You don't have access to this repository.",
              code: "REPO_UNAUTHORIZED",
            },
            { status: 403 }
          )
        }
        throw err
      }
    }

    // Map Prisma objects into frontend-safe clean JSON (Handling BigInt -> string)
    const payload = {
      repository: {
        id: dbRepo.id,
        githubId: dbRepo.githubId.toString(),
        owner: dbRepo.owner,
        name: dbRepo.name,
        fullName: dbRepo.fullName,
        description: dbRepo.description,
        url: dbRepo.url,
        defaultBranch: dbRepo.defaultBranch,
        language: dbRepo.language,
        starsCount: dbRepo.starsCount,
        forksCount: dbRepo.forksCount,
        openIssuesCount: dbRepo.openIssuesCount,
        isPrivate: dbRepo.isPrivate,
        lastSyncedAt: dbRepo.lastSyncedAt,
        createdAt: dbRepo.createdAt,
      },
      summary: {
        contributorsCount: dbRepo._count.contributors,
        commitsCount: dbRepo._count.commits,
        pullRequestsCount: dbRepo._count.pullRequests,
        issuesCount: dbRepo._count.issues,
      },
      contributors: dbRepo.contributors.map((c) => ({
        id: c.id,
        githubId: c.githubId.toString(),
        username: c.username,
        avatarUrl: c.avatarUrl,
      })),
      commits: dbRepo.commits.map((c) => ({
        sha: c.sha,
        message: c.message,
        committedAt: c.committedAt,
        author: c.contributor
          ? { username: c.contributor.username, avatarUrl: c.contributor.avatarUrl }
          : null,
      })),
      pullRequests: dbRepo.pullRequests.map((pr) => ({
        githubId: pr.githubId.toString(),
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        draft: pr.draft,
        openedAt: pr.openedAt,
        closedAt: pr.closedAt,
        mergedAt: pr.mergedAt,
        author: pr.author
          ? { username: pr.author.username, avatarUrl: pr.author.avatarUrl }
          : null,
      })),
      issues: dbRepo.issues.map((i) => ({
        githubId: i.githubId.toString(),
        number: i.number,
        title: i.title,
        body: i.body,
        state: i.state,
        commentsCount: i.commentsCount,
        openedAt: i.openedAt,
        closedAt: i.closedAt,
        author: i.author
          ? { username: i.author.username, avatarUrl: i.author.avatarUrl }
          : null,
      })),
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error("[Dashboard API Error]", error)
    return NextResponse.json(
      { error: "An internal server error occurred while fetching repository data." },
      { status: 500 }
    )
  }
}
