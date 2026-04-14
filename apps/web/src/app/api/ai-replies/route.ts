/**
 * GET  /api/ai-replies?businessId=<id>
 *   Returns recent reviews for the business, joined with their ai_replies record if any.
 *
 * POST /api/ai-replies
 *   Generates (or regenerates) an AI reply for a review at a given tone.
 *   Creates / upserts an ai_replies row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Tone = 'professional' | 'friendly' | 'empathetic' | 'warm' | 'playful';

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: 'Use a professional, polished tone.',
  friendly:     'Use a warm, friendly and conversational tone.',
  empathetic:   "Use an empathetic, caring tone that acknowledges the customer's feelings.",
  warm:         'Use a genuine, heartfelt and personal tone.',
  playful:      'Use a light, upbeat tone with personality — still respectful.',
};

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServerClient();

  // Fetch recent reviews with text, and their associated ai_reply if any
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id, author_name, rating, text, sentiment, published_at, barber_id, summary,
      ai_replies ( id, suggested_reply, tone, is_approved, is_posted, approved_at, created_at )
    `)
    .eq('business_id', businessId)
    .not('text', 'is', null)
    .order('published_at', { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: reviews ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { reviewId, reviewText, tone = 'professional', shopSignature } = body;

  if (!reviewId || !reviewText) {
    return NextResponse.json({ error: 'reviewId and reviewText are required' }, { status: 400 });
  }

  const toneInstruction = TONE_INSTRUCTIONS[tone as Tone] ?? TONE_INSTRUCTIONS.professional;
  const signatureLine = shopSignature ? `\n\nEnd with this signature: "${shopSignature}"` : '';

  const prompt = `You are writing a public Google Maps reply on behalf of a barbershop owner.
${toneInstruction}
Keep it concise — 2-3 sentences max. Be specific to the review content. Do not use filler phrases like "We appreciate your feedback".${signatureLine}

Customer review:
"${reviewText}"

Reply:`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  });

  const suggestedReply = completion.choices[0].message.content?.trim() ?? '';
  if (!suggestedReply) {
    return NextResponse.json({ error: 'OpenAI returned empty reply' }, { status: 500 });
  }

  // Upsert — one ai_reply per review
  const { data: existing } = await supabase
    .from('ai_replies')
    .select('id')
    .eq('review_id', reviewId)
    .maybeSingle();

  let result;
  if (existing) {
    const { data } = await supabase
      .from('ai_replies')
      .update({ suggested_reply: suggestedReply, tone, is_approved: false, is_posted: false, approved_at: null })
      .eq('id', existing.id)
      .select()
      .single();
    result = data;
  } else {
    const { data } = await supabase
      .from('ai_replies')
      .insert({ review_id: reviewId, suggested_reply: suggestedReply, tone })
      .select()
      .single();
    result = data;
  }

  return NextResponse.json({ reply: result, suggestedReply });
}
