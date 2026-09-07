import { octokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/lib/prisma"

export interface IngestPullRequestsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestPullRequestsResult {
  count: number
}

/**
 * Ingests pull requests for a repository from the GitHub REST API and persists them to PostgreSQL.
 *
 * Requirements & Features:
 * - Read-only operation via Octokit (GET /repos/{owner}/{repo}/pulls).
 * - Fetches both open and closed PRs using `state: "all"`.
 * - Bounded pagination: caps at maxPages (default 5 pages / 500 PRs) to prevent rate limit exhaustion.
 * - Idempotency: upserts based on the immutable GitHub PR ID (`githubId`).
 * - Repo Relation: attaches each PR to the `repoId`.
 * - Contributor Relation: links the GitHub author `id` to the existing `Contributor` if one exists in the DB.
 *   Safely defaults to `null` if the author is missing or cannot be matched.
 */
export async function ingestRepoPullRequests(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestPullRequestsOptions
): Promise<IngestPullRequestsResult> {
  const maxPages = options?.maxPages ?? 5
  const perPage = options?.perPage ?? 100

  try {
    // 1. Fetch existing contributors to map GitHub IDs to database Contributor IDs
    const existingContributors = await prisma.contributor.findMany({
      where: {
        repositories: {
          some: {
            id: repoId,
          },
        },
      },
      select: {
        id: true,
        githubId: true,
      },
    })

    const contributorMap = new Map<number, string>()
    for (const c of existingContributors) {
      contributorMap.set(c.githubId, c.id)
    }

    // 2. Iterate through pull requests using Octokit pagination iterator
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner,
      repo,
      state: "all",
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: pullsPage } of iterator) {
      pageCount++

      // Use a batch transaction for each page to ensure speed and atomicity
      const upsertPromises = pullsPage.map((item) => {
        // Resolve the contributor association for the author
        let dbAuthorId: string | null = null
        if (item.user && item.user.id) {
          dbAuthorId = contributorMap.get(item.user.id) ?? null
        }

        return prisma.pullRequest.upsert({
          where: { githubId: BigInt(item.id) },
          update: {
            number: item.number,
            title: item.title,
            body: item.body,
            state: item.state,
            draft: item.draft ?? false,
            openedAt: new Date(item.created_at),
            closedAt: item.closed_at ? new Date(item.closed_at) : null,
            mergedAt: item.merged_at ? new Date(item.merged_at) : null,
            authorId: dbAuthorId,
            // repoId is fixed and immutable
          },
          create: {
            githubId: BigInt(item.id),
            number: item.number,
            title: item.title,
            body: item.body,
            state: item.state,
            draft: item.draft ?? false,
            openedAt: new Date(item.created_at),
            closedAt: item.closed_at ? new Date(item.closed_at) : null,
            mergedAt: item.merged_at ? new Date(item.merged_at) : null,
            repoId,
            authorId: dbAuthorId,
          },
        })
      })

      await prisma.$transaction(upsertPromises)
      syncedCount += pullsPage.length

      if (pageCount >= maxPages) {
        break
      }
    }

    return { count: syncedCount }
  } catch (error) {
    throw toGitHubError(error)
  }
}
