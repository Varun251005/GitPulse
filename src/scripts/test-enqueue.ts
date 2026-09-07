import { ingestionQueue, IngestionJobData } from "../lib/queue/ingestion.queue"

async function main() {
  const testData: IngestionJobData = {
    url: "https://github.com/facebook/react",
    triggeredBy: "test-runner",
  }

  console.log("[Producer] Adding test job to queue:", JSON.stringify(testData))

  const job = await ingestionQueue.add("test-ingestion-job", testData)

  console.log(`[Producer] Job successfully enqueued! Job ID: ${job.id}`)

  // Wait for worker processing to observe state
  await new Promise((r) => setTimeout(r, 1500))

  const state = await job.getState()
  console.log(`[Producer] Current job state: ${state}`)

  const result = await job.returnvalue
  if (result) {
    console.log(`[Producer] Job return value:`, JSON.stringify(result))
  }

  await ingestionQueue.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("[Producer] Failed to enqueue job:", err)
  process.exit(1)
})

