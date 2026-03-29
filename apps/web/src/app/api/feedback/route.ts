import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { businessId, reviewLinkId, rating, message, contactEmail } = body;

    // Validate required fields
    if (!businessId || !rating || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, rating, message' },
        { status: 400 },
      );
    }

    // TODO: Insert into Supabase via @rankvibe/db
    // await db.insert(feedbackSubmissions).values({
    //   businessId,
    //   reviewLinkId,
    //   rating,
    //   message,
    //   contactEmail,
    // });

    console.info(`[feedback] Received rating=${rating} for business=${businessId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[feedback] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
