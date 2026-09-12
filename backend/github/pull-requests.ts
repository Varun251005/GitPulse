import { getOctokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/backend/db/prisma"

export interface IngestPullRequestsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestPullRequestsResult {
  count: number
}

/**
 * Ingests pull requests for a repository from the GitHub REST API and persists them to PostgreSQL.
 * Supports optional OAuth token for authenticated / private repository access.
 */
export async function ingestRepoPullRequests(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestPullRequestsOptions,
  token?: string
): Promise<IngestPullRequestsResult> {
  const maxPages = options?.maxPages ?? 5
  const perPage = options?.perPage ?? 100

  try {
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

    const client = getOctokit(token)
    const iterator = client.paginate.iterator(client.rest.pulls.list, {
      owner,
      repo,
      state: "all",
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: pullsPage } of iterator) {
      pageCount++

      const upsertPromises = pullsPage.map((item) => {
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
