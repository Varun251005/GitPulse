import { Worker, Job } from "bullmq"
import { createRedisConnection } from "../lib/redis"
import {
  INGESTION_QUEUE_NAME,
  IngestionJobData,
  IngestionJobResult,
} from "../lib/queue/ingestion.queue"
import { parseGitHubRepoUrl } from "../lib/github/url"
import { ingestRepoMetadata } from "../lib/github/service"

console.log(`[Worker] Initializing ingestion worker for queue: "${INGESTION_QUEUE_NAME}"...`)

const connection = createRedisConnection()

export const worker = new Worker<IngestionJobData, IngestionJobResult>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData, IngestionJobResult>) => {
    console.log(`[Worker] ---> Processing job [ID: ${job.id}, Name: ${job.name}]`)
    console.log(`[Worker] Job payload:`, JSON.stringify(job.data, null, 2))

    const rawUrl = job.data?.url
    if (!rawUrl) {
      throw new Error("Missing required 'url' in job payload.")
    }

    const parsed = parseGitHubRepoUrl(rawUrl)
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL provided: "${rawUrl}"`)
    }

    console.log(`[Worker] Ingesting metadata for: ${parsed.owner}/${parsed.repo}...`)
    const { repo, isNew } = await ingestRepoMetadata(parsed.owner, parsed.repo)

    const action = isNew ? "Created new" : "Updated existing"
    console.log(`[Worker] ${action} Repo record in PostgreSQL (ID: ${repo.id}, GitHub ID: ${repo.githubId})`)

    const result: IngestionJobResult = {
      success: true,
      repoId: repo.id,
      fullName: repo.fullName,
      githubId: repo.githubId,
      isNew,
      processedAt: new Date().toISOString(),
      message: `${action} repository "${repo.fullName}"`,
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
