# GitPulse — GitHub Repository Analytics Dashboard

GitPulse is a full-stack GitHub analytics application that ingests and visualizes GitHub metrics, activity, and repository health. It supports both unauthenticated public repository analysis and authenticated GitHub account integration for analyzing user repositories (including private repositories).

## Features

*   **Public Repository Analysis:** Enter any public GitHub repository URL on the homepage without signing in.
*   **GitHub Authentication:** Sign in with your GitHub account via OAuth (NextAuth.js) to access your repository library.
*   **Repository Library (`/repos`):** Browse, search, filter (All, Public, Private 🔒), and sort all repositories accessible to your GitHub account.
*   **Private Repository Ingestion:** Seamlessly analyze private repositories using server-side OAuth access token authorization.
*   **Deep Analytics & Metrics:**
    *   **Repository Overview & Summary Cards:** Stars, forks, languages, open issues count, unique contributors, commits, and pull requests.
    *   **Contributor Breakdown:** Top commit authors and contributors.
    *   **Commit Activity:** Bounded commit history visualization over time.
    *   **Pull Request Distribution:** PR state breakdowns (Open, Closed, Merged).
    *   **Issue Analytics:** Issue resolution and open/closed ratios.
*   **Asynchronous Background Worker:** BullMQ + Redis background worker for non-blocking GitHub ingestion and rate-limit preservation.

## Tech Stack

*   **Next.js 14** (App Router, Server Components, Route Handlers)
*   **React 18**
*   **TypeScript** (Strict Mode)
*   **NextAuth.js / Auth.js** (GitHub OAuth Provider with Prisma Adapter)
*   **Tailwind CSS** + **shadcn/ui**
*   **Recharts** (Data Visualization)
*   **Prisma 6.x** (ORM)
*   **PostgreSQL 16** (Database)
*   **Redis 7** (BullMQ Ingestion Queue Broker)
*   **BullMQ** (Background Job Processing)
*   **Octokit 5.x** (Official GitHub SDK)
*   **Bun** (Package Manager & JavaScript Runtime)

## Architecture

```text
Next.js Frontend & API (app/)
    ↓
Auth (NextAuth / JWT / PrismaAdapter)
    ↓
Backend Domain (backend/)
    ↓
BullMQ Ingestion Queue → Redis → Ingestion Worker
    ↓
Octokit (Authenticated / Public) → GitHub API
    ↓
PostgreSQL via Prisma ORM
```

## Local Prerequisites

1.  **Bun** (v1.x)
2.  **Docker & Docker Compose** (for PostgreSQL and Redis containers)

## Environment Variables

Create a `.env` file from `.env.example`:

```env
# PostgreSQL Database URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gitpulse?schema=public"

# Redis URL for BullMQ background ingestion queue
REDIS_URL="redis://localhost:6379"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key"

# GitHub OAuth App Credentials (Optional for public-only mode, Required for GitHub login)
# Create a GitHub OAuth App at: https://github.com/settings/developers
# Authorization callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Running the Project

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start the background ingestion worker:**
   ```bash
   bun run worker
   ```

3. **Start the Next.js development server:**
   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing & Verification

```bash
# Run ESLint validation
bun run lint

# Run Next.js production build check
bun run build
```
