import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { analyzeReview } from '../../../services/ai-analyzer';

export async function POST() {
  console.log('[api/enrich] Starting AI enrichment for reviews without sentiment analysis');

  try {
    // 1. Find all reviews where sentiment is null
    const { data: reviewsToEnrich, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('id, text, rating, author_name')
      .is('sentiment', null)
      .not('text', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[api/enrich] Found ${reviewsToEnrich?.length || 0} reviews to enrich`);

    if (!reviewsToEnrich || reviewsToEnrich.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: 0,
        message: 'No reviews found that need enrichment',
      });
    }

    let enrichedCount = 0;

    // 2. Process each review with AI analysis
    for (const review of reviewsToEnrich) {
      try {
        console.log(`[api/enrich] Analyzing review by ${review.author_name} (ID: ${review.id})`);

        // Run AI analysis
        const analysis = await analyzeReview(review.text!, review.rating);

        // Update the review with AI results
        const { error: updateError } = await supabaseAdmin
          .from('reviews')
          .update({
            sentiment: analysis.sentiment,
            sentiment_score: analysis.score,
            themes: analysis.themes,
            ai_reply_suggestion: analysis.replySuggestion,
          })
          .eq('id', review.id);

        if (updateError) {
          console.error(`[api/enrich] Error updating review ${review.id}:`, updateError);
        } else {
          enrichedCount++;
          console.log(`[api/enrich] Successfully enriched review ${review.id}`);
        }

        // Rate limiting: 500ms delay between OpenAI calls
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (reviewError) {
        console.error(`[api/enrich] Error processing review ${review.id}:`, reviewError);
        // Continue to next review
      }
    }

    console.log(`[api/enrich] Completed! Enriched ${enrichedCount} reviews`);

    return NextResponse.json({
      success: true,
      enriched: enrichedCount,
      message: `Successfully enriched ${enrichedCount} reviews with AI analysis`,
    });

  } catch (error) {
    console.error('[api/enrich] Error:', error);
    return NextResponse.json(
      { error: 'Enrichment failed', details: String(error) },
      { status: 500 }
    );
  }
}