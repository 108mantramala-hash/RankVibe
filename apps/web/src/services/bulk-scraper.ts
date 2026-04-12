interface ScrapedBusiness {
  name: string;
  googlePlaceId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  googleRating?: number;
  googleReviewCount?: number;
}

interface ScrapedReview {
  googleReviewId: string;
  authorName: string;
  rating: number;
  text?: string;
  publishedAt?: string;
  rawData: Record<string, unknown>;
}

interface BulkScrapeResult {
  business: ScrapedBusiness;
  reviews: ScrapedReview[];
}

const APIFY_REVIEWS_ACTOR_ID = 'nwua9Gu5YrADL7ZDj';

async function resolveGoogleMapsUrl(inputUrl: string): Promise<string> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new Error('Invalid Google Maps URL');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isShortMapsUrl = hostname === 'maps.app.goo.gl';
  const isGoogleMapsUrl = hostname.endsWith('google.com') && parsedUrl.pathname.startsWith('/maps');

  if (!isShortMapsUrl && !isGoogleMapsUrl) {
    throw new Error('URL must be a Google Maps place link');
  }

  const response = await fetch(inputUrl, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'user-agent': 'RankVibeBot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve Google Maps URL (${response.status})`);
  }

  return response.url;
}

async function runApifyGoogleMapsReviewsScrape(startUrl: string, maxReviews: number): Promise<Record<string, unknown>[]> {
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN not set');
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_REVIEWS_ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: startUrl }],
        maxReviews,
        language: 'en',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify scrape failed (${response.status}): ${errorText}`);
  }

  const items = (await response.json()) as Record<string, unknown>[];
  return Array.isArray(items) ? items : [];
}

function normalizePlaceRecords(items: Record<string, unknown>[]): BulkScrapeResult {
  const [firstItem] = items;
  const location = ((firstItem?.location ?? {}) as Record<string, unknown>) || {};
  const address = typeof firstItem?.address === 'string' ? firstItem.address : '';
  const nestedReviews = Array.isArray(firstItem?.reviews) ? firstItem.reviews : null;
  const reviewSource = nestedReviews ?? items;

  const business: ScrapedBusiness = {
    name: typeof firstItem?.title === 'string' ? firstItem.title : 'Unknown business',
    googlePlaceId: typeof firstItem?.placeId === 'string' ? firstItem.placeId : '',
    address,
    city: typeof firstItem?.city === 'string' ? firstItem.city : '',
    state: typeof firstItem?.state === 'string' ? firstItem.state : '',
    zip: typeof firstItem?.postalCode === 'string' ? firstItem.postalCode : '',
    latitude: typeof location.lat === 'number' ? location.lat : 0,
    longitude: typeof location.lng === 'number' ? location.lng : 0,
    phone: typeof firstItem?.phone === 'string' ? firstItem.phone : undefined,
    website: typeof firstItem?.website === 'string' ? firstItem.website : undefined,
    googleRating: typeof firstItem?.totalScore === 'number' ? firstItem.totalScore : undefined,
    googleReviewCount:
      typeof firstItem?.reviewsCount === 'number'
        ? firstItem.reviewsCount
        : typeof firstItem?.reviewCount === 'number'
          ? firstItem.reviewCount
          : undefined,
  };

  const normalizedReviews: ScrapedReview[] = reviewSource
    .filter((review): review is Record<string, unknown> => Boolean(review && typeof review === 'object'))
    .map((review, index) => ({
      googleReviewId:
        typeof review.reviewId === 'string'
          ? review.reviewId
          : `${business.googlePlaceId || business.name}-review-${index}`,
      authorName: typeof review.name === 'string' ? review.name : 'Anonymous',
      rating: typeof review.stars === 'number' ? review.stars : 0,
      text: typeof review.text === 'string' ? review.text : undefined,
      publishedAt:
        typeof review.publishedAtDate === 'string'
          ? review.publishedAtDate
          : typeof review.publishedAt === 'string'
            ? review.publishedAt
            : typeof review.publishAt === 'string'
              ? review.publishAt
            : undefined,
      rawData: review,
    }));

  return {
    business,
    reviews: normalizedReviews,
  };
}

export async function scrapeGoogleMapsPlaceByUrl(
  googleMapsUrl: string,
  options?: { maxReviews?: number }
): Promise<BulkScrapeResult> {
  const resolvedUrl = await resolveGoogleMapsUrl(googleMapsUrl);
  const items = await runApifyGoogleMapsReviewsScrape(resolvedUrl, options?.maxReviews ?? 100);

  if (items.length === 0) {
    throw new Error('No data returned from Apify for this Google Maps URL');
  }

  return normalizePlaceRecords(items);
}

/**
 * Scrapes barbershops in North York, Ontario, Canada
 * Uses Apify API directly (REST) instead of SDK to avoid webpack bundling issues
 */
export async function scrapeNorthYorkBarbershops(): Promise<BulkScrapeResult[]> {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN not set');
  }

  console.log('🔍 Starting bulk scrape of North York barbershops...');

  const results: BulkScrapeResult[] = [];

  try {
    // MOCK DATA FOR TESTING — Replace with real Apify call once actor ID is confirmed
    console.log('📍 Using MOCK DATA for testing (replace with real Apify actor)...');

    const mockBusinesses = [
      {
        id: 'place_1',
        title: 'Sharp Cuts Barbershop',
        address: '123 Yonge St, North York, ON M2N 5Z9',
        postalCode: 'M2N 5Z9',
        phone: '(416) 555-0001',
        website: 'https://sharpcuts.ca',
        rating: 4.8,
        reviewCount: 42,
        location: { lat: 43.7645, lng: -79.4138 },
        reviews: [
          {
            id: 'review_1',
            name: 'John Doe',
            rating: 5,
            text: 'Best haircut in North York! Highly recommend.',
            reviewDate: '2024-04-01',
          },
          {
            id: 'review_2',
            name: 'Jane Smith',
            rating: 5,
            text: 'Great service and friendly staff. Will be back!',
            reviewDate: '2024-03-28',
          },
        ],
      },
      {
        id: 'place_2',
        title: 'Precision Fade Barbershop',
        address: '456 Dundas St, North York, ON M5T 1G5',
        postalCode: 'M5T 1G5',
        phone: '(416) 555-0002',
        website: 'https://precisionfade.ca',
        rating: 4.6,
        reviewCount: 38,
        location: { lat: 43.6629, lng: -79.4019 },
        reviews: [
          {
            id: 'review_3',
            name: 'Mike Johnson',
            rating: 4,
            text: 'Good cuts, reasonable prices.',
            reviewDate: '2024-03-25',
          },
          {
            id: 'review_4',
            name: 'Alex Chen',
            rating: 5,
            text: 'Professional and fast service!',
            reviewDate: '2024-03-20',
          },
        ],
      },
      {
        id: 'place_3',
        title: 'Gentleman\'s Grooming Barber',
        address: '789 Bathurst St, North York, ON M5S 2R4',
        postalCode: 'M5S 2R4',
        phone: '(416) 555-0003',
        rating: 4.5,
        reviewCount: 25,
        location: { lat: 43.6732, lng: -79.4054 },
        reviews: [
          {
            id: 'review_5',
            name: 'Robert Wilson',
            rating: 5,
            text: 'Amazing atmosphere and great barber.',
            reviewDate: '2024-03-15',
          },
          {
            id: 'review_6',
            name: 'David Lee',
            rating: 4,
            text: 'Good experience, will visit again.',
            reviewDate: '2024-03-10',
          },
        ],
      },
    ];

    console.log(`✅ Found ${mockBusinesses.length} mock barbershops`);

    // Process mock businesses
    for (const business of mockBusinesses) {
      try {
        const businessData: ScrapedBusiness = {
          name: business.title as string,
          googlePlaceId: business.id as string,
          address: business.address as string,
          city: 'North York',
          state: 'ON',
          zip: business.postalCode as string,
          latitude: (business.location as any).lat,
          longitude: (business.location as any).lng,
          phone: business.phone as string | undefined,
          website: (business.website || undefined) as string | undefined,
          googleRating: business.rating,
          googleReviewCount: business.reviewCount,
        };

        // Get reviews for this business
        const reviews: ScrapedReview[] = [];

        if (business.reviews && Array.isArray(business.reviews)) {
          for (const review of business.reviews) {
            reviews.push({
              googleReviewId: review.id as string,
              authorName: review.name as string,
              rating: review.rating as number,
              text: review.text as string | undefined,
              publishedAt: review.reviewDate,
              rawData: review,
            });
          }
        }

        results.push({
          business: businessData,
          reviews,
        });

        console.log(`  ✓ ${businessData.name} (${reviews.length} reviews)`);
      } catch (err) {
        console.error(`  ✗ Error processing business:`, err);
      }
    }

    console.log(`\n✅ Scrape complete: ${results.length} businesses, ${results.reduce((sum, r) => sum + r.reviews.length, 0)} total reviews`);

    return results;
  } catch (error) {
    console.error('❌ Scrape failed:', error);
    throw error;
  }
}
