import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeNorthYorkBarbershops } from '@/services/bulk-scraper';
import { checkAdminAuth } from '@/lib/admin-auth';

export const maxDuration = 300; // 5 minutes for scraping

export async function GET(req: NextRequest) {
  const denied = checkAdminAuth(req);
  if (denied) return denied;
  try {
    console.log('\n========================================');
    console.log('🚀 NORTH YORK BARBERSHOP BULK SCRAPE');
    console.log('========================================\n');

    const startTime = Date.now();

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Run bulk scraper
    const scrapedData = await scrapeNorthYorkBarbershops();

    let businessesCreated = 0;
    let businessesUpdated = 0;
    let reviewsInserted = 0;
    let reviewsSkipped = 0;

    // Step 2: Upsert businesses and insert reviews
    for (const item of scrapedData) {
      const { business, reviews: scrapedReviews } = item;

      try {
        // Check if business exists
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('google_place_id', business.googlePlaceId)
          .limit(1)
          .single();

        let businessId: string;

        if (existingBusiness) {
          // Update existing
          businessId = existingBusiness.id;
          await supabase
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

          businessesUpdated++;
          console.log(`  📝 Updated: ${business.name}`);
        } else {
          // Insert new
          const { data: newBusiness } = await supabase
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
              category: 'barbershop',
              is_tracked: false,
              is_customer: false,
            })
            .select('id')
            .single();

          businessId = newBusiness!.id;
          businessesCreated++;
          console.log(`  ✨ Created: ${business.name}`);
        }

        // Insert reviews for this business
        for (const review of scrapedReviews) {
          try {
            // Check if review already exists
            const { data: existingReview } = await supabase
              .from('reviews')
              .select('id')
              .eq('google_review_id', review.googleReviewId)
              .limit(1)
              .single();

            if (existingReview) {
              reviewsSkipped++;
              continue;
            }

            // Parse published date
            let publishedAt: string | null = null;
            if (review.publishedAt) {
              const parsed = new Date(review.publishedAt);
              if (!isNaN(parsed.getTime())) {
                publishedAt = parsed.toISOString();
              }
            }

            // Insert review
            await supabase.from('reviews').insert({
              business_id: businessId,
              google_review_id: review.googleReviewId,
              author_name: review.authorName,
              rating: review.rating,
              text: review.text || null,
              published_at: publishedAt,
              raw_data: review.rawData,
            });

            reviewsInserted++;
          } catch (err) {
            console.error(`    ✗ Error inserting review by ${review.authorName}:`, err);
            // Continue to next review
          }
        }
      } catch (err) {
        console.error(`  ✗ Error processing business ${business.name}:`, err);
        // Continue to next business
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Step 3: Return summary
    const summary = {
      status: 'success',
      duration: `${duration}s`,
      businesses: {
        created: businessesCreated,
        updated: businessesUpdated,
        total: businessesCreated + businessesUpdated,
      },
      reviews: {
        inserted: reviewsInserted,
        skipped: reviewsSkipped,
        total: reviewsInserted + reviewsSkipped,
      },
    };

    console.log('\n📊 SCRAPE SUMMARY');
    console.log('─────────────────────────────');
    console.log(`✨ Businesses created: ${businessesCreated}`);
    console.log(`📝 Businesses updated: ${businessesUpdated}`);
    console.log(`📄 Reviews inserted: ${reviewsInserted}`);
    console.log(`⏭️  Reviews skipped: ${reviewsSkipped}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('────────────────────────────\n');

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Scrape failed:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
