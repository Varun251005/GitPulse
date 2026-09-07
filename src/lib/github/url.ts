export interface ParsedGitHubUrl {
  owner: string
  repo: string
}

const GITHUB_HOSTNAMES = new Set(["github.com", "www.github.com"])

// GitHub usernames/orgs: 1-39 characters, alphanumeric with single hyphens, not starting/ending with hyphen
const OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/

// GitHub repo names: 1-100 characters, alphanumeric, hyphen, underscore, and period
const REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/

/**
 * Parses and validates a GitHub repository URL.
 * 
 * Supports:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo/
 * - https://github.com/owner/repo.git
 * 
 * Rejects invalid domains, non-URLs, extra path segments, and invalid character patterns.
 */
export function parseGitHubRepoUrl(input: string): ParsedGitHubUrl | null {
  if (!input || typeof input !== "string") {
    return null
  }

  const trimmed = input.trim()

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!GITHUB_HOSTNAMES.has(url.hostname.toLowerCase())) {
    return null
  }

  // Split pathname, filter empty segments (handles leading/trailing/multiple slashes)
  const segments = url.pathname.split("/").filter(Boolean)

  if (segments.length !== 2) {
    return null
  }

  const [rawOwner, rawRepo] = segments
  const owner = rawOwner.trim()
  let repo = rawRepo.trim()

  // Remove optional .git suffix if present
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4)
  }

  if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo)) {
    return null
  }

  // Reject "." or ".." as repo names
  if (repo === "." || repo === "..") {
    return null
  }

  return { owner, repo }
}

