import Redis from "ioredis"

export const getRedisUrl = (): string => {
  return process.env.REDIS_URL || "redis://localhost:6379"
}

export const createRedisConnection = () => {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
  })
}

const redisClientSingleton = () => {
  return createRedisConnection()
}

declare const globalThis: {
  redisGlobal: ReturnType<typeof redisClientSingleton> | undefined
} & typeof global

export const redis = globalThis.redisGlobal ?? redisClientSingleton()

if (process.env.NODE_ENV !== "production") {
  globalThis.redisGlobal = redis
}
