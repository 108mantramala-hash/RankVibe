import { NextResponse } from 'next/server';
import { scrapeBusinessReviews } from '../../../../services/scraper';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const googleMapsUrl = url.searchParams.get('url');

  if (!googleMapsUrl) {
    return NextResponse.json(
      { error: 'Missing required query parameter: url' },
      { status: 400 },
    );
  }

  try {
    const scraped = await scrapeBusinessReviews(googleMapsUrl);
    return NextResponse.json({ success: true, data: scraped });
  } catch (error) {
    console.error('[scrape/test] error', error);
    return NextResponse.json(
      { error: 'Scrape failed', details: String(error) },
      { status: 500 },
    );
  }
}
