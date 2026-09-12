import { getOctokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/backend/db/prisma"

export interface IngestIssuesOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestIssuesResult {
  count: number
}

/**
 * Ingests issues for a repository from the GitHub REST API and persists them to PostgreSQL.
 * Supports optional OAuth token for authenticated / private repository access.
 */
export async function ingestRepoIssues(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestIssuesOptions,
  token?: string
): Promise<IngestIssuesResult> {
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
    const iterator = client.paginate.iterator(client.rest.issues.listForRepo, {
      owner,
      repo,
      state: "all",
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: itemsPage } of iterator) {
      pageCount++

      const issuesOnly = itemsPage.filter((item) => !item.pull_request)

      const upsertPromises = issuesOnly.map((item) => {
        let dbAuthorId: string | null = null
        if (item.user && item.user.id) {
          dbAuthorId = contributorMap.get(item.user.id) ?? null
        }

        return prisma.issue.upsert({
          where: { githubId: BigInt(item.id) },
          update: {
            number: item.number,
            title: item.title,
            body: item.body,
            state: item.state,
            openedAt: new Date(item.created_at),
            closedAt: item.closed_at ? new Date(item.closed_at) : null,
            commentsCount: item.comments,
            authorId: dbAuthorId,
          },
          create: {
            githubId: BigInt(item.id),
            number: item.number,
            title: item.title,
            body: item.body,
            state: item.state,
            openedAt: new Date(item.created_at),
            closedAt: item.closed_at ? new Date(item.closed_at) : null,
            commentsCount: item.comments,
            repoId,
            authorId: dbAuthorId,
          },
        })
      })

      if (upsertPromises.length > 0) {
        await prisma.$transaction(upsertPromises)
        syncedCount += upsertPromises.length
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
