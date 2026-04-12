import { Job } from 'bullmq';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';
import { enrichQueue } from '../index.js';

interface ScrapeJobData {
  businessId: string;
  googlePlaceId: string;
  maxReviews?: number;
}

const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'compass5~google-maps-reviews-scraper';

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function handleScrapeJob(job: Job<ScrapeJobData>) {
  const { businessId, googlePlaceId, maxReviews = 100 } = job.data;
  const supabase = getSupabase();

  console.info(`[scrape] Starting for business ${businessId} (place: ${googlePlaceId})`);
  await job.updateProgress(5);

  // 1. Run Apify scraper
  const run = await apify.actor(APIFY_ACTOR_ID).call({
    startUrls: [{ url: `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}` }],
    maxReviews,
    language: 'en',
  });

  await job.updateProgress(40);

  // 2. Fetch results
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  console.info(`[scrape] Fetched ${items.length} items for business ${businessId}`);

  // 3. Normalize — handle both flat review array and nested reviews field
  const firstItem = items[0] as Record<string, unknown> | undefined;
  const nestedReviews = firstItem && Array.isArray(firstItem.reviews) ? firstItem.reviews : null;
  const reviewSource = (nestedReviews ?? items) as Record<string, unknown>[];

  await job.updateProgress(50);

  // 4. Insert reviews into Supabase (skip duplicates)
  let inserted = 0;
  let skipped = 0;

  for (const item of reviewSource) {
    const reviewId = item.reviewId as string;
    if (!reviewId) continue;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('google_review_id', reviewId)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const reviewText = (item.text as string) || (item.textTranslated as string) || null;
    let publishedAt: string | null = null;
    const dateStr = (item.publishedAtDate as string) || (item.publishedAt as string);
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) publishedAt = d.toISOString();
    }

    const { error } = await supabase.from('reviews').insert({
      business_id: businessId,
      google_review_id: reviewId,
      author_name: (item.name as string) || 'Anonymous',
      rating: (item.stars as number) || 0,
      text: reviewText,
      published_at: publishedAt,
      raw_data: item,
    });

    if (error) {
      console.error(`[scrape] Failed to insert review ${reviewId}:`, error.message);
    } else {
      inserted++;
    }
  }

  await job.updateProgress(80);

  console.info(`[scrape] ${inserted} inserted, ${skipped} skipped for business ${businessId}`);

  // 5. Queue enrichment for new reviews
  if (inserted > 0) {
    const newReviewIds = reviewSource
      .map((r) => r.reviewId as string)
      .filter(Boolean);

    await enrichQueue.add('enrich-reviews', {
      businessId,
      reviewIds: newReviewIds,
    });
  }

  await job.updateProgress(100);

  return { inserted, skipped };
}
