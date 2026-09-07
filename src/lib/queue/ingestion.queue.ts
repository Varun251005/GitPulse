import { Queue } from "bullmq"
import { createRedisConnection } from "@/lib/redis"

export const INGESTION_QUEUE_NAME = "gitpulse-ingestion"

export interface IngestionJobData {
  url: string
  triggeredBy?: string
}

export interface IngestionJobResult {
  success: boolean
  repoId: string
  fullName: string
  githubId: number
  isNew: boolean
  contributorsCount?: number
  processedAt: string
  message: string
}

const queueSingleton = () => {
  return new Queue<IngestionJobData, IngestionJobResult>(INGESTION_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
        count: 500,
      },
    },
  })
}

declare const globalThis: {
  ingestionQueueGlobal: ReturnType<typeof queueSingleton> | undefined
} & typeof global

export const ingestionQueue =
  globalThis.ingestionQueueGlobal ?? queueSingleton()

if (process.env.NODE_ENV !== "production") {
  globalThis.ingestionQueueGlobal = ingestionQueue
}

