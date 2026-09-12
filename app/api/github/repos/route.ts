import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/backend/auth/auth-options"
import { prisma } from "@/backend/db/prisma"
import { getOctokit } from "@/backend/github/client"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const usernameParam = searchParams.get("username")?.trim()
  const page = parseInt(searchParams.get("page") || "1", 10)
  const perPage = Math.min(parseInt(searchParams.get("per_page") || "30", 10), 100)
  const visibility = (searchParams.get("visibility") || "all") as "all" | "public" | "private"
  const search = searchParams.get("search")?.toLowerCase().trim() || ""

  // Case 1: Username query provided (e.g. from GitHub profile login)
  if (usernameParam) {
    try {
      const client = getOctokit(process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN)
      const { data: rawRepos } = await client.rest.repos.listForUser({
        username: usernameParam,
        sort: "updated",
        direction: "desc",
        per_page: perPage,
        page: Math.max(1, page),
        type: "all",
      })

      let filtered = rawRepos

      if (search) {
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(search) ||
            r.full_name.toLowerCase().includes(search) ||
            (r.description && r.description.toLowerCase().includes(search))
        )
      }

      const repositories = filtered.map((r) => ({
        id: r.id,
        githubId: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        ownerAvatar: r.owner.avatar_url,
        description: r.description ?? null,
        url: r.html_url,
        isPrivate: r.private,
        language: r.language ?? null,
        starsCount: r.stargazers_count ?? 0,
        forksCount: r.forks_count ?? 0,
        openIssuesCount: r.open_issues_count ?? 0,
        updatedAt: r.updated_at,
        defaultBranch: r.default_branch || "main",
      }))

      return NextResponse.json({
        repositories,
        page,
        perPage,
        hasMore: rawRepos.length === perPage,
      })
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      console.error("[GitHub User Repos API Error]", err?.message || error)
      if (err?.status === 404) {
        return NextResponse.json(
          { error: `GitHub user "${usernameParam}" was not found.` },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Failed to fetch repositories for this user." },
        { status: 500 }
      )
    }
  }

  // Case 2: NextAuth OAuth session
  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in with GitHub to view your repositories." },
      { status: 401 }
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
      { error: "No GitHub account token found. Please re-authenticate." },
      { status: 400 }
    )
  }

  try {
    const octokit = getOctokit(account.access_token)

    const { data: rawRepos } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: visibility === "all" ? "all" : visibility,
      sort: "updated",
      direction: "desc",
      per_page: perPage,
      page: Math.max(1, page),
      affiliation: "owner,collaborator,organization_member",
    })

    let filtered = rawRepos

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.full_name.toLowerCase().includes(search) ||
          (r.description && r.description.toLowerCase().includes(search))
      )
    }

    const repositories = filtered.map((r) => ({
      id: r.id,
      githubId: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      ownerAvatar: r.owner.avatar_url,
      description: r.description ?? null,
      url: r.html_url,
      isPrivate: r.private,
      language: r.language ?? null,
      starsCount: r.stargazers_count ?? 0,
      forksCount: r.forks_count ?? 0,
      openIssuesCount: r.open_issues_count ?? 0,
      updatedAt: r.updated_at,
      defaultBranch: r.default_branch || "main",
    }))

    return NextResponse.json({
      repositories,
      page,
      perPage,
      hasMore: rawRepos.length === perPage,
    })
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    console.error("[GitHub Repos API Error]", err?.message || error)
    if (err?.status === 401) {
      return NextResponse.json(
        { error: "GitHub token expired or revoked. Please sign in again." },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch repositories from GitHub." },
      { status: 500 }
    )
  }
}
