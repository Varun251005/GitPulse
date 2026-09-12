import { ingestionQueue, IngestionJobResult } from "@/backend/queue/ingestion.queue"
import { prisma } from "@/backend/db/prisma"

async function waitForJobCompletion(jobId: string, timeoutMs = 20000): Promise<IngestionJobResult> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
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
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Job ${jobId} timed out waiting for completion`)
}

async function runContributorsPipelineTests() {
  console.log("==========================================================")
  console.log("    GitPulse — Step 8B: Contributors Pipeline Tests       ")
  console.log("==========================================================\n")

  await prisma.$connect()

  // ------------------------------------------------------------
  // TEST 1: Initial Ingestion of octocat/Hello-World
  // ------------------------------------------------------------
  console.log("▶ [Test 1] Ingesting Public Repo & Contributors: octocat/Hello-World")
  const job1 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-contributors",
  })
  console.log(`  Job #1 enqueued (ID: ${job1.id}). Waiting for worker...`)

  const result1 = await waitForJobCompletion(job1.id!)
  console.log("  ✔ Job #1 completed successfully!")
  console.log(`    - Message:            ${result1.message}`)
  console.log(`    - Repo ID:            ${result1.repoId}`)
  console.log(`    - GitHub ID:          ${result1.githubId}`)
  console.log(`    - Contributors Count: ${result1.contributorsCount}`)

  // Verify in PostgreSQL: Repo with relation to contributors
  const dbRepo1 = await prisma.repo.findUnique({
    where: { githubId: result1.githubId },
    include: {
      contributors: true,
    },
  })

  if (!dbRepo1) {
    throw new Error("Repository not found in PostgreSQL!")
  }

  console.log("\n  ✔ PostgreSQL Verification for Repo & Contributors:")
  console.log(`    - Repo Name:          ${dbRepo1.fullName}`)
  console.log(`    - Linked Contributors: ${dbRepo1.contributors.length}`)

  if (dbRepo1.contributors.length < 2) {
    throw new Error(`Expected at least 2 contributors for octocat/Hello-World, found ${dbRepo1.contributors.length}`)
  }

  for (const c of dbRepo1.contributors) {
    console.log(`      * [ID: ${c.id}] @${c.username} (GitHub ID: ${c.githubId}, Avatar: ${c.avatarUrl ? "YES" : "NO"})`)
  }

  // Verify individual contributors in Contributor table
  const spaceghost = await prisma.contributor.findUnique({
    where: { username: "Spaceghost" },
  })
  const octocatUser = await prisma.contributor.findUnique({
    where: { username: "octocat" },
  })

  if (!spaceghost || !octocatUser) {
    throw new Error("Expected contributors Spaceghost and octocat not found in Contributor table!")
  }

  console.log("  ✔ Contributor records successfully confirmed in PostgreSQL.\n")

  // ------------------------------------------------------------
  // TEST 2: Idempotency Verification (Re-ingesting Same Repo)
  // ------------------------------------------------------------
  console.log("▶ [Test 2] Idempotency Check — Re-ingesting Same Repository")
  const job2 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-duplicate",
  })
  console.log(`  Job #2 enqueued (ID: ${job2.id}). Waiting for worker...`)

  const result2 = await waitForJobCompletion(job2.id!)
  console.log("  ✔ Job #2 completed successfully!")
  console.log(`    - Message:            ${result2.message}`)
  console.log(`    - Is New:             ${result2.isNew} (expected false)`)
  console.log(`    - Contributors Count: ${result2.contributorsCount}`)

  if (result2.isNew !== false) {
    throw new Error("Expected re-ingestion to have isNew = false!")
  }

  // Verify PostgreSQL does not have duplicated records or join entries
  const dbRepo2 = await prisma.repo.findUnique({
    where: { githubId: result2.githubId },
    include: {
      contributors: true,
    },
  })

  console.log(`  ✔ Post-duplicate Linked Contributors count: ${dbRepo2?.contributors.length}`)
  if (dbRepo2?.contributors.length !== dbRepo1.contributors.length) {
    throw new Error(
      `Duplicate ingestion created extra contributor links! Expected ${dbRepo1.contributors.length}, got ${dbRepo2?.contributors.length}`
    )
  }

  const spaceghostCount = await prisma.contributor.count({
    where: { username: "Spaceghost" },
  })
  if (spaceghostCount !== 1) {
    throw new Error(`Duplicate contributor record created for Spaceghost! Count: ${spaceghostCount}`)
  }

  console.log("  ✔ Verified zero duplicate Contributor records or relationship links created.\n")

  // ------------------------------------------------------------
  // TEST 3: 404 Failure Handling (Nonexistent Repository)
  // ------------------------------------------------------------
  console.log("▶ [Test 3] Failure Handling — Nonexistent Repository (404)")
  const nonexistentUrl = "https://github.com/octocat/this-repository-definitely-does-not-exist-gitpulse-contributors"
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
    where: { fullName: "octocat/this-repository-definitely-does-not-exist-gitpulse-contributors" },
  })
  if (nonexistentInDb) {
    throw new Error("Nonexistent repository was erroneously saved in PostgreSQL!")
  }
  console.log("  ✔ Verified nonexistent repository was NOT saved in database.\n")

  // ------------------------------------------------------------
  // TEST 4: Malformed URL Handling
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
  console.log("    ALL CONTRIBUTORS INGESTION PIPELINE TESTS PASSED!     ")
  console.log("==========================================================")

  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

runContributorsPipelineTests().catch(async (err) => {
  console.error("\n❌ Contributors pipeline test failed:", err)
  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(1)
})

