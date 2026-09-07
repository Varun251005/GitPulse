This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
# GitPulse

## Getting Started
GitPulse is a GitHub Repository Analytics Dashboard that ingests and visualizes GitHub metrics, activity, and repository health. It processes deep datasets (like commits, pull requests, issues, and contributors) locally and visualizes them on a clear, responsive React dashboard.

First, run the development server:
## Tech Stack

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
*   **Next.js 14** (App Router, Server Components)
*   **React 18**
*   **TypeScript** (Strict Mode)
*   **Tailwind CSS** + **shadcn/ui**
*   **Recharts** (Data Visualization)
*   **Bun** (JavaScript Runtime & Package Manager)
*   **Prisma** (ORM)
*   **PostgreSQL** (Database)
*   **Redis** (In-memory broker)
*   **BullMQ** (Background Job Queues)
*   **Octokit** (GitHub API Client)

## Architecture

GitPulse is strictly separated into frontend and backend domain layers for reliability and clear boundaries:

```text
Next.js Routing Layer (app/)
    ↓
Dashboard & API
    ↓
Backend Domain (backend/)
    ↓
GitHub Service (Octokit)
    ↓
PostgreSQL & Prisma
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
**Asynchronous Ingestion Engine:**
```text
BullMQ Queue
    ↓
Redis
    ↓
Ingestion Worker
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
## Local Prerequisites

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
To run GitPulse locally, ensure you have the following installed:

## Learn More
1.  **Bun** (v1.x)
2.  **Docker & Docker Compose** (for providing local PostgreSQL and Redis instances)

To learn more about Next.js, take a look at the following resources:
## Environment Variables

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
Copy the example environment structure into `.env` (note: these map to standard local Docker deployments):

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gitpulse?schema=public"
REDIS_URL="redis://localhost:6379"
```

## Background Queue & Worker (BullMQ + Redis)
*Do not commit your `.env` file containing actual secrets or production credentials.*

GitPulse utilizes **BullMQ** on top of **Redis** for asynchronous background job processing (such as repository ingestion, commits fetching, and analytics indexing).
## Running the Project

### Queue Infrastructure
* **Queue Name**: `gitpulse-ingestion`
* **Storage Broker**: Redis 7 running via Docker (`gitpulse-redis` at port `6379`).
* **Producer**: Next.js API / server actions enqueue jobs via `ingestionQueue` in `src/lib/queue/ingestion.queue.ts`.
* **Worker**: Dedicated background process defined in `src/workers/ingestion.worker.ts`.
1. **Install dependencies:**
   ```bash
   bun install
   ```

### Running the Worker
To run the background worker separately from the Next.js web application:
```bash
bun run worker
```
2. **Start the background ingestion worker:**
   This worker listens to the `gitpulse-ingestion` queue and handles all GitHub communication asynchronously.
   ```bash
   bun run worker
   ```

### Testing the Queue Flow
To produce a test ingestion job and verify end-to-end execution:
```bash
bun run src/scripts/test-enqueue.ts
```
3. **Start the Next.js development server:**
   In a separate terminal, start the web dashboard.
   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to search and analyze repositories.

## Testing & Verification

You can verify the codebase using Bun's built-in execution tools:

*   **Linting:**
    ```bash
    bun run lint
    ```
*   **Production Build Check:**
    ```bash
    bun run build
    ```
