import { apifyClient } from '../lib/apify';

const GOOGLE_MAPS_REVIEWS_ACTOR = 'Xb8osYTtOjlsgI6k9';

export interface ScrapedReview {
  reviewId?: string;
  author?: string;
  rating?: number;
  text?: string;
  publishedAt?: string;
  raw?: Record<string, unknown>;
}

export interface ScrapedBusiness {
  businessName?: string;
  address?: string;
  rating?: number;
  reviewCount: number;
  reviews: ScrapedReview[];
}

export async function scrapeBusinessReviews(
  googleMapsUrl: string,
): Promise<ScrapedBusiness> {
  const actor = apifyClient.actor(GOOGLE_MAPS_REVIEWS_ACTOR);

  const run = await actor.call({
    startUrls: [{ url: googleMapsUrl }],
    maxReviews: 50,
    language: 'en',
  });

  const { items } = await apifyClient
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 50 });

  const reviews = (items ?? []).map((item: any) => ({
    reviewId: item.reviewId as string,
    author: item.name as string,
    rating: typeof item.stars === 'number' ? item.stars : Number(item.stars),
    text: item.text as string,
    publishedAt: item.publishedAtDate as string,
    raw: item as Record<string, unknown>,
  }));

  const businessName: string | undefined =
    items?.find((item: any) => item.placeName || item.name)?.placeName ||
    items?.[0]?.placeName ||
    items?.[0]?.name ||
    undefined;

  const address: string | undefined =
    items?.find((item: any) => item.address || item.placeAddress)?.address ||
    items?.[0]?.address ||
    items?.[0]?.placeAddress ||
    undefined;

  const rating =
    items?.find((item: any) => item.stars || item.rating)?.stars ||
    items?.[0]?.stars ||
    undefined;

  return {
    businessName,
    address,
    rating: rating ? Number(rating) : undefined,
    reviewCount: reviews.length,
    reviews,
  };
}
