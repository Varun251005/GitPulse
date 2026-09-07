import { octokit, parseGitHubRepoUrl, toGitHubError, GitHubNotFoundError } from "../lib/github"

async function runTests() {
  console.log("==================================================")
  console.log("       GitPulse — GitHub API / Octokit Tests      ")
  console.log("==================================================\n")

  // ----------------------------------------------------
  // Test 1: URL Parser Test
  // ----------------------------------------------------
  console.log("▶ [Test 1] URL Parser Validation")
  const validUrl = "https://github.com/facebook/react"
  const parsed = parseGitHubRepoUrl(validUrl)
  console.log(`  Input:  ${validUrl}`)
  console.log(`  Result:`, parsed)
  if (!parsed || parsed.owner !== "facebook" || parsed.repo !== "react") {
    throw new Error("URL parser failed on valid URL: facebook/react")
  }

  const trailingSlashParsed = parseGitHubRepoUrl("https://github.com/facebook/react/")
  if (!trailingSlashParsed || trailingSlashParsed.owner !== "facebook" || trailingSlashParsed.repo !== "react") {
    throw new Error("URL parser failed with trailing slash")
  }

  const gitSuffixParsed = parseGitHubRepoUrl("https://github.com/facebook/react.git")
  if (!gitSuffixParsed || gitSuffixParsed.owner !== "facebook" || gitSuffixParsed.repo !== "react") {
    throw new Error("URL parser failed with .git suffix")
  }

  const invalidUrls = [
    "https://google.com/facebook/react",
    "not-a-url",
    "https://github.com/",
    "https://github.com/facebook",
    "https://github.com/facebook/react/issues",
    "https://github.com/../something",
  ]

  for (const inv of invalidUrls) {
    const res = parseGitHubRepoUrl(inv)
    if (res !== null) {
      throw new Error(`Expected invalid URL to return null, but got ${JSON.stringify(res)} for: ${inv}`)
    }
  }
  console.log("  ✔ All valid and invalid URL parsing assertions passed!\n")

  // ----------------------------------------------------
  // Test 2: Repository API (Safe Public Read)
  // ----------------------------------------------------
  console.log("▶ [Test 2] Repository API Metadata GET (octocat/Hello-World)")
  try {
    const { data: repo } = await octokit.rest.repos.get({
      owner: "octocat",
      repo: "Hello-World",
    })

    console.log("  ✔ Successfully fetched repository metadata:")
    console.log(`    - ID:                  ${repo.id}`)
    console.log(`    - Name:                ${repo.name}`)
    console.log(`    - Full Name:           ${repo.full_name}`)
    console.log(`    - Owner:               ${repo.owner?.login}`)
    console.log(`    - Description:         ${repo.description}`)
    console.log(`    - Default Branch:      ${repo.default_branch}`)
    console.log(`    - Language:            ${repo.language}`)
    console.log(`    - Stars:               ${repo.stargazers_count}`)
    console.log(`    - Forks:               ${repo.forks_count}`)
    console.log(`    - Open Issues:         ${repo.open_issues_count}`)
    console.log(`    - Private:             ${repo.private}\n`)
  } catch (err) {
    throw toGitHubError(err)
  }

  // ----------------------------------------------------
  // Test 3: Rate Limit GET
  // ----------------------------------------------------
  console.log("▶ [Test 3] Rate Limit Check (/rate_limit)")
  try {
    const { data: rateLimit } = await octokit.rest.rateLimit.get()
    const core = rateLimit.resources.core
    const resetDate = new Date(core.reset * 1000).toLocaleTimeString()

    console.log("  ✔ Rate limit quota inspected:")
    console.log(`    - Limit:               ${core.limit} requests/hour`)
    console.log(`    - Remaining:           ${core.remaining}`)
    console.log(`    - Reset Time:          ${resetDate} (timestamp: ${core.reset})\n`)
  } catch (err) {
    throw toGitHubError(err)
  }

  // ----------------------------------------------------
  // Test 4: Bounded Pagination Test
  // ----------------------------------------------------
  console.log("▶ [Test 4] Bounded Pagination Demonstration (5 commits)")
  try {
    const { data: commits, headers } = await octokit.rest.repos.listCommits({
      owner: "octocat",
      repo: "Hello-World",
      per_page: 5,
      page: 1,
    })

    console.log(`  ✔ Successfully fetched page 1 with ${commits.length} commits (bounded to per_page=5).`)
    console.log(`    - Latest Commit SHA:   ${commits[0]?.sha.slice(0, 7)}`)
    console.log(`    - Author:              ${commits[0]?.commit.author?.name}`)
    console.log(`    - Message:             ${commits[0]?.commit.message.trim()}`)
    console.log(`    - Link Header:         ${headers.link ? "Present (Pagination available)" : "Not present"}\n`)
  } catch (err) {
    throw toGitHubError(err)
  }

  // ----------------------------------------------------
  // Test 5: Error Handling (404 Not Found)
  // ----------------------------------------------------
  console.log("▶ [Test 5] Error Handling (404 Nonexistent Repository)")
  const nonexistentOwner = "octocat"
  const nonexistentRepo = "this-repo-definitely-does-not-exist-gitpulse-test"
  try {
    await octokit.rest.repos.get({
      owner: nonexistentOwner,
      repo: nonexistentRepo,
    })
    throw new Error("Expected 404 error but request succeeded!")
  } catch (err) {
    const appError = toGitHubError(err)
    if (appError instanceof GitHubNotFoundError) {
      console.log(`  ✔ Correctly caught and transformed 404:`)
      console.log(`    - Error Type:          ${appError.name}`)
      console.log(`    - Error Message:       ${appError.message}`)
      console.log(`    - HTTP Status:         ${appError.status}\n`)
    } else {
      throw new Error(`Expected GitHubNotFoundError, but received: ${appError.name}: ${appError.message}`)
    }
  }

  console.log("==================================================")
  console.log("  ALL 5 GITHUB API FOUNDATION TESTS PASSED!       ")
  console.log("==================================================")
}

runTests().catch((err) => {
  console.error("\n❌ Test execution failed:", err)
  process.exit(1)
})

