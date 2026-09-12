import { Octokit } from "octokit"

/**
 * Server-side GitHub API client configured with the official Octokit SDK.
 *
 * Designed exclusively for server-side environments (Server Actions, Route Handlers, background workers).
 * Never import or execute this on the client / browser.
 */
const createOctokitClient = (token?: string) => {
  return new Octokit({
    userAgent: "GitPulse-Analytics-Dashboard/0.1.0",
    ...(token ? { auth: token } : {}),
  })
}

declare const globalThis: {
  octokitGlobal: Octokit | undefined
} & typeof global

export const octokit = globalThis.octokitGlobal ?? createOctokitClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.octokitGlobal = octokit
}

/**
 * Returns an Octokit instance. If an OAuth access token is provided, returns
 * an authenticated client; otherwise returns the shared public client.
 */
export function getOctokit(token?: string): Octokit {
  if (token) {
    return createOctokitClient(token)
  }
  return octokit
}
