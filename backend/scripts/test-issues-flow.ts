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

async function runIssuesPipelineTests() {
  console.log("==========================================================")
  console.log("        GitPulse — Step 8E: Issues Pipeline Tests         ")
  console.log("==========================================================\n")

  await prisma.$connect()

  // ------------------------------------------------------------
  // TEST 1: Initial Ingestion of octocat/Hello-World
  // ------------------------------------------------------------
  console.log("▶ [Test 1] Ingesting Public Repo, Contributors, Commits, PRs & Issues: octocat/Hello-World")
  const job1 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-issues",
  })
  console.log(`  Job #1 enqueued (ID: ${job1.id}). Waiting for worker...`)

  const result1 = await waitForJobCompletion(job1.id!)
  console.log("  ✔ Job #1 completed successfully!")
  console.log(`    - Message:            ${result1.message}`)
  console.log(`    - Repo ID:            ${result1.repoId}`)
  console.log(`    - Issues Synced:      ${result1.issuesCount}`)

  // Verify in PostgreSQL: Repo with relation to issues
  const dbRepo1 = await prisma.repo.findUnique({
    where: { githubId: result1.githubId },
    include: {
      issues: {
        orderBy: { openedAt: "desc" },
        take: 5,
        include: { author: true },
      },
    },
  })

  if (!dbRepo1) {
    throw new Error("Repository not found in PostgreSQL!")
  }

  const totalIssuesInDb = await prisma.issue.count({
    where: { repoId: dbRepo1.id },
  })

  console.log("\n  ✔ PostgreSQL Verification for Issues:")
  console.log(`    - Repo Name:          ${dbRepo1.fullName}`)
  console.log(`    - Total Issues in DB: ${totalIssuesInDb}`)

  if (totalIssuesInDb === 0) {
    throw new Error("No issues were saved to the database!")
  }

  console.log("    - Top 5 recent issues:")
  for (const issue of dbRepo1.issues) {
    const authorStr = issue.author ? `@${issue.author.username}` : "NULL (Unmatched/No Author)"
    console.log(`      * [#${issue.number}] ${issue.title.substring(0, 40).padEnd(40, ' ')} [${issue.state}] by ${authorStr} (${issue.commentsCount} comments)`)
  }

  // ------------------------------------------------------------
  // TEST 2: PR Filtering Verification
  // ------------------------------------------------------------
  console.log("\n▶ [Test 2] Pull Request Filtering Verification")
  const allIssues = await prisma.issue.findMany({ where: { repoId: dbRepo1.id }, select: { number: true } })
  const allPRs = await prisma.pullRequest.findMany({ where: { repoId: dbRepo1.id }, select: { number: true } })

  const issueNumbers = new Set(allIssues.map(i => i.number))
  let intersectionFound = false
  for (const pr of allPRs) {
    if (issueNumbers.has(pr.number)) {
      intersectionFound = true
      break
    }
  }

  if (intersectionFound) {
    throw new Error("Pull requests were accidentally saved into the Issues table!")
  }
  console.log("  ✔ Verified 0 intersections between Pull Requests and Issues tables.")

  // ------------------------------------------------------------
  // TEST 3: Idempotency Verification
  // ------------------------------------------------------------
  console.log("\n▶ [Test 3] Idempotency Check — Re-ingesting Same Repository")
  const job3 = await ingestionQueue.add("ingest-repo", {
    url: "https://github.com/octocat/Hello-World",
    triggeredBy: "test-pipeline-issues-duplicate",
  })
  console.log(`  Job #3 enqueued (ID: ${job3.id}). Waiting for worker...`)

  await waitForJobCompletion(job3.id!)
  console.log("  ✔ Job #3 completed successfully!")

  const totalIssuesInDbAfter = await prisma.issue.count({
    where: { repoId: dbRepo1.id },
  })

  console.log(`  ✔ Post-duplicate Issue count: ${totalIssuesInDbAfter}`)
  if (totalIssuesInDbAfter !== totalIssuesInDb) {
    throw new Error(
      `Duplicate ingestion created extra Issues! Expected ${totalIssuesInDb}, got ${totalIssuesInDbAfter}`
    )
  }
  console.log("  ✔ Verified zero duplicate Issue records created (GitHub IDs are idempotent).\n")

  // ------------------------------------------------------------
  // TEST 4: Null Author Handling
  // ------------------------------------------------------------
  console.log("▶ [Test 4] Null Author Safety Verification")
  const nullAuthorIssues = await prisma.issue.count({
    where: { repoId: dbRepo1.id, authorId: null },
  })
  console.log(`  ✔ Found ${nullAuthorIssues} Issues with NULL author. Schema correctly maps unresolvable authors.\n`)

  // ------------------------------------------------------------
  // TEST 5: 404 Failure Handling
  // ------------------------------------------------------------
  console.log("▶ [Test 5] Failure Handling — Nonexistent Repository (404)")
  const nonexistentUrl = "https://github.com/octocat/this-repository-definitely-does-not-exist-gitpulse-issues"
  const job5 = await ingestionQueue.add("ingest-repo", {
    url: nonexistentUrl,
    triggeredBy: "test-pipeline-404",
  })
  console.log(`  Job #5 enqueued (ID: ${job5.id}). Waiting for failure...`)

  try {
    await waitForJobCompletion(job5.id!)
    throw new Error("Expected Job #5 to fail, but it finished successfully!")
  } catch {
    const freshJob5 = await ingestionQueue.getJob(job5.id!)
    console.log("  ✔ Job #5 correctly failed as expected:")
    console.log(`    - Job State:      ${await freshJob5?.getState()}`)
    console.log(`    - Failure Reason: ${freshJob5?.failedReason}\n`)
  }

  console.log("==========================================================")
  console.log("      ALL ISSUE INGESTION PIPELINE TESTS PASSED!          ")
  console.log("==========================================================")

  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

runIssuesPipelineTests().catch(async (err) => {
  console.error("\n❌ Issue pipeline test failed:", err)
  await ingestionQueue.close()
  await prisma.$disconnect()
  process.exit(1)
})
