import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Priority list of HDO domains
const HDO_DOMAINS = [
    "https://hdo.app",
    "https://hdo.to",
    "https://hdobox.se", 
    "https://hdo.cx",
    "https://hdo.watch"
];

const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36";

async function fetchJson(url: string, referrer: string) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const res = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": referrer,
                "Origin": referrer,
                "Accept": "application/json"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get('tmdb');
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';
    const type = searchParams.get('type') || 'movie';

    if (!tmdbId) return NextResponse.json({ error: "Missing TMDB ID" }, { status: 400 });

    try {
        let sourceData = null;
        let activeDomain = "";
        let finalId = "";

        console.log(`[HDO] Hunting for TMDB: ${tmdbId} (${type})...`);

        // ---------------------------------------------------------
        // STRATEGY 1: DIRECT TMDB LOOKUP (Fastest)
        // ---------------------------------------------------------
        for (const domain of HDO_DOMAINS) {
            // Many HDO clones support /api/media/tmdb/{id}
            // or /api/search?tmdb={id}
            // We'll try to find the internal ID via TMDB ID first
            
            // Note: HDO API for mapping is tricky, so we'll often fall back to Search
            // But let's try the metadata endpoint first to see if it resolves
            const metaUrl = `${domain}/api/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}`; // Some use TMDB as ID directly
            // This is a guess, usually they use internal IDs. 
            // If this fails, we fall back to Strategy 2 (Search) below.
        }

        // ---------------------------------------------------------
        // STRATEGY 2: SEARCH & MATCH (Robust)
        // ---------------------------------------------------------
        
        // 1. Get Title from TMDB first (Client should have sent it, but we can fetch if needed)
        // For speed, let's assume we need to fetch it if we don't have it.
        const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
        let searchTitle = "";
        let searchYear = 0;

        if (tmdbApiKey) {
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${tmdbApiKey}`);
            const tmdbJson = await tmdbRes.json();
            searchTitle = type === 'movie' ? tmdbJson.title : tmdbJson.name;
            const date = type === 'movie' ? tmdbJson.release_date : tmdbJson.first_air_date;
            searchYear = date ? parseInt(date.split('-')[0]) : 0;
        } else {
            return NextResponse.json({ error: "Server missing TMDB API Key" }, { status: 500 });
        }

        console.log(`[HDO] Title: ${searchTitle} (${searchYear})`);
        const cleanTitle = searchTitle.replace(/[^a-zA-Z0-9\s]/g, "");

        // 2. Loop through domains until we get SOURCES
        for (const domain of HDO_DOMAINS) {
            console.log(`[HDO] Checking ${domain}...`);
            
            // A. Search
            const searchUrl = `${domain}/api/search?k=${encodeURIComponent(cleanTitle)}`;
            const searchRes = await fetchJson(searchUrl, domain);

            if (!searchRes || !Array.isArray(searchRes) || searchRes.length === 0) continue;

            // B. Match
            const match = searchRes.find((item: any) => {
                const t = (item.title || item.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                const target = searchTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                const y = parseInt((item.release_date || item.first_air_date || "0").split('-')[0]);
                return t.includes(target) && Math.abs(y - searchYear) <= 1;
            });

            if (!match) continue;

            // C. Resolve Internal ID
            let hdoId = match.id;
            
            if (type === 'tv') {
                const details = await fetchJson(`${domain}/api/tv/${hdoId}`, domain);
                if (!details?.seasons) continue;

                const sData = details.seasons.find((s: any) => s.season_number == season);
                const eData = sData?.episodes.find((e: any) => e.episode_number == episode);
                
                if (!eData) continue;
                hdoId = eData.id;
            }

            // D. Extract Sources
            // Try both endpoints (Movie/Episode) just in case
            let srcs = await fetchJson(`${domain}/api/episode/sources?id=${hdoId}`, domain);
            if (!srcs?.data) {
                srcs = await fetchJson(`${domain}/api/movie/sources?id=${hdoId}`, domain);
            }

            // E. Success Check
            if (srcs && srcs.data && Array.isArray(srcs.data) && srcs.data.length > 0) {
                sourceData = srcs;
                activeDomain = domain;
                console.log(`[HDO] 🎯 Found sources on ${domain}`);
                break; // We found working sources!
            } else {
                console.log(`[HDO] Found metadata but NO sources on ${domain}`);
            }
        }

        if (!sourceData) {
            return NextResponse.json({ error: "No stream found on any HDO mirror" }, { status: 404 });
        }

        // 3. Return
        return NextResponse.json({
            streamData: [{
                sources: sourceData.data.map((s: any) => ({
                    file: s.file,
                    label: s.label || "Auto",
                    type: "hls"
                })),
                subtitles: sourceData.tracks || []
            }]
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}