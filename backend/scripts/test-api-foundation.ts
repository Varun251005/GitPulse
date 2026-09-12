import { NextRequest } from "next/server"
import { GET } from "../../app/api/repos/[owner]/[repo]/route"
import { prisma } from "@/backend/db/prisma"

// A simple mock for NextRequest
function createMockRequest(url: string) {
  return new NextRequest(new URL(url))
}

async function runApiFoundationTests() {
  console.log("==========================================================")
  console.log("   GitPulse — Step 9A: Dashboard API Foundation Tests     ")
  console.log("==========================================================\n")

  // Make sure we connect to the DB
  await prisma.$connect()

  // 1. Success Request Test
  console.log("▶ [Test 1] Requesting existing repository: octocat/Hello-World")
  const req1 = createMockRequest("http://localhost:3000/api/repos/octocat/Hello-World")
  const res1 = await GET(req1, { params: { owner: "octocat", repo: "Hello-World" } })
  
  if (res1.status !== 200) {
    throw new Error(`Expected HTTP 200, got ${res1.status}`)
  }

  // 2 & 5. BigInt Serialization Test & Payload check
  console.log("▶ [Test 2 & 5] Validating Payload Shape and BigInt Serialization")
  const json1 = await res1.json()
  
  if (!json1.repository || !json1.summary) {
    throw new Error("Missing expected core payload properties (repository or summary)")
  }
  
  // Verify that it stringified BigInts
  if (typeof json1.repository.githubId !== "string") {
    throw new Error("Repository githubId was not serialized as string!")
  }
  if (json1.pullRequests.length > 0 && typeof json1.pullRequests[0].githubId !== "string") {
    throw new Error("PullRequest githubId was not serialized as string!")
  }
  
  console.log("  ✔ JSON successfully parsed without BigInt crashes.")
  console.log(`  ✔ Returned Repository:  ${json1.repository.fullName}`)
  console.log(`  ✔ Contributors Count:   ${json1.summary.contributorsCount}`)
  console.log(`  ✔ Commits Count:        ${json1.summary.commitsCount}`)
  console.log(`  ✔ Pull Requests Count:  ${json1.summary.pullRequestsCount}`)
  console.log(`  ✔ Issues Count:         ${json1.summary.issuesCount}`)

  // 3. Counts Verification
  console.log("\n▶ [Test 3] Verifying Summary Counts strictly match DB")
  const dbRepoId = json1.repository.id
  const totalCommitsInDb = await prisma.commit.count({ where: { repoId: dbRepoId } })
  const totalPRsInDb = await prisma.pullRequest.count({ where: { repoId: dbRepoId } })
  
  if (json1.summary.commitsCount !== totalCommitsInDb) {
    throw new Error(`Commit count mismatch: API=${json1.summary.commitsCount}, DB=${totalCommitsInDb}`)
  }
  if (json1.summary.pullRequestsCount !== totalPRsInDb) {
    throw new Error(`PR count mismatch: API=${json1.summary.pullRequestsCount}, DB=${totalPRsInDb}`)
  }
  console.log("  ✔ API summary accurately reflects exact database aggregates.")

  // 4. 404 Handling
  console.log("\n▶ [Test 4] Requesting nonexistent repository (404 Handling)")
  const req4 = createMockRequest("http://localhost:3000/api/repos/octocat/does-not-exist")
  const res4 = await GET(req4, { params: { owner: "octocat", repo: "does-not-exist" } })
  
  if (res4.status !== 404) {
    throw new Error(`Expected HTTP 404, got ${res4.status}`)
  }
  const json4 = await res4.json()
  if (!json4.error) {
    throw new Error("Expected structured error payload on 404")
  }
  console.log(`  ✔ Correctly returned 404: "${json4.error}"`)

  // 6. 400 Invalid parameters
  console.log("\n▶ [Test 6] Requesting with invalid parameters (400 Handling)")
  const req6 = createMockRequest("http://localhost:3000/api/repos/invalid")
  const res6 = await GET(req6, { params: { owner: "", repo: "" } })
  
  if (res6.status !== 400) {
    throw new Error(`Expected HTTP 400, got ${res6.status}`)
  }
  console.log(`  ✔ Correctly returned 400 for bad parameters.`)

  console.log("\n==========================================================")
  console.log("     ALL DASHBOARD API FOUNDATION TESTS PASSED!           ")
  console.log("==========================================================")

  await prisma.$disconnect()
  process.exit(0)
}

runApiFoundationTests().catch(async (err) => {
  console.error("\n❌ API foundation test failed:", err)
  await prisma.$disconnect()
  process.exit(1)
})

