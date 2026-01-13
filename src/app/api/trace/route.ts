import { NextRequest, NextResponse } from 'next/server';
import { fetchNetMirrorCookies } from '@/lib/utils/providers';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: "Missing 'url' parameter" });

  const logs: string[] = [];
  
  try {
    // 1. Get Credentials
    const cookies = await fetchNetMirrorCookies();
    logs.push(`🔑 Cookies Loaded: ${cookies.substring(0, 15)}...`);

    // 2. Prepare Headers
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookies,
        'Referer': 'https://net20.cc/', // Start with the search domain
    };

    logs.push(`🚀 Request 1: ${url}`);
    
    // 3. First Hop (Manual Redirect to see status)
    const res1 = await fetch(url, { headers, redirect: 'manual' });
    logs.push(`⬇️ Status: ${res1.status} ${res1.statusText}`);
    
    const location = res1.headers.get('location');
    logs.push(`📍 Location Header: ${location || 'None'}`);

    let finalData = "";
    let finalUrl = url;

    // 4. Handle Redirect (The "Road")
    if (res1.status >= 300 && res1.status < 400 && location) {
        // Resolve relative URLs
        const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
        logs.push(`🔀 Following Redirect to: ${nextUrl}`);
        finalUrl = nextUrl;

        // Update Referer for the new domain?
        // Usually we keep the original referer (net20) OR update to the new host.
        // Let's test keeping it first.
        
        const res2 = await fetch(nextUrl, { headers });
        logs.push(`⬇️ Status 2: ${res2.status} ${res2.statusText}`);
        finalData = await res2.text();
    } else {
        // No redirect, just read body
        finalData = await res1.text();
    }

    return NextResponse.json({
      success: true,
      trace: logs,
      finalUrl: finalUrl,
      preview: finalData.substring(0, 1000) // First 1000 chars of m3u8
    });

  } catch (error: any) {
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        trace: logs 
    }, { status: 500 });
  }
}