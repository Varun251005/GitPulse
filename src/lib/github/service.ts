import { octokit } from "./client"
import { toGitHubError } from "./errors"
import { prisma } from "@/lib/prisma"
import type { Repo } from "@prisma/client"

export interface IngestRepoResult {
  repo: Repo
  isNew: boolean
}

/**
 * Ingests repository metadata from GitHub REST API and persists it to PostgreSQL via Prisma.
 *
 * Idempotency:
 * Uses Prisma's upsert keyed on unique `githubId`.
 * - If the repository does not exist in PostgreSQL, it is created.
 * - If it already exists, its metadata is updated with latest GitHub values.
 */
export async function ingestRepoMetadata(
  owner: string,
  repo: string
): Promise<IngestRepoResult> {
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    })

    const existing = await prisma.repo.findUnique({
      where: { githubId: data.id },
      select: { id: true },
    })

    const repoPayload = {
      githubId: data.id,
      name: data.name,
      owner: data.owner.login,
      fullName: data.full_name,
      description: data.description ?? null,
      url: data.html_url,
      defaultBranch: data.default_branch || "main",
      language: data.language ?? null,
      starsCount: data.stargazers_count ?? 0,
      forksCount: data.forks_count ?? 0,
      openIssuesCount: data.open_issues_count ?? 0,
      isPrivate: data.private ?? false,
      lastSyncedAt: new Date(),
    }

    const savedRepo = await prisma.repo.upsert({
      where: { githubId: data.id },
      create: repoPayload,
      update: {
        name: repoPayload.name,
        owner: repoPayload.owner,
        fullName: repoPayload.fullName,
        description: repoPayload.description,
        url: repoPayload.url,
        defaultBranch: repoPayload.defaultBranch,
        language: repoPayload.language,
        starsCount: repoPayload.starsCount,
        forksCount: repoPayload.forksCount,
        openIssuesCount: repoPayload.openIssuesCount,
        isPrivate: repoPayload.isPrivate,
        lastSyncedAt: repoPayload.lastSyncedAt,
      },
    })

    return {
      repo: savedRepo,
      isNew: !existing,
    }
  } catch (error) {
    throw toGitHubError(error)
  }
}

