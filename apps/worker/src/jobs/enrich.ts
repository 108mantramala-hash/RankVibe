import { Job } from 'bullmq';
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
3. summary: one-sentence summary of the review

Respond in JSON only:
{"sentiment": "...", "themes": [...], "summary": "..."}`;

export async function handleEnrichJob(job: Job<EnrichJobData>) {
  const { businessId, reviewIds } = job.data;

  console.info(`[enrich] Processing ${reviewIds.length} reviews for business ${businessId}`);

  // TODO: Fetch review texts from DB via @rankvibe/db
  // const reviews = await db.reviews.getByIds(reviewIds);

  // Placeholder — in production, loop over actual reviews
  const sampleReview = 'Great fade, but had to wait 40 minutes. Staff was super friendly though.';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: sampleReview },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');

  console.info(`[enrich] Result:`, result);
  // → { sentiment: "positive", themes: ["fade quality", "wait time", "friendly staff"], summary: "..." }

  // TODO: Store enrichment results in DB
  // await db.reviewInsights.upsert({ reviewId, ...result });

  return { processed: reviewIds.length };
}
