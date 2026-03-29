import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;

  // TODO: Look up review link from DB by slug
  // const link = await db.query.reviewLinks.findFirst({
  //   where: eq(reviewLinks.slug, slug),
  // });

  // Placeholder response
  const link = {
    slug,
    businessId: 'demo-business-id',
    businessName: 'Demo Barbershop',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=PLACEHOLDER',
    isActive: true,
  };

  if (!link || !link.isActive) {
    return NextResponse.json({ error: 'Review link not found' }, { status: 404 });
  }

  // TODO: Increment scan count
  // await db.update(reviewLinks).set({ scanCount: sql`scan_count + 1` }).where(eq(reviewLinks.slug, slug));

  return NextResponse.json(link);
}
