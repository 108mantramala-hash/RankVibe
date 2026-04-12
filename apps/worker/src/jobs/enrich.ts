import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface EnrichJobData {
  businessId: string;
  reviewIds: string[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a review analysis engine for local businesses.
Given a customer review, extract:
1. sentiment: "positive", "negative", or "neutral"
2. themes: array of short theme tags (e.g., "wait time", "fade quality", "friendly staff", "cleanliness")
3. ai_reply_suggestion: a professional, concise reply suggestion (1-2 sentences) for the business owner

Respond in JSON only:
{"sentiment": "...", "themes": [...], "ai_reply_suggestion": "..."}`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function analyzeReview(text: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('Empty OpenAI response');

  const parsed = JSON.parse(content);
  return {
    sentiment: parsed.sentiment as 'positive' | 'negative' | 'neutral',
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    summary: parsed.ai_reply_suggestion || '',
  };
}

export async function handleEnrichJob(job: Job<EnrichJobData>) {
  const { businessId, reviewIds } = job.data;
  const supabase = getSupabase();

  console.info(`[enrich] Processing ${reviewIds.length} reviews for business ${businessId}`);

  // 1. Fetch review texts from Supabase
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, text')
    .in('google_review_id', reviewIds)
    .is('sentiment', null)
    .not('text', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  if (!reviews || reviews.length === 0) {
    console.info(`[enrich] No unenriched reviews found for business ${businessId}`);
    return { processed: 0 };
  }

  let processed = 0;
  let failed = 0;

  await job.updateProgress(10);

  // 2. Enrich each review
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    try {
      const result = await analyzeReview(review.text!);

      await supabase
        .from('reviews')
        .update({
          sentiment: result.sentiment,
          themes: result.themes,
          summary: result.summary,
        })
        .eq('id', review.id);

      processed++;
    } catch (err) {
      console.error(`[enrich] Failed review ${review.id}:`, err instanceof Error ? err.message : err);
      failed++;
    }

    // Update progress
    await job.updateProgress(10 + Math.round((i / reviews.length) * 85));
  }

  await job.updateProgress(100);

  console.info(`[enrich] ✓ ${processed} enriched, ${failed} failed for business ${businessId}`);
  return { processed, failed };
}
