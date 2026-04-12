import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeGoogleMapsPlaceByUrl } from '@/services/bulk-scraper';

export const maxDuration = 300;

interface ScrapePlaceRequestBody {
  url?: string;
  maxReviews?: number;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScrapePlaceRequestBody;
    const url = body.url?.trim();
    const maxReviews = Math.min(Math.max(body.maxReviews ?? 100, 1), 1000);
    const category = body.category?.trim() || 'barbershop';

    if (!url) {
      return NextResponse.json({ status: 'error', message: 'Missing `url` in request body' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { business, reviews } = await scrapeGoogleMapsPlaceByUrl(url, { maxReviews });

    if (!business.googlePlaceId) {
      return NextResponse.json(
        { status: 'error', message: 'Resolved business is missing a Google place ID' },
        { status: 422 }
      );
    }

    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('google_place_id', business.googlePlaceId)
      .maybeSingle();

    let businessId: string;
    let action: 'created' | 'updated';

    if (existingBusiness) {
      businessId = existingBusiness.id;
      action = 'updated';

      const { error } = await supabase
        .from('businesses')
        .update({
          name: business.name,
          address: business.address,
          city: business.city,
          state: business.state,
          zip: business.zip,
          latitude: business.latitude,
          longitude: business.longitude,
          phone: business.phone,
          website: business.website,
          google_rating: business.googleRating,
          google_review_count: business.googleReviewCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) {
        throw error;
      }
    } else {
      action = 'created';

      const { data: createdBusiness, error } = await supabase
        .from('businesses')
        .insert({
          name: business.name,
          google_place_id: business.googlePlaceId,
          address: business.address,
          city: business.city,
          state: business.state,
          zip: business.zip,
          latitude: business.latitude,
          longitude: business.longitude,
          phone: business.phone,
          website: business.website,
          google_rating: business.googleRating,
          google_review_count: business.googleReviewCount,
          category,
          is_tracked: false,
          is_customer: false,
        })
        .select('id')
        .single();

      if (error || !createdBusiness) {
        throw error ?? new Error('Failed to create business');
      }

      businessId = createdBusiness.id;
    }

    let reviewsInserted = 0;
    let reviewsSkipped = 0;

    for (const review of reviews) {
      const { data: existingReview, error: lookupError } = await supabase
        .from('reviews')
        .select('id')
        .eq('google_review_id', review.googleReviewId)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existingReview) {
        reviewsSkipped++;
        continue;
      }

      let publishedAt: string | null = null;
      if (review.publishedAt) {
        const parsedDate = new Date(review.publishedAt);
        if (!Number.isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }

      const { error } = await supabase.from('reviews').insert({
        business_id: businessId,
        google_review_id: review.googleReviewId,
        author_name: review.authorName,
        rating: review.rating,
        text: review.text ?? null,
        published_at: publishedAt,
        raw_data: review.rawData,
      });

      if (error) {
        throw error;
      }

      reviewsInserted++;
    }

    return NextResponse.json({
      status: 'success',
      business: {
        id: businessId,
        name: business.name,
        googlePlaceId: business.googlePlaceId,
        action,
      },
      reviews: {
        inserted: reviewsInserted,
        skipped: reviewsSkipped,
        totalFetched: reviews.length,
      },
      sourceUrl: url,
    });
  } catch (error) {
    console.error('Single-place scrape failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
