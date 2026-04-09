import { NextRequest, NextResponse } from 'next/server';
import { processBusinessReviews } from '../../../../services/pipeline';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { googleMapsUrl } = body;

    if (!googleMapsUrl) {
      return NextResponse.json(
        { error: 'Missing required field: googleMapsUrl' },
        { status: 400 }
      );
    }

    console.log(`[api/pipeline] Starting pipeline for: ${googleMapsUrl}`);

    const result = await processBusinessReviews(googleMapsUrl);

    console.log(`[api/pipeline] Pipeline completed:`, result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[api/pipeline] error', error);
    return NextResponse.json(
      { error: 'Pipeline failed', details: String(error) },
      { status: 500 }
    );
  }
}
