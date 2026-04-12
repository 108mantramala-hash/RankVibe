import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 minutes for enrichment

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a review analysis engine for local businesses.
Given a customer review, extract:
1. sentiment: "positive", "negative", or "neutral"
2. sentiment_score: a number from 0 to 1 (0 = very negative, 1 = very positive)
3. themes: array of short theme tags (e.g., "wait time", "fade quality", "friendly staff", "cleanliness", "pricing", "location", "parking", etc)
4. ai_reply_suggestion: a professional, concise reply suggestion (1-2 sentences) for the business owner

Respond in JSON only:
{"sentiment": "...", "sentiment_score": ..., "themes": [...], "ai_reply_suggestion": "..."}`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  themes: string[];
  ai_reply_suggestion: string;
}

async function analyzeReview(reviewText: string): Promise<AnalysisResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: reviewText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    sentiment: parsed.sentiment as 'positive' | 'negative' | 'neutral',
    sentiment_score: parseFloat(parsed.sentiment_score) || 0.5,
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    ai_reply_suggestion: parsed.ai_reply_suggestion || '',
  };
}

export async function GET() {
  try {
    console.log('\n========================================');
    console.log('🤖 ENRICHMENT PIPELINE');
    console.log('========================================\n');

    const startTime = Date.now();

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all reviews with NULL sentiment
    const { data: unenrichedReviews } = await supabase
      .from('reviews')
      .select('*')
      .is('sentiment', null);

    console.log(`📄 Found ${unenrichedReviews?.length || 0} reviews to enrich\n`);

    if (!unenrichedReviews || unenrichedReviews.length === 0) {
      console.log('✅ All reviews already enriched!\n');
      return NextResponse.json({
        status: 'success',
        message: 'All reviews already enriched',
        enriched: 0,
        failed: 0,
      });
    }

    let enrichedCount = 0;
    let failedCount = 0;

    // Process in batches of 10
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 500;

    for (let i = 0; i < unenrichedReviews.length; i += BATCH_SIZE) {
      const batch = unenrichedReviews.slice(i, i + BATCH_SIZE);
      console.log(
        `📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unenrichedReviews.length / BATCH_SIZE)} (${batch.length} reviews)`
      );

      for (const review of batch) {
        try {
          if (!review.text) {
            console.log(`  ⏭️  Skipping review ${review.id} (no text)`);
            failedCount++;
            continue;
          }

          console.log(`  🔍 Analyzing: "${review.text.substring(0, 50)}..."`);

          const analysis = await analyzeReview(review.text);

          // Update review with analysis results
          await supabase
            .from('reviews')
            .update({
              sentiment: analysis.sentiment,
              themes: analysis.themes,
              summary: analysis.ai_reply_suggestion, // Store reply suggestion in summary field
            })
            .eq('id', review.id);

          enrichedCount++;
          console.log(`    ✅ ${analysis.sentiment} (score: ${analysis.sentiment_score})`);
        } catch (err) {
          console.error(`    ❌ Error analyzing review ${review.id}:`, err instanceof Error ? err.message : err);
          failedCount++;
          // Continue to next review
        }
      }

      // Delay before next batch (except for last batch)
      if (i + BATCH_SIZE < unenrichedReviews.length) {
        console.log(`  ⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...\n`);
        await sleep(BATCH_DELAY_MS);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const summary = {
      status: 'success',
      enriched: enrichedCount,
      failed: failedCount,
      total: enrichedCount + failedCount,
      duration: `${duration}s`,
    };

    console.log('\n✨ ENRICHMENT COMPLETE');
    console.log('─────────────────────────────');
    console.log(`✅ Reviews enriched: ${enrichedCount}`);
    console.log(`❌ Reviews failed: ${failedCount}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('────────────────────────────\n');

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
