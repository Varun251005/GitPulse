import Redis from "ioredis"

const redisClientSingleton = () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379"
  return new Redis(url, {
    maxRetriesPerRequest: null,
  })
}

declare const globalThis: {
  redisGlobal: ReturnType<typeof redisClientSingleton> | undefined
} & typeof global

export const redis = globalThis.redisGlobal ?? redisClientSingleton()

if (process.env.NODE_ENV !== "production") {
  globalThis.redisGlobal = redis
}

export function createRedisConnection() {
  return redisClientSingleton()
}
