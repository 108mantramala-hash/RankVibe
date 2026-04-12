/**
 * Standalone enrichment script — runs AI sentiment/themes on all unenriched reviews
 * Safe to re-run: only processes reviews where sentiment IS NULL
 * Run: tsx scripts/enrich.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load credentials from apps/web/.env.local
import * as fs from 'fs';
import * as path from 'path';

const envVars: Record<string, string> = {};
try {
  fs.readFileSync(path.join(process.cwd(), 'apps/web/.env.local'), 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [k, ...v] = line.split('=');
      if (k && v.length) envVars[k.trim()] = v.join('=').trim();
    });
} catch { /* fall back to process.env */ }

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = envVars.OPENAI_API_KEY || process.env.OPENAI_API_KEY!;

const BATCH_SIZE = 20;       // parallel calls per batch
const BATCH_DELAY_MS = 500;  // ms between batches

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a review analysis engine for local businesses.
Given a customer review, extract:
1. sentiment: "positive", "negative", or "neutral"
2. themes: array of short theme tags (e.g., "wait time", "fade quality", "friendly staff", "cleanliness", "pricing", "location", "parking")
3. ai_reply_suggestion: a professional, concise reply suggestion (1-2 sentences) for the business owner

Respond in JSON only:
{"sentiment": "...", "themes": [...], "ai_reply_suggestion": "..."}`;

interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
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
  if (!content) throw new Error('Empty OpenAI response');

  const parsed = JSON.parse(content);
  return {
    sentiment: parsed.sentiment as 'positive' | 'negative' | 'neutral',
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    ai_reply_suggestion: parsed.ai_reply_suggestion || '',
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in apps/web/.env.local or environment');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('🤖 ENRICHMENT SCRIPT');
  console.log('========================================\n');

  const startTime = Date.now();

  // Fetch all unenriched reviews (no text skipped automatically)
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, text')
    .is('sentiment', null)
    .not('text', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch reviews:', error.message);
    process.exit(1);
  }

  console.log(`📄 Unenriched reviews with text: ${reviews?.length ?? 0}`);

  // Count reviews with no text (will be skipped)
  const { count: noTextCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .is('sentiment', null)
    .is('text', null);

  if (noTextCount) {
    console.log(`⏭️  Reviews without text (skipped): ${noTextCount}`);
  }

  if (!reviews || reviews.length === 0) {
    console.log('\n✅ All reviews already enriched!\n');
    return;
  }

  console.log(`\n⚡ Batch size: ${BATCH_SIZE} parallel | Delay: ${BATCH_DELAY_MS}ms between batches`);
  const estimatedMinutes = ((reviews.length / BATCH_SIZE) * (BATCH_DELAY_MS / 1000) / 60).toFixed(1);
  console.log(`⏱️  Estimated time: ~${estimatedMinutes} min\n`);

  let enriched = 0;
  let failed = 0;
  const totalBatches = Math.ceil(reviews.length / BATCH_SIZE);

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${enriched} enriched, ${failed} failed)...\r`);

    // Process batch in parallel
    await Promise.all(
      batch.map(async (review) => {
        try {
          const analysis = await analyzeReview(review.text!);
          await supabase
            .from('reviews')
            .update({
              sentiment: analysis.sentiment,
              themes: analysis.themes,
              summary: analysis.ai_reply_suggestion,
            })
            .eq('id', review.id);
          enriched++;
        } catch (err) {
          failed++;
          // Silently continue — don't let one failure block the batch
        }
      })
    );

    // Print progress every 10 batches
    if (batchNum % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\n  ✅ Batch ${batchNum}/${totalBatches} — ${enriched} enriched, ${failed} failed (${elapsed} min elapsed)`);
    }

    if (i + BATCH_SIZE < reviews.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n\n========================================');
  console.log('✨ ENRICHMENT COMPLETE');
  console.log('========================================');
  console.log(`✅ Enriched  : ${enriched}`);
  console.log(`❌ Failed    : ${failed}`);
  console.log(`⏱️  Duration  : ${duration} min`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
