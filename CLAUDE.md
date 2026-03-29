You are working on RankVibe — an AI-powered SaaS platform for local businesses (starting with barbershops) focused on reputation growth, review generation, and competitor intelligence.

## PROJECT CONTEXT

RankVibe is a two-phase platform:

**Phase 1 — Intelligence Engine (Data Layer):**
Collects and analyzes public Google Maps reviews to generate competitor insights, sentiment trends, and benchmarking data.

**Phase 2 — Reputation Product (Customer Layer):**
Helps local businesses increase positive reviews, capture negative feedback privately, and monitor performance via a dashboard.

## MONOREPO STRUCTURE

This is an npm workspaces monorepo. Here is the layout:

```
rankvibe/
├── apps/
│   ├── web/              → Next.js 15 + React 19 + Tailwind (App Router)
│   │                       Dashboard, homepage, QR review flow, API routes
│   └── worker/           → BullMQ background job processor
│                           Apify scraping, AI enrichment (sentiment/themes)
├── packages/
│   ├── core/             → Shared TypeScript types + constants
│   ├── db/               → Drizzle ORM schema, migrations, DB client (Supabase Postgres)
│   ├── ui/               → Reusable React components (StarRating, MetricCard, Button)
│   └── config/           → Environment variable helpers
├── .env.example          → All required environment variables
├── package.json          → Workspace root with dev/build/db scripts
└── tsconfig.json         → Base TypeScript config
```

## TECH STACK

- Frontend: Next.js 15, React 19, Tailwind CSS, TypeScript
- Backend: Node.js + TypeScript API routes
- Database: PostgreSQL via Supabase, Drizzle ORM
- Job Queue: BullMQ + Redis
- Scraping: Apify (Google Maps Reviews Scraper)
- AI: OpenAI GPT-4o-mini (sentiment, themes, summaries, reply generation)
- Hosting: Vercel (web), TBD (worker)

## DATABASE SCHEMA (Drizzle ORM)

Located at `packages/db/src/schema/index.ts`. Tables:

Phase 1: businesses, reviews, review_snapshots, competitor_clusters, rankings
Phase 2: users, review_links, feedback_submissions, ai_replies

## KEY FLOWS

**Review Funnel (Phase 2):**
Customer scans QR → lands on `/review/[slug]` → rates experience →
- Rating >= 4: redirected to Google review page
- Rating < 4: private feedback form captured internally
The threshold is defined in `packages/core/src/constants.ts` as RATING_THRESHOLD.

**Scraping Pipeline (Phase 1):**
Apify scraper → `apps/worker/src/jobs/scrape.ts` → normalize reviews → store in Supabase → queue AI enrichment → `apps/worker/src/jobs/enrich.ts` → extract sentiment + themes via OpenAI → store insights

**Dashboard:**
`apps/web/src/app/dashboard/` — sidebar layout with pages for Overview, Reviews, Competitors, Insights, QR Codes, Feedback, Settings.

## SHARED PACKAGES

- Import types with: `import { Business, Review, Sentiment } from '@rankvibe/core'`
- Import DB with: `import { db, businesses, reviews } from '@rankvibe/db'`
- Import components with: `import { StarRating, Button } from '@rankvibe/ui'`
- Import env helpers with: `import { getEnv } from '@rankvibe/config'`

## SCRIPTS

- `npm run dev:web` — Start Next.js dev server
- `npm run dev:worker` — Start worker with hot reload (tsx watch)
- `npm run db:push` — Push schema to Supabase
- `npm run db:generate` — Generate migration files
- `npm run lint` — Lint all TypeScript
- `npm run format` — Prettier format all files

## RULES FOR THIS PROJECT

1. Always use TypeScript with strict mode
2. Use Drizzle ORM for all database operations — never raw SQL in application code
3. All shared types go in `packages/core/src/types.ts`
4. All shared constants go in `packages/core/src/constants.ts`
5. Reusable React components go in `packages/ui/src/components/`
6. Use Tailwind CSS for styling — no CSS modules, no styled-components
7. API routes live in `apps/web/src/app/api/`
8. Background jobs live in `apps/worker/src/jobs/`
9. Use the App Router pattern (Next.js 15) — no pages/ directory
10. Environment variables must be accessed via `@rankvibe/config` helpers in server code
11. Keep the review funnel mobile-first — minimal friction UX
12. Follow existing naming conventions: kebab-case for files, PascalCase for components

## CURRENT STATUS

The project foundation is set up (Week 1 of the roadmap). The next steps are:
- Setting up Supabase project and connecting the database
- Running first schema migration
- Seeding test business/review data
- First Apify scrape integration test
- Building out the dashboard with real data

## IMPORTANT

- Read existing files before modifying them
- Respect the monorepo workspace boundaries
- Don't install packages at root — use `npm install <pkg> --workspace=apps/web` (or the appropriate workspace)
- When adding new DB tables, add them to the schema file AND add matching types to @rankvibe/core
