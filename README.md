# RankVibe

**AI-powered reputation growth platform for local businesses.**

Get more Google reviews, capture private feedback, and outperform competitors — starting with barbershops.

---

## Architecture

```
rankvibe/
├── apps/
│   ├── web/            → Next.js dashboard + review landing pages
│   └── worker/         → Background jobs: scraping, AI enrichment
├── packages/
│   ├── core/           → Shared types, constants, business logic
│   ├── db/             → Drizzle ORM schema, migrations, DB client
│   ├── ui/             → Reusable React components
│   └── config/         → Shared environment helpers
├── .env.example        → Environment variable template
├── package.json        → npm workspaces root
└── tsconfig.json       → Base TypeScript config
```

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10 (ships with Node 20)
- **Redis** (local or cloud — needed for BullMQ job queue)
- **Supabase** account (free tier works to start)
- **Apify** account (for Google Maps review scraping)
- **OpenAI** API key (for sentiment analysis / AI features)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/rankvibe.git
cd rankvibe
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your actual keys
```

### 3. Set up the database

```bash
# Push schema to Supabase
npm run db:push
```

### 4. Start development

```bash
# Terminal 1 — Web app (Next.js on port 3000)
npm run dev:web

# Terminal 2 — Worker (background job processor)
npm run dev:worker
```

### 5. Open the app

- Dashboard: http://localhost:3000/dashboard
- Review flow: http://localhost:3000/review/demo

---

## Tech Stack

| Layer       | Technology                     |
|-------------|--------------------------------|
| Frontend    | Next.js 15, React 19, Tailwind |
| Backend     | Node.js, TypeScript            |
| Database    | PostgreSQL via Supabase        |
| ORM         | Drizzle ORM                    |
| Jobs        | BullMQ + Redis                 |
| Scraping    | Apify                          |
| AI          | OpenAI (GPT-4o-mini)           |
| Hosting     | Vercel (web), TBD (worker)     |

---

## Scripts

| Command              | Description                        |
|----------------------|------------------------------------|
| `npm run dev:web`    | Start Next.js dev server           |
| `npm run dev:worker` | Start worker with hot reload       |
| `npm run build:web`  | Production build of web app        |
| `npm run db:push`    | Push schema changes to database    |
| `npm run db:generate`| Generate migration files           |
| `npm run db:migrate` | Run pending migrations             |
| `npm run lint`       | Lint all TypeScript files          |
| `npm run format`     | Format code with Prettier          |

---

## Phases

**Phase 1 — Intelligence Engine** (Weeks 1–3)
Scrape → Store → Analyze → Benchmark

**Phase 2 — Reputation Product** (Weeks 4–6)
Capture → Route → Manage → Grow

---

## License

Private — All rights reserved.
