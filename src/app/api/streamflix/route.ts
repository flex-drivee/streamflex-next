import { NextResponse } from 'next/server';

const BASE_URL = "https://api.streamflix.app";

// Headers matched exactly from StreamFlixProvider.kt to avoid blocking
const HEADERS = { 
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive"
};

// ✅ BULLETPROOF FALLBACK: Use these if the config API fails
// (Extracted from your previous successful logs)
const FALLBACK_CONFIG = {
  premium: [
    "https://s3.ap-southeast-1.wasabisys.com/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix-sv-2/"
  ],
  tv: [
    "https://s3.ap-southeast-1.wasabisys.com/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix-sv-2/"
  ],
  movies: [
    "https://s3.ap-southeast-1.wasabisys.com/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix/",
    "https://bb.streamflixserver.site/file/streamflix-sv-2/"
  ]
};

// --- HELPERS ---

async function fetchJson(endpoint: string) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: HEADERS,
      cache: 'no-store'
    });
    
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[StreamFlix] Error fetching ${endpoint}:`, e);
    return null;
  }
}

// --- MAIN HANDLER ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title'); 
  const season = searchParams.get('season') || "1";
  const episode = searchParams.get('episode') || "1";

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // 1. Fetch Config (With Fallback)
  let config = await fetchJson("/config/config-streamflixapp.json");
  
  if (!config) {
    console.warn("[StreamFlix] Config fetch failed. Using Hardcoded Fallback.");
    config = FALLBACK_CONFIG;
  }

  // 2. Fetch Data Catalog
  // If this fails, we really can't do anything, so we return an error
  const data = await fetchJson("/data.json");
  if (!data || !data.data) {
    return NextResponse.json({ error: "Catalog failed (API might be down)" }, { status: 500 });
  }

  // 3. Search for the content
  const lowerQuery = title.toLowerCase().trim();
  
  // Try Exact Match first, then Fuzzy
  // Note: StreamFlix JSON keys are lowercase (moviename)
  let item = data.data.find((d: any) => (d.moviename || d.movieName)?.toLowerCase() === lowerQuery);
  
  if (!item) {
    item = data.data.find((d: any) => (d.moviename || d.movieName)?.toLowerCase().includes(lowerQuery));
  }

  if (!item) {
    console.log(`[StreamFlix] Not found: "${title}"`);
    return NextResponse.json({ error: "Not found on StreamFlix" }, { status: 404 });
  }

  const movieKey = item.moviekey || item.movieKey;
  const movieName = item.moviename || item.movieName;

  console.log(`[StreamFlix] Found: "${movieName}" (ID: ${movieKey})`);

  // 4. Construct Stream Links
  const streams: any[] = [];

  const allServers = [
    ...(config.premium || []),
    ...(config.tv || []),
    ...(config.movies || [])
  ];

  // Remove duplicates
  const uniqueServers = [...new Set(allServers)];

  uniqueServers.forEach((server: string) => {
    // Ensure server URL ends with /
    const baseUrl = typeof server === 'string' && server.endsWith('/') ? server : `${server}/`;
    let finalUrl = "";

    const isTvShow = item.isTV || item.istv;

    if (isTvShow) {
      // Pattern: https://server.com/tv/KEY/s1/episode1.mkv
      finalUrl = `${baseUrl}tv/${movieKey}/s${season}/episode${episode}.mkv`;
    } else {
      // Pattern: https://server.com/movie/KEY.mp4
      finalUrl = `${baseUrl}movie/${movieKey}.mp4`; 
      // Add MKV option for movies too
      streams.push({
        server: "StreamFlix Premium (MKV)",
        link: `${baseUrl}movie/${movieKey}.mkv`,
        type: "mkv",
        quality: "Auto"
      });
    }

    streams.push({
      server: "StreamFlix",
      link: finalUrl,
      type: finalUrl.endsWith('.mkv') ? "mkv" : "mp4", 
      quality: "Auto"
    });
  });

  return NextResponse.json({
    title: movieName,
    poster: item.movieposter ? `https://image.tmdb.org/t/p/w500${item.movieposter}` : null,
    plot: item.moviedesc,
    year: item.movieyear,
    is_tv: item.isTV || item.istv,
    streams: streams
  });
}