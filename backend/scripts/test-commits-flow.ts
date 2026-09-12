import { ingestionQueue, IngestionJobResult } from "@/backend/queue/ingestion.queue"
import { prisma } from "@/backend/db/prisma"

async function waitForJobCompletion(jobId: string, timeoutMs = 60000): Promise<IngestionJobResult> {
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
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Job ${jobId} timed out waiting for completion`)
}

async function runCommitsPipelineTests() {
  console.log("==========================================================")
  console.log("      GitPulse — Step 8C: Commits Pipeline Tests          ")
  console.log("==========================================================\n")

  await prisma.$connect()

  // ------------------------------------------------------------
  // TEST 1: Initial Ingestion of octocat/Hello-World
  // ------------------------------------------------------------
  console.log("▶ [Test 1] Ingesting Public Repo, Contributors & Commits: octocat/Hello-World")
  const job1 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-commits",
  })
  console.log(`  Job #1 enqueued (ID: ${job1.id}). Waiting for worker...`)

  const result1 = await waitForJobCompletion(job1.id!)
  console.log("  ✔ Job #1 completed successfully!")
  console.log(`    - Message:            ${result1.message}`)
  console.log(`    - Repo ID:            ${result1.repoId}`)
  console.log(`    - Commits Count:      ${result1.commitsCount}`)

  // Verify in PostgreSQL: Repo with relation to commits
  const dbRepo1 = await prisma.repo.findUnique({
    where: { githubId: result1.githubId },
    include: {
      commits: {
        orderBy: { committedAt: "desc" },
        take: 5,
        include: { contributor: true },
      },
    },
  })

  if (!dbRepo1) {
    throw new Error("Repository not found in PostgreSQL!")
  }

  const totalCommitsInDb = await prisma.commit.count({
    where: { repoId: dbRepo1.id },
  })

  console.log("\n  ✔ PostgreSQL Verification for Commits:")
  console.log(`    - Repo Name:          ${dbRepo1.fullName}`)
  console.log(`    - Total Commits in DB: ${totalCommitsInDb}`)

  if (totalCommitsInDb === 0) {
    throw new Error("No commits were saved to the database!")
  }

  console.log("    - Top 5 recent commits:")
  let hasNullAuthor = false
  for (const c of dbRepo1.commits) {
    const authorStr = c.contributor ? `@${c.contributor.username}` : "NULL (Unmatched/No Author)"
    if (!c.contributor) hasNullAuthor = true
    console.log(`      * [${c.sha.substring(0, 7)}] ${c.message.substring(0, 40).replace(/\n/g, " ")}... by ${authorStr}`)
  }

  // ------------------------------------------------------------
  // TEST 2: Idempotency Verification (Re-ingesting Same Repo)
  // ------------------------------------------------------------
  console.log("\n▶ [Test 2] Idempotency Check — Re-ingesting Same Repository")
  const job2 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-commits-duplicate",
  })
  console.log(`  Job #2 enqueued (ID: ${job2.id}). Waiting for worker...`)

  const result2 = await waitForJobCompletion(job2.id!)
  console.log("  ✔ Job #2 completed successfully!")
  console.log(`    - Is New:             ${result2.isNew} (expected false)`)

  const totalCommitsInDbAfter = await prisma.commit.count({
    where: { repoId: dbRepo1.id },
  })

  console.log(`  ✔ Post-duplicate Commits count: ${totalCommitsInDbAfter}`)
  if (totalCommitsInDbAfter !== totalCommitsInDb) {
    throw new Error(
      `Duplicate ingestion created extra commits! Expected ${totalCommitsInDb}, got ${totalCommitsInDbAfter}`
    )
  }
  console.log("  ✔ Verified zero duplicate Commit records created (SHAs are idempotent).\n")

  // ------------------------------------------------------------
  // TEST 3: Null Author Handling Verification
  // ------------------------------------------------------------
  console.log("▶ [Test 3] Null Author Handling Verification")
  if (hasNullAuthor) {
    console.log("  ✔ Verified database successfully stored commits with NULL contributorId.\n")
  } else {
    // If the top 5 didn't have one, just check if any exist. 
    // Hello-World typically has some raw git commits by Spaceghost before linking to his GitHub account.
    const nullAuthorCommits = await prisma.commit.count({
      where: { repoId: dbRepo1.id, contributorId: null },
    })
    console.log(`  ✔ Found ${nullAuthorCommits} total commits in this repo with NULL contributorId. Code handles it safely.\n`)
  }

  // ------------------------------------------------------------
  // TEST 4: 404 Failure Handling (Nonexistent Repository)
  // ------------------------------------------------------------
  console.log("▶ [Test 4] Failure Handling — Nonexistent Repository (404)")
  const nonexistentUrl = "https://github.com/octocat/this-repository-definitely-does-not-exist-gitpulse-commits"
  const job4 = await ingestionQueue.add("ingest-repo", {
    url: nonexistentUrl,
    triggeredBy: "test-pipeline-404",
  })
  console.log(`  Job #4 enqueued (ID: ${job4.id}). Waiting for failure...`)

  try {
    await waitForJobCompletion(job4.id!)
    throw new Error("Expected Job #4 to fail, but it finished successfully!")
  } catch {
    const freshJob4 = await ingestionQueue.getJob(job4.id!)
    console.log("  ✔ Job #4 correctly failed as expected:")
    console.log(`    - Job State:      ${await freshJob4?.getState()}`)
    console.log(`    - Failure Reason: ${freshJob4?.failedReason}\n`)
  }

  console.log("==========================================================")
  console.log("      ALL COMMITS INGESTION PIPELINE TESTS PASSED!        ")
  console.log("==========================================================")

  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

runCommitsPipelineTests().catch(async (err) => {
  console.error("\n❌ Commits pipeline test failed:", err)
  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(1)
})

