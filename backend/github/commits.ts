import { getOctokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/backend/db/prisma"

export interface IngestCommitsOptions {
  maxPages?: number
  perPage?: number
}

export interface IngestCommitsResult {
  count: number
}

/**
 * Ingests commits for a repository from the GitHub REST API and persists them to PostgreSQL.
 * Supports optional OAuth token for authenticated / private repository access.
 */
export async function ingestRepoCommits(
  owner: string,
  repo: string,
  repoId: string,
  options?: IngestCommitsOptions,
  token?: string
): Promise<IngestCommitsResult> {
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
    const iterator = client.paginate.iterator(client.rest.repos.listCommits, {
      owner,
      repo,
      per_page: perPage,
    })

    let syncedCount = 0
    let pageCount = 0

    for await (const { data: commitsPage } of iterator) {
      pageCount++

      const upsertPromises = commitsPage.map((item) => {
        let dbContributorId: string | null = null
        if (item.author && item.author.id) {
          dbContributorId = contributorMap.get(item.author.id) ?? null
        }

        const commitDateStr = item.commit.author?.date ?? item.commit.committer?.date
        const committedAt = commitDateStr ? new Date(commitDateStr) : new Date()

        return prisma.commit.upsert({
          where: { sha: item.sha },
          update: {
            message: item.commit.message,
            committedAt,
            contributorId: dbContributorId,
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
