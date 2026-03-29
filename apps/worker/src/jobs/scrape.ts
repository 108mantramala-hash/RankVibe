import { Job } from 'bullmq';
import { ApifyClient } from 'apify-client';
import { enrichQueue } from '../index.js';

interface ScrapeJobData {
  businessId: string;
  googlePlaceId: string;
  maxReviews?: number;
}

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

export async function handleScrapeJob(job: Job<ScrapeJobData>) {
  const { businessId, googlePlaceId, maxReviews = 100 } = job.data;

  console.info(`[scrape] Starting for business ${businessId} (place: ${googlePlaceId})`);

  // 1. Run Apify Google Maps Reviews scraper
  const run = await apify.actor('Xb8osYTtOjlsgI6k9').call({
    startUrls: [{ url: `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}` }],
    maxReviews,
    language: 'en',
  });

  // 2. Fetch results from the dataset
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  console.info(`[scrape] Fetched ${items.length} reviews for business ${businessId}`);

  // 3. Normalize and store reviews
  const reviews = items.map((item: Record<string, unknown>) => ({
    business_id: businessId,
    google_review_id: item.reviewId as string,
    author_name: item.name as string,
    rating: item.stars as number,
    text: item.text as string,
    published_at: item.publishedAtDate as string,
    raw_data: item,
  }));

  // TODO: Batch upsert into Supabase via @rankvibe/db
  // await db.reviews.upsertMany(reviews);

  await job.updateProgress(80);

  // 4. Queue AI enrichment for new reviews
  await enrichQueue.add('enrich-reviews', {
    businessId,
    reviewIds: reviews.map((r) => r.google_review_id),
  });

  return { reviewCount: reviews.length };
}
