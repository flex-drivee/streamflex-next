import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  // 1. The Configuration (Same as Python)
  const TARGET_URL = "https://search.pingora.fyi/collections/post/documents/search";
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Origin": "https://hdhub4u.rehab",
    "Referer": "https://hdhub4u.rehab/"
  };

  try {
    // 2. The Fetch (Native Node.js)
    const apiUrl = new URL(TARGET_URL);
    apiUrl.searchParams.append('q', query);
    apiUrl.searchParams.append('query_by', 'post_title');
    apiUrl.searchParams.append('sort_by', 'sort_by_date:desc');
    apiUrl.searchParams.append('limit', '15');
    apiUrl.searchParams.append('highlight_fields', 'none');
    apiUrl.searchParams.append('use_cache', 'true');
    apiUrl.searchParams.append('page', '1');

    console.log(`[*] Fetching Streamflex results for: ${query}`);
    
    const response = await fetch(apiUrl.toString(), {
      headers: HEADERS,
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Upstream API error: ${response.status}`);
    }

    const data = await response.json();

    // 3. Data Transformation (Cleaning the result)
    // We check if hits exist to avoid crashing
    const results = (data.hits || []).map((hit: any) => ({
      title: hit.document.post_title,
      link: hit.document.permalink,
      image: hit.document.post_thumbnail,
      date: hit.document.post_date
    }));

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error("[!] Scraper Error:", error.message);
    return NextResponse.json({ error: 'Failed to fetch results', details: error.message }, { status: 500 });
  }
}