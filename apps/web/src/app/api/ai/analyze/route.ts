import { NextRequest, NextResponse } from 'next/server';
import { analyzeReview, generateReplySuggestion } from '../../../../services/ai-analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewText, rating } = body;

    if (!reviewText || typeof rating !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: reviewText and rating' },
        { status: 400 }
      );
    }

    // Run analysis and reply generation in parallel
    const [analysis, replySuggestion] = await Promise.all([
      analyzeReview(reviewText),
      generateReplySuggestion(reviewText, rating),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reviewText,
        rating,
        analysis,
        replySuggestion: replySuggestion.reply,
      },
    });
  } catch (error) {
    console.error('[ai/analyze] error', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: String(error) },
      { status: 500 }
    );
  }
}
