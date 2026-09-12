import { Worker, Job } from "bullmq"
import { createRedisConnection } from "@/backend/db/redis"
import { prisma } from "@/backend/db/prisma"
import {
  INGESTION_QUEUE_NAME,
  IngestionJobData,
  IngestionJobResult,
} from "@/backend/queue/ingestion.queue"
import { parseGitHubRepoUrl } from "@/backend/github/url"
import { ingestRepoMetadata } from "@/backend/github/service"
import { ingestRepoContributors } from "@/backend/github/contributors"
import { ingestRepoCommits } from "@/backend/github/commits"
import { ingestRepoPullRequests } from "@/backend/github/pull-requests"
import { ingestRepoIssues } from "@/backend/github/issues"

console.log(`[Worker] Initializing ingestion worker for queue: "${INGESTION_QUEUE_NAME}"...`)

const connection = createRedisConnection()

export const worker = new Worker<IngestionJobData, IngestionJobResult>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData, IngestionJobResult>) => {
    console.log(`[Worker] ---> Processing job [ID: ${job.id}, Name: ${job.name}]`)
    console.log(`[Worker] Job URL: ${job.data?.url}, TriggeredBy: ${job.data?.triggeredBy || "anonymous"}, Authenticated: ${Boolean(job.data?.userId)}`)

    const rawUrl = job.data?.url
    if (!rawUrl) {
      throw new Error("Missing required 'url' in job payload.")
    }

    const parsed = parseGitHubRepoUrl(rawUrl)
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL provided: "${rawUrl}"`)
    }

    // Retrieve user's GitHub OAuth access token securely if userId is provided
    let githubToken: string | undefined
    const userId = job.data?.userId
    if (userId) {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: "github",
        },
        select: {
          access_token: true,
        },
      })
      if (account?.access_token) {
        githubToken = account.access_token
      }
    }

    console.log(`[Worker] Ingesting metadata for: ${parsed.owner}/${parsed.repo}...`)
    const { repo, isNew } = await ingestRepoMetadata(parsed.owner, parsed.repo, githubToken, userId)

    const action = isNew ? "Created new" : "Updated existing"
    console.log(`[Worker] ${action} Repo record in PostgreSQL (ID: ${repo.id}, GitHub ID: ${repo.githubId})`)

    console.log(`[Worker] Ingesting contributors for: ${parsed.owner}/${parsed.repo}...`)
    const { count: contributorsCount } = await ingestRepoContributors(parsed.owner, parsed.repo, repo.id, undefined, githubToken)
    console.log(`[Worker] Successfully synced ${contributorsCount} contributors for "${repo.fullName}".`)

    console.log(`[Worker] Ingesting commits for: ${parsed.owner}/${parsed.repo}...`)
    const { count: commitsCount } = await ingestRepoCommits(parsed.owner, parsed.repo, repo.id, undefined, githubToken)
    console.log(`[Worker] Successfully synced ${commitsCount} commits for "${repo.fullName}".`)

    console.log(`[Worker] Ingesting pull requests for: ${parsed.owner}/${parsed.repo}...`)
    const { count: pullRequestsCount } = await ingestRepoPullRequests(parsed.owner, parsed.repo, repo.id, undefined, githubToken)
    console.log(`[Worker] Successfully synced ${pullRequestsCount} pull requests for "${repo.fullName}".`)

    console.log(`[Worker] Ingesting issues for: ${parsed.owner}/${parsed.repo}...`)
    const { count: issuesCount } = await ingestRepoIssues(parsed.owner, parsed.repo, repo.id, undefined, githubToken)
    console.log(`[Worker] Successfully synced ${issuesCount} issues for "${repo.fullName}".`)

    const result: IngestionJobResult = {
      success: true,
      repoId: repo.id,
      fullName: repo.fullName,
      githubId: repo.githubId,
      isNew,
      contributorsCount,
      commitsCount,
      pullRequestsCount,
      issuesCount,
      processedAt: new Date().toISOString(),
      message: `${action} repository "${repo.fullName}" with ${contributorsCount} contributors, ${commitsCount} commits, ${pullRequestsCount} PRs, and ${issuesCount} issues`,
    }

    console.log(`[Worker] <--- Successfully finished job [ID: ${job.id}]`)
    return result
  },
  {
    connection,
    concurrency: 5,
  }
)

worker.on("ready", () => {
  console.log(`[Worker] Worker is ready and listening for jobs on "${INGESTION_QUEUE_NAME}".`)
})

worker.on("completed", (job, returnvalue) => {
  console.log(`[Worker] [Event: completed] Job ${job.id} (${returnvalue.fullName}) completed: ${returnvalue.message}`)
})

worker.on("failed", (job, err) => {
  console.error(`[Worker] [Event: failed] Job ${job?.id} failed: ${err.message}`)
})

worker.on("error", (err) => {
  console.error("[Worker] [Event: error] Worker connection error:", err)
})

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Worker] Received ${signal}. Closing worker and Redis connection gracefully...`)
  try {
    await worker.close()
    await connection.quit()
    console.log("[Worker] Cleanup complete. Worker process exited gracefully.")
    process.exit(0)
  } catch (error) {
    console.error("[Worker] Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
