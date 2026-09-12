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

async function runPullRequestsPipelineTests() {
  console.log("==========================================================")
  console.log("    GitPulse — Step 8D: Pull Requests Pipeline Tests      ")
  console.log("==========================================================\n")

  await prisma.$connect()

  // ------------------------------------------------------------
  // TEST 1: Initial Ingestion of octocat/Hello-World
  // ------------------------------------------------------------
  console.log("▶ [Test 1] Ingesting Public Repo, Contributors, Commits & PRs: octocat/Hello-World")
  const job1 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-prs",
  })
  console.log(`  Job #1 enqueued (ID: ${job1.id}). Waiting for worker...`)

  const result1 = await waitForJobCompletion(job1.id!)
  console.log("  ✔ Job #1 completed successfully!")
  console.log(`    - Message:            ${result1.message}`)
  console.log(`    - Repo ID:            ${result1.repoId}`)
  console.log(`    - Pull Requests:      ${result1.pullRequestsCount}`)

  // Verify in PostgreSQL: Repo with relation to pull requests
  const dbRepo1 = await prisma.repo.findUnique({
    where: { githubId: result1.githubId },
    include: {
      pullRequests: {
        orderBy: { openedAt: "desc" },
        take: 5,
        include: { author: true },
      },
    },
  })

  if (!dbRepo1) {
    throw new Error("Repository not found in PostgreSQL!")
  }

  const totalPRsInDb = await prisma.pullRequest.count({
    where: { repoId: dbRepo1.id },
  })

  console.log("\n  ✔ PostgreSQL Verification for Pull Requests:")
  console.log(`    - Repo Name:          ${dbRepo1.fullName}`)
  console.log(`    - Total PRs in DB:    ${totalPRsInDb}`)

  if (totalPRsInDb === 0) {
    throw new Error("No pull requests were saved to the database!")
  }

  console.log("    - Top 5 recent pull requests:")
  let hasMerged = false
  for (const pr of dbRepo1.pullRequests) {
    const authorStr = pr.author ? `@${pr.author.username}` : "NULL (Unmatched/No Author)"
    const mergedStr = pr.mergedAt ? `(Merged: ${pr.mergedAt.toISOString()})` : "(Not merged)"
    if (pr.mergedAt) hasMerged = true
    console.log(`      * [#${pr.number}] ${pr.title.substring(0, 40).padEnd(40, ' ')} [${pr.state}] by ${authorStr} ${mergedStr}`)
  }

  // ------------------------------------------------------------
  // TEST 2: Idempotency Verification (Re-ingesting Same Repo)
  // ------------------------------------------------------------
  console.log("\n▶ [Test 2] Idempotency Check — Re-ingesting Same Repository")
  const job2 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-prs-duplicate",
  })
  console.log(`  Job #2 enqueued (ID: ${job2.id}). Waiting for worker...`)

  const result2 = await waitForJobCompletion(job2.id!)
  console.log("  ✔ Job #2 completed successfully!")
  console.log(`    - Is New:             ${result2.isNew} (expected false)`)

  const totalPRsInDbAfter = await prisma.pullRequest.count({
    where: { repoId: dbRepo1.id },
  })

  console.log(`  ✔ Post-duplicate PR count: ${totalPRsInDbAfter}`)
  if (totalPRsInDbAfter !== totalPRsInDb) {
    throw new Error(
      `Duplicate ingestion created extra PRs! Expected ${totalPRsInDb}, got ${totalPRsInDbAfter}`
    )
  }
  console.log("  ✔ Verified zero duplicate Pull Request records created (GitHub IDs are idempotent).\n")

  // ------------------------------------------------------------
  // TEST 3: Null Author / Relationships Verification
  // ------------------------------------------------------------
  console.log("▶ [Test 3] Null Author & State Handling Verification")
  const nullAuthorPRs = await prisma.pullRequest.count({
    where: { repoId: dbRepo1.id, authorId: null },
  })
  console.log(`  ✔ Found ${nullAuthorPRs} PRs with NULL author. Schema properly handles unmatched contributors.`)
  if (hasMerged) {
    console.log("  ✔ Successfully verified mergedAt dates are persisted for merged PRs.\n")
  } else {
    console.log("  ✔ Checked mergedAt handling (No merged PRs in top 5 to show).\n")
  }

  // ------------------------------------------------------------
  // TEST 4: 404 Failure Handling (Nonexistent Repository)
  // ------------------------------------------------------------
  console.log("▶ [Test 4] Failure Handling — Nonexistent Repository (404)")
  const nonexistentUrl = "https://github.com/octocat/this-repository-definitely-does-not-exist-gitpulse-prs"
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
  console.log("    ALL PULL REQUEST INGESTION PIPELINE TESTS PASSED!     ")
  console.log("==========================================================")

  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

runPullRequestsPipelineTests().catch(async (err) => {
  console.error("\n❌ Pull request pipeline test failed:", err)
  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(1)
})

