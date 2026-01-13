import { NextRequest, NextResponse } from 'next/server';
import { getNetMirrorUrl, fetchNetMirrorCookies } from '@/lib/utils/providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('p');

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const baseUrl = await getNetMirrorUrl();
    const cookies = await fetchNetMirrorCookies();
    const timestamp = Date.now().toString();
    
    const searchUrl = `${baseUrl}/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`;
    
    console.log(`[NetMirror] Searching: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Cookie': cookies,
        'Referer': baseUrl,
        'X-Requested-With': 'XMLHttpRequest',
      }
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[NetMirror] Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}