import { octokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/lib/prisma"

export interface IngestContributorsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestContributorsResult {
  count: number
}

/**
 * Ingests contributors for a repository from the GitHub REST API and persists them to PostgreSQL.
 *
 * Requirements & Features:
 * - Read-only operation via Octokit (GET /repos/{owner}/{repo}/contributors).
 * - Bounded pagination: uses Octokit paginate iterator capped at maxPages (default: 5 pages, up to 500 contributors)
 *   to avoid accidental runaway loops and rate-limit exhaustion.
 * - Idempotency: upserts contributors by unique `githubId`. Re-running does not duplicate records.
 * - Repo ↔ Contributor Relation: links the contributor to the Repo via Prisma's implicit many-to-many relation.
 * - Bot Handling: respects accounts of type "Bot" as valid contributors without deletion.
 */
export async function ingestRepoContributors(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestContributorsOptions
): Promise<IngestContributorsResult> {
  const maxPages = options?.maxPages ?? 5
  const perPage = options?.perPage ?? 100

  try {
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listContributors, {
      owner,
      repo,
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: contributorsPage } of iterator) {
      pageCount++

      for (const item of contributorsPage) {
        if (!item.id || !item.login) {
          continue
        }

        await prisma.contributor.upsert({
          where: { githubId: item.id },
          update: {
            username: item.login,
            avatarUrl: item.avatar_url ?? null,
            repositories: {
              connect: { id: repoId },
            },
          },
          create: {
            githubId: item.id,
            username: item.login,
            avatarUrl: item.avatar_url ?? null,
            repositories: {
              connect: { id: repoId },
            },
          },
        })

        syncedCount++
      }

      if (pageCount >= maxPages) {
        break
      }
    }

    return { count: syncedCount }
  } catch (error) {
    throw toGitHubError(error)
  }
}

