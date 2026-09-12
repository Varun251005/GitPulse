/**
 * Custom application-level errors for GitHub API operations.
 */

export class GitHubApiError extends Error {
  public readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "GitHubApiError"
    this.status = status
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(message = "GitHub repository or resource not found (or is private/inaccessible).") {
    super(message, 404)
    this.name = "GitHubNotFoundError"
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  public readonly resetTime?: Date

  constructor(
    message = "GitHub API rate limit exceeded. Please wait before retrying.",
    status = 403,
    resetTime?: Date
  ) {
    super(message, status)
    this.name = "GitHubRateLimitError"
    this.resetTime = resetTime
  }
}

export class GitHubForbiddenError extends GitHubApiError {
  constructor(message = "Access to the requested GitHub resource is forbidden.") {
    super(message, 403)
    this.name = "GitHubForbiddenError"
  }
}

interface OctokitErrorResponse {
  status: number
  message?: string
  response?: {
    headers?: Record<string, string | undefined>
    data?: {
      message?: string
    }
  }
}

/**
 * Maps raw Octokit/HTTP errors into clear, application-level error classes.
 */
export function toGitHubError(error: unknown): Error {
  if (error instanceof GitHubApiError) {
    return error
  }

  if (error && typeof error === "object" && "status" in error) {
    const octokitErr = error as OctokitErrorResponse
    const status = octokitErr.status
    const message = octokitErr.response?.data?.message || octokitErr.message || "GitHub API Error"

    if (status === 404) {
      return new GitHubNotFoundError(`Repository not found: ${message}`)
    }

    if (status === 403 || status === 429) {
      const resetHeader = octokitErr.response?.headers?.["x-ratelimit-reset"]
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : undefined

      if (message.toLowerCase().includes("rate limit") || status === 429) {
        return new GitHubRateLimitError(
          `GitHub rate limit exceeded: ${message}`,
          status,
          resetTime
        )
      }

      return new GitHubForbiddenError(`Forbidden request: ${message}`)
    }

    return new GitHubApiError(`GitHub API error (${status}): ${message}`, status)
  }

  if (error instanceof Error) {
    return new GitHubApiError(`Network or connection error while contacting GitHub: ${error.message}`)
  }

  return new GitHubApiError("An unknown error occurred while communicating with GitHub API.")
}

