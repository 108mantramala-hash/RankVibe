import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { handleScrapeJob } from './jobs/scrape.js';
import { handleEnrichJob } from './jobs/enrich.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ── Queues ──────────────────────────────────────────────
export const scrapeQueue = new Queue('scrape-reviews', { connection });
export const enrichQueue = new Queue('ai-enrich', { connection });

// ── Workers ─────────────────────────────────────────────
const scrapeWorker = new Worker('scrape-reviews', handleScrapeJob, {
  connection,
  concurrency: 3,
});

const enrichWorker = new Worker('ai-enrich', handleEnrichJob, {
  connection,
  concurrency: 2,
});

// ── Logging ─────────────────────────────────────────────
scrapeWorker.on('completed', (job) => {
  console.info(`[scrape] ✓ completed: ${job.id}`);
});

scrapeWorker.on('failed', (job, err) => {
  console.error(`[scrape] ✗ failed: ${job?.id}`, err.message);
});

enrichWorker.on('completed', (job) => {
  console.info(`[enrich] ✓ completed: ${job.id}`);
});

enrichWorker.on('failed', (job, err) => {
  console.error(`[enrich] ✗ failed: ${job?.id}`, err.message);
});

console.info('🚀 RankVibe worker started — listening for jobs');
