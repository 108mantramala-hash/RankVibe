import { scrapeAreaBusinesses } from '../../../../services/bulk-scraper';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET() {
  console.log('[api/scrape/north-york] Starting bulk scrape for North York barbershops');

  try {
    // 1. Scrape businesses and reviews
    console.log('[api/scrape/north-york] Scraping businesses...');
    const result = await scrapeAreaBusinesses(
      'North York, Ontario, Canada',
      'barbershops',
      50, // max businesses
      100 // max reviews per business
    );

    console.log(`[api/scrape/north-york] Found ${result.totalBusinesses} businesses`);

    let businessesSaved = 0;
    let reviewsProcessed = 0;

    // 2. Save each business and its reviews
    for (const business of result.businesses) {
      try {
        console.log(`[api/scrape/north-york] Processing business: ${business.title}`);

        // Check if business already exists
        const { data: existingBusiness } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('google_place_id', business.placeId)
          .single();

        let businessId: string;

        if (existingBusiness) {
          console.log(`[api/scrape/north-york] Business ${business.title} already exists, skipping`);
          businessId = existingBusiness.id;
        } else {
          // Insert new business
          const businessData = {
            google_place_id: business.placeId,
            name: business.title,
            address: business.address,
            city: 'North York',
            state: 'Ontario',
            zip: '', // Will be extracted from address if needed
            latitude: 0, // Will be geocoded later if needed
            longitude: 0,
            phone: business.phone || null,
            website: business.website || null,
            google_rating: business.rating || null,
            google_review_count: business.reviewsCount || 0,
            avg_rating: business.rating || null,
            review_count: business.reviews?.length || 0,
            is_tracked: true,
            is_customer: false,
            scraped_at: new Date().toISOString(),
          };

          const { data: newBusiness, error: businessError } = await supabaseAdmin
            .from('businesses')
            .insert(businessData)
            .select('id')
            .single();

          if (businessError) {
            console.error(`[api/scrape/north-york] Error saving business ${business.title}:`, businessError);
            continue;
          }

          businessId = newBusiness.id;
          businessesSaved++;
          console.log(`[api/scrape/north-york] Saved business: ${business.title}`);
        }

        // 3. Save reviews for this business
        if (business.reviews && business.reviews.length > 0) {
          console.log(`[api/scrape/north-york] Processing ${business.reviews.length} reviews for ${business.title}`);

          for (const review of business.reviews) {
            try {
              // Check if review already exists (by author + business + text)
              const { data: existingReview } = await supabaseAdmin
                .from('reviews')
                .select('id')
                .eq('business_id', businessId)
                .eq('author_name', review.name)
                .eq('text', review.text || '')
                .single();

              if (existingReview) {
                console.log(`[api/scrape/north-york] Review by ${review.name} already exists, skipping`);
                continue;
              }

              // Insert new review (sentiment will be added later by enrichment)
              const reviewData = {
                business_id: businessId,
                google_review_id: `bulk_${business.placeId}_${review.name}_${Date.now()}`, // Generate unique ID
                author_name: review.name,
                rating: review.stars,
                text: review.text || null,
                published_at: review.publishedAtDate,
                sentiment: null, // Will be enriched later
                sentiment_score: null,
                themes: null,
                ai_reply_suggestion: null,
              };

              const { error: reviewError } = await supabaseAdmin
                .from('reviews')
                .insert(reviewData);

              if (reviewError) {
                console.error(`[api/scrape/north-york] Error saving review by ${review.name}:`, reviewError);
              } else {
                reviewsProcessed++;
              }

            } catch (reviewError) {
              console.error(`[api/scrape/north-york] Error processing review by ${review.name}:`, reviewError);
            }
          }
        }

      } catch (businessError) {
        console.error(`[api/scrape/north-york] Error processing business ${business.title}:`, businessError);
      }
    }

    console.log(`[api/scrape/north-york] Completed! Saved ${businessesSaved} businesses, processed ${reviewsProcessed} reviews`);

    return Response.json({
      success: true,
      businessesFound: result.totalBusinesses,
      businessesSaved,
      reviewsProcessed,
      message: `Successfully scraped ${result.totalBusinesses} barbershops in North York, saved ${businessesSaved} new businesses and ${reviewsProcessed} reviews`,
    });

  } catch (error) {
    console.error('[api/scrape/north-york] Error:', error);
    return Response.json(
      { error: 'Bulk scrape failed', details: String(error) },
      { status: 500 }
    );
  }
}