import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = "https://vidsrc.cc";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": BASE_URL,
            }
        });
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get('tmdb');
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');
    const type = searchParams.get('type') || 'movie';

    if (!tmdbId) return NextResponse.json({ error: "Missing TMDB ID" }, { status: 400 });

    try {
        // 1. Construct Target URL
        // Movie: https://vidsrc.cc/v2/embed/movie/{tmdb}
        // TV: https://vidsrc.cc/v2/embed/tv/{tmdb}/{season}/{episode}
        let targetUrl = `${BASE_URL}/v2/embed/movie/${tmdbId}`;
        if (type === 'tv') {
            if (!season || !episode) return NextResponse.json({ error: "Season/Episode required for TV" }, { status: 400 });
            targetUrl = `${BASE_URL}/v2/embed/tv/${tmdbId}/${season}/${episode}`;
        }

        console.log(`[VidSrc] Scraping: ${targetUrl}`);
        const html = await fetchText(targetUrl);

        if (!html) {
            return NextResponse.json({ error: "Failed to fetch VidSrc embed" }, { status: 404 });
        }

        // 2. Extract Source ID from HTML
        // Regex to find: data-id="..." or specific source pattern
        // VidSrc often embeds the ID in a script tag or data attribute
        const idMatch = html.match(/data-id="([^"]+)"/);
        if (!idMatch) {
            console.log("[VidSrc] No Data ID found. The content might be unavailable.");
            return NextResponse.json({ error: "Content unavailable on VidSrc" }, { status: 404 });
        }
        const dataId = idMatch[1];

        // 3. Fetch Stream Sources
        // Endpoint: https://vidsrc.cc/api/episodes/{dataId}/servers
        const sourcesUrl = `${BASE_URL}/api/episodes/${dataId}/servers`;
        const sourcesRes = await fetch(sourcesUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": targetUrl }
        });
        const sourcesData = await sourcesRes.json();

        if (!sourcesData || !sourcesData.data || sourcesData.data.length === 0) {
            return NextResponse.json({ error: "No servers found" }, { status: 404 });
        }

        // 4. Resolve the Best Server (VidSrc usually)
        // We need to 'ping' the server link to get the final m3u8
        const serverHash = sourcesData.data[0].hash;
        const embedUrl = `${BASE_URL}/api/source/${serverHash}`;
        
        const embedRes = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": targetUrl },
            method: "POST" // Often requires POST
        });
        const embedData = await embedRes.json();

        if (!embedData || !embedData.data || !embedData.data.source) {
             return NextResponse.json({ error: "Failed to resolve stream link" }, { status: 404 });
        }

        const finalUrl = embedData.data.source;

        return NextResponse.json({
            streamData: [{
                sources: [{
                    file: finalUrl,
                    label: "Auto (VidSrc)",
                    type: "hls"
                }],
                subtitles: [] // Subtitles are often separate in VidSrc, complex to extract
            }]
        });

    } catch (e: any) {
        console.error("[VidSrc] Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}