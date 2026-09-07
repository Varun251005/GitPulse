import { octokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/lib/prisma"

export interface IngestCommitsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestCommitsResult {
  count: number
}

/**
 * Ingests commits for a repository from the GitHub REST API and persists them to PostgreSQL.
 *
 * Requirements & Features:
 * - Read-only operation via Octokit (GET /repos/{owner}/{repo}/commits).
 * - Bounded pagination: caps at maxPages (default 5 pages / 500 commits) to prevent rate limit exhaustion.
 * - Idempotency: upserts based on the immutable Git SHA.
 * - Repo Relation: attaches each commit to the `repoId`.
 * - Contributor Relation: links the GitHub author `id` to the existing `Contributor` if one exists in the DB.
 *   Safely defaults to `null` if the author is missing (e.g. raw git commits not linked to GitHub accounts).
 */
export async function ingestRepoCommits(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestCommitsOptions
): Promise<IngestCommitsResult> {
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

    // 2. Iterate through commits using Octokit pagination iterator
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listCommits, {
      owner,
      repo,
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: commitsPage } of iterator) {
      pageCount++

      // Use a batch transaction for each page to ensure speed and atomicity
      const upsertPromises = commitsPage.map((item) => {
        // Resolve the contributor association, safely handling null authors
        let dbContributorId: string | null = null
        if (item.author && item.author.id) {
          dbContributorId = contributorMap.get(item.author.id) ?? null
        }

        // Use author date, fallback to committer date, fallback to current time
        const commitDateStr = item.commit.author?.date ?? item.commit.committer?.date
        const committedAt = commitDateStr ? new Date(commitDateStr) : new Date()

        return prisma.commit.upsert({
          where: { sha: item.sha },
          update: {
            message: item.commit.message,
            committedAt,
            contributorId: dbContributorId,
            // repoId is fixed and immutable; additions/deletions not provided in list API
          },
          create: {
            sha: item.sha,
            message: item.commit.message,
            committedAt,
            repoId,
            contributorId: dbContributorId,
          },
        })
      })

      await prisma.$transaction(upsertPromises)
      syncedCount += commitsPage.length

      if (pageCount >= maxPages) {
        break
      }
    }

    return { count: syncedCount }
  } catch (error) {
    throw toGitHubError(error)
  }
}
