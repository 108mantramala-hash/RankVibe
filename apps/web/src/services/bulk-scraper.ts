import { processBusinessReviews } from './pipeline';

export interface BulkBusiness {
  placeId: string;
  title: string;
  address: string;
  rating?: number;
  reviewsCount?: number;
  phone?: string;
  website?: string;
  reviews?: BulkReview[];
}

export interface BulkReview {
  name: string;
  stars: number;
  text?: string;
  publishedAtDate: string;
}

export interface BulkScrapeResult {
  businesses: BulkBusiness[];
  totalBusinesses: number;
}

// Known Google Maps URLs for barbershops in North York, Ontario
const NORTH_YORK_BARBERSHOP_URLS = [
  'https://maps.app.goo.gl/T8dXoFxB4V3BFw166', // Real URL from user
  // Add more real URLs here when available
];

export async function scrapeAreaBusinesses(
  location: string,
  category: string,
  maxBusinesses: number = 50,
  maxReviewsPerBusiness: number = 100
): Promise<BulkScrapeResult> {
  console.log(`[bulk-scraper] Starting bulk scrape for "${category}" in "${location}"`);
  console.log(`[bulk-scraper] Using ${NORTH_YORK_BARBERSHOP_URLS.length} known URLs`);

  const businesses: BulkBusiness[] = [];

  // For demonstration, we'll use the known URLs
  // In production, you'd implement URL discovery
  const urlsToScrape = NORTH_YORK_BARBERSHOP_URLS.slice(0, maxBusinesses);

  for (const url of urlsToScrape) {
    try {
      console.log(`[bulk-scraper] Processing business from URL: ${url}`);

      // Use the working pipeline that saves to database
      const result = await processBusinessReviews(url);

      console.log(`[bulk-scraper] Pipeline completed for: ${result.businessName}`);

      // Create a summary business object (data is already saved to DB)
      const business: BulkBusiness = {
        placeId: result.businessId,
        title: result.businessName,
        address: '', // Would need to fetch from DB
        rating: undefined, // Would need to fetch from DB
        reviewsCount: result.reviewCount,
        phone: undefined,
        website: undefined,
        reviews: [], // Reviews are saved to DB, not returned
      };

      businesses.push(business);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`[bulk-scraper] Error processing URL ${url}:`, error);
      // Continue to next URL
    }
  }

  console.log(`[bulk-scraper] Completed! Scraped ${businesses.length} businesses`);

  return {
    businesses,
    totalBusinesses: businesses.length,
  };
}