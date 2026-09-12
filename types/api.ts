export interface GitPulseRepo {
  id: number
  githubId: string
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  defaultBranch: string
  language: string | null
  starsCount: number
  forksCount: number
  openIssuesCount: number
  isPrivate: boolean
  lastSyncedAt: string | null
  createdAt: string
}

export interface GitPulseSummary {
  contributorsCount: number
  commitsCount: number
  pullRequestsCount: number
  issuesCount: number
}

export interface GitPulseContributor {
  id: number
  githubId: string
  username: string
  avatarUrl: string | null
}

export interface GitPulseCommit {
  sha: string
  message: string
  committedAt: string
  author: {
    username: string
    avatarUrl: string | null
  } | null
}

export interface GitPulsePullRequest {
  githubId: string
  number: number
  title: string
  body: string | null
  state: string
  draft: boolean
  openedAt: string
  closedAt: string | null
  mergedAt: string | null
  author: {
    username: string
    avatarUrl: string | null
  } | null
}

export interface GitPulseIssue {
  githubId: string
  number: number
  title: string
  body: string | null
  state: string
  commentsCount: number
  openedAt: string
  closedAt: string | null
  author: {
    username: string
    avatarUrl: string | null
  } | null
}

export interface DashboardData {
  repository: GitPulseRepo
  summary: GitPulseSummary
  contributors: GitPulseContributor[]
  commits: GitPulseCommit[]
  pullRequests: GitPulsePullRequest[]
  issues: GitPulseIssue[]
}

