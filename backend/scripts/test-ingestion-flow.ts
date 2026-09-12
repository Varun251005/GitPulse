import { ingestionQueue, IngestionJobResult } from "@/backend/queue/ingestion.queue"
import { prisma } from "@/backend/db/prisma"

async function waitForJobCompletion(jobId: string): Promise<IngestionJobResult> {
  for (let i = 0; i < 40; i++) {
    const job = await ingestionQueue.getJob(jobId)
    if (job) {
      const state = await job.getState()
      if (state === "completed") {
        return job.returnvalue as IngestionJobResult
      }
      if (state === "failed") {
        throw new Error(job.failedReason || "Job failed")
      }
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Job ${jobId} timed out waiting for completion`)
}

async function runIngestionTests() {
  console.log("==========================================================")
  console.log("       GitPulse — Step 8A: Ingestion Pipeline Tests       ")
  console.log("==========================================================\n")

  // Ensure database connection is active
  await prisma.$connect()

  // Clean any previous test run for octocat/Hello-World to test clean insert -> update
  await prisma.repo.deleteMany({
    where: { fullName: "octocat/Hello-World" },
  })

  // ------------------------------------------------------------
  // PART 1: First Ingestion (Create Repo in PostgreSQL)
  // ------------------------------------------------------------
  console.log("▶ [Test 1] Ingesting Public Repository: octocat/Hello-World")
  const job1 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline",
  })
  console.log(`  Job #1 enqueued (ID: ${job1.id}). Waiting for worker...`)

  const result1 = await waitForJobCompletion(job1.id!)
  console.log("  ✔ Job #1 completed successfully!")
  console.log(`    - Message:    ${result1.message}`)
  console.log(`    - Is New:     ${result1.isNew}`)
  console.log(`    - Repo ID:    ${result1.repoId}`)
  console.log(`    - GitHub ID:  ${result1.githubId}`)

  // Verify directly in PostgreSQL
  const dbRepo1 = await prisma.repo.findUnique({
    where: { githubId: result1.githubId },
  })

  if (!dbRepo1) {
    throw new Error("Repository was not found in PostgreSQL after ingestion!")
  }

  console.log("  ✔ PostgreSQL record verified:")
  console.log(`    - Name:           ${dbRepo1.name}`)
  console.log(`    - Full Name:      ${dbRepo1.fullName}`)
  console.log(`    - Owner:          ${dbRepo1.owner}`)
  console.log(`    - Stars:          ${dbRepo1.starsCount}`)
  console.log(`    - Forks:          ${dbRepo1.forksCount}`)
  console.log(`    - Open Issues:    ${dbRepo1.openIssuesCount}`)
  console.log(`    - Default Branch: ${dbRepo1.defaultBranch}`)
  console.log(`    - Last Synced:    ${dbRepo1.lastSyncedAt?.toISOString()}\n`)

  // ------------------------------------------------------------
  // PART 2: Duplicate Ingestion (Idempotency Verification)
  // ------------------------------------------------------------
  console.log("▶ [Test 2] Idempotency Check — Re-ingesting Same Repository")
  const job2 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-duplicate",
  })
  console.log(`  Job #2 enqueued (ID: ${job2.id}). Waiting for worker...`)

  const result2 = await waitForJobCompletion(job2.id!)
  console.log("  ✔ Job #2 completed successfully!")
  console.log(`    - Message:    ${result2.message}`)
  console.log(`    - Is New:     ${result2.isNew} (expected false)`)

  if (result2.isNew !== false) {
    throw new Error("Expected duplicate ingestion to flag isNew as false!")
  }

  const totalCount = await prisma.repo.count({
    where: { githubId: result2.githubId },
  })

  console.log(`  ✔ PostgreSQL duplicate count check: exactly ${totalCount} record exists in DB.\n`)
  if (totalCount !== 1) {
    throw new Error(`Expected exactly 1 repository record, but found ${totalCount}!`)
  }

  // ------------------------------------------------------------
  // PART 3: 404 Failure Handling (Nonexistent Repository)
  // ------------------------------------------------------------
  console.log("▶ [Test 3] Failure Handling — Nonexistent Repository (404)")
  const nonexistentUrl = "https://github.com/octocat/this-repository-definitely-does-not-exist-gitpulse-404"
  const job3 = await ingestionQueue.add("ingest-repo", {
    url: nonexistentUrl,
    triggeredBy: "test-pipeline-404",
  })
  console.log(`  Job #3 enqueued (ID: ${job3.id}). Waiting for failure...`)

  try {
    await waitForJobCompletion(job3.id!)
    throw new Error("Expected Job #3 to fail, but it finished successfully!")
  } catch {
    const freshJob3 = await ingestionQueue.getJob(job3.id!)
    const state = await freshJob3?.getState()
    const failedReason = freshJob3?.failedReason
    console.log("  ✔ Job #3 correctly failed as expected:")
    console.log(`    - Job State:      ${state}`)
    console.log(`    - Failure Reason: ${failedReason}`)
  }

  const nonexistentInDb = await prisma.repo.findFirst({
    where: { fullName: "octocat/this-repository-definitely-does-not-exist-gitpulse-404" },
  })
  if (nonexistentInDb) {
    throw new Error("Nonexistent repository was erroneously saved in PostgreSQL!")
  }
  console.log("  ✔ Verified nonexistent repository was NOT saved in database.\n")

  // ------------------------------------------------------------
  // PART 4: Invalid URL Handling
  // ------------------------------------------------------------
  console.log("▶ [Test 4] Failure Handling — Malformed URL")
  const malformedUrl = "not-a-valid-github-url"
  const job4 = await ingestionQueue.add("ingest-repo", {
    url: malformedUrl,
  })
  console.log(`  Job #4 enqueued (ID: ${job4.id}). Waiting for failure...`)

  try {
    await waitForJobCompletion(job4.id!)
    throw new Error("Expected Job #4 to fail, but it finished successfully!")
  } catch {
    const freshJob4 = await ingestionQueue.getJob(job4.id!)
    const state = await freshJob4?.getState()
    console.log("  ✔ Job #4 correctly failed on malformed URL:")
    console.log(`    - Job State:      ${state}`)
    console.log(`    - Failure Reason: ${freshJob4?.failedReason}\n`)
  }

  console.log("==========================================================")
  console.log("     ALL REPOSITORY INGESTION PIPELINE TESTS PASSED!      ")
  console.log("==========================================================")

  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

runIngestionTests().catch(async (err) => {
  console.error("\n❌ Ingestion pipeline test failed:", err)
  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(1)
})
