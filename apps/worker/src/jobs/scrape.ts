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
  const run = await apify.actor('nwua9Gu5YrADL7ZDj').call({
    startUrls: [{ url: `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}` }],
    maxReviews,
    language: 'en',
  });

  // 2. Fetch results from the dataset
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  console.info(`[scrape] Fetched ${items.length} reviews for business ${businessId}`);

  // 3. Normalize and store reviews
  const firstItem = items[0] as Record<string, unknown> | undefined;
  const nestedReviews = firstItem && Array.isArray(firstItem.reviews) ? firstItem.reviews : null;
  const reviewSource = (nestedReviews ?? items) as Record<string, unknown>[];

  const reviews = reviewSource.map((item: Record<string, unknown>, index: number) => ({
    business_id: businessId,
    google_review_id: (item.reviewId as string) || `${googlePlaceId}-review-${index}`,
    author_name: (item.name as string) || 'Anonymous',
    rating: (item.stars as number) || 0,
    text: item.text as string,
    published_at: (item.publishedAtDate as string) || (item.publishedAt as string) || null,
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
