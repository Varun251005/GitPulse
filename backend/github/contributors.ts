import { getOctokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/backend/db/prisma"

export interface IngestContributorsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestContributorsResult {
  count: number
}

/**
 * Ingests contributors for a repository from the GitHub REST API and persists them to PostgreSQL.
 * Supports optional OAuth token for authenticated / private repository access.
 */
export async function ingestRepoContributors(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestContributorsOptions,
  token?: string
): Promise<IngestContributorsResult> {
  const maxPages = options?.maxPages ?? 5
  const perPage = options?.perPage ?? 100

  try {
    const client = getOctokit(token)
    const iterator = client.paginate.iterator(client.rest.repos.listContributors, {
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
