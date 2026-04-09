import { supabaseAdmin } from '../lib/supabase';
import { scrapeBusinessReviews, ScrapedBusiness } from './scraper';
import { analyzeReview, ReviewAnalysis } from './ai-analyzer';

export interface PipelineResult {
  businessName: string;
  reviewCount: number;
  avgSentiment: 'positive' | 'negative' | 'neutral';
  businessId: string;
}

export async function processBusinessReviews(googleMapsUrl: string): Promise<PipelineResult> {
  console.log(`[pipeline] Starting pipeline for: ${googleMapsUrl}`);

  // 1. Scrape reviews via Apify
  console.log(`[pipeline] Scraping reviews...`);
  const scrapedData = await scrapeBusinessReviews(googleMapsUrl);
  console.log(`[pipeline] Scraped ${scrapedData.reviewCount} reviews for "${scrapedData.businessName}"`);

  // 2. Extract business info from first review's raw data
  const firstReview = scrapedData.reviews[0];
  const rawData = firstReview?.raw as any;

  // Extract business details from the raw data
  const businessData = {
    name: scrapedData.businessName || rawData?.title || 'Unknown Business',
    google_place_id: rawData?.placeId || `place_${Date.now()}`,
    category: 'barbershop' as const,
    address: scrapedData.address || rawData?.address || '',
    city: rawData?.city || '',
    state: rawData?.state || '',
    zip: rawData?.postalCode || '',
    latitude: rawData?.location?.lat || 0,
    longitude: rawData?.location?.lng || 0,
    phone: rawData?.phone || null,
    website: rawData?.website || null,
    google_rating: rawData?.totalScore || null,
    google_review_count: rawData?.reviewsCount || scrapedData.reviewCount,
    is_tracked: true,
    is_customer: true,
  };

  // 3. Save business to Supabase (upsert based on google_place_id)
  console.log(`[pipeline] Saving business to database...`);
  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .upsert(businessData, { onConflict: 'google_place_id' })
    .select('id, name')
    .single();

  if (businessError) {
    throw new Error(`Failed to save business: ${businessError.message}`);
  }

  console.log(`[pipeline] Business saved with ID: ${business.id}`);

  // 4. Process each review with AI analysis
  console.log(`[pipeline] Processing ${scrapedData.reviews.length} reviews with AI...`);

  const reviewInserts = [];
  let sentimentScores = { positive: 0, negative: 0, neutral: 0 };

  for (const scrapedReview of scrapedData.reviews) {
    try {
      // Run AI analysis
      const analysis = await analyzeReview(scrapedReview.text || '');

      // Track sentiment for average calculation
      sentimentScores[analysis.sentiment]++;

      // Prepare review data for database
      const reviewData = {
        business_id: business.id,
        google_review_id: scrapedReview.reviewId || `review_${Date.now()}_${Math.random()}`,
        author_name: scrapedReview.author || 'Anonymous',
        rating: scrapedReview.rating || 5,
        text: scrapedReview.text,
        published_at: scrapedReview.publishedAt ? new Date(scrapedReview.publishedAt).toISOString() : null,
        sentiment: analysis.sentiment,
        themes: analysis.themes,
        raw_data: scrapedReview.raw,
      };

      reviewInserts.push(reviewData);
    } catch (error) {
      console.error(`[pipeline] Failed to analyze review:`, error);
      // Still save the review without analysis
      const reviewData = {
        business_id: business.id,
        google_review_id: scrapedReview.reviewId || `review_${Date.now()}_${Math.random()}`,
        author_name: scrapedReview.author || 'Anonymous',
        rating: scrapedReview.rating || 5,
        text: scrapedReview.text,
        published_at: scrapedReview.publishedAt ? new Date(scrapedReview.publishedAt).toISOString() : null,
        sentiment: null,
        themes: [],
        raw_data: scrapedReview.raw,
      };
      reviewInserts.push(reviewData);
    }
  }

  // 5. Batch insert reviews
  console.log(`[pipeline] Saving ${reviewInserts.length} reviews to database...`);
  const { error: reviewsError } = await supabaseAdmin
    .from('reviews')
    .upsert(reviewInserts, { onConflict: 'google_review_id' });

  if (reviewsError) {
    throw new Error(`Failed to save reviews: ${reviewsError.message}`);
  }

  // 6. Calculate average sentiment
  const totalReviews = scrapedData.reviews.length;
  const avgSentiment = sentimentScores.positive > sentimentScores.negative
    ? 'positive'
    : sentimentScores.negative > sentimentScores.positive
    ? 'negative'
    : 'neutral';

  console.log(`[pipeline] Pipeline complete! ${totalReviews} reviews processed, avg sentiment: ${avgSentiment}`);

  return {
    businessName: business.name,
    reviewCount: totalReviews,
    avgSentiment,
    businessId: business.id,
  };
}
