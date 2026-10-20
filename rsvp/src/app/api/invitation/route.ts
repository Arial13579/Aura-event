import { getPublicDoc } from '@/lib/firestore-rest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const doc = await getPublicDoc('settings/invitation');
  const dataUrl = typeof doc?.dataUrl === 'string' ? doc.dataUrl : '';
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return new Response('Not found', { status: 404 });
  const body = Buffer.from(match[2], 'base64');
  return new Response(body, {
    headers: {
      'Content-Type': match[1],
      'Content-Length': String(body.length),
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
