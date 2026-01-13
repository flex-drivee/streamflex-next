import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cloudstream Android User-Agent
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36";

const MAIN_URL = "https://net20.cc"; 
const PLAYLIST_HOST = "https://net51.cc"; // ✅ FETCH FROM NET51 (Like Kotlin App)

async function getBypassCookie() {
    let attempts = 0;
    try {
        while (attempts < 5) {
            // Handshake is still on MAIN_URL (net20)
            const res = await fetch(`${MAIN_URL}/tv/p.php`, {
                method: "POST",
                headers: { "User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest" }
            });
            const text = await res.text();
            const setCookie = res.headers.get("set-cookie") || "";
            const match = setCookie.match(/t_hash_t=([^;]+)/);
            if (match && text.includes('"r":"n"')) return match[1];
            
            attempts++;
            await new Promise(r => setTimeout(r, 1000)); 
        }
    } catch (e) { console.error("Handshake Failed:", e); }
    return "";
}

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id'); 
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    try {
        // 1. Handshake
        const hashCookie = await getBypassCookie();
        if (!hashCookie) return NextResponse.json({ error: "Handshake failed" }, { status: 503 });

        // 2. Cookies (Matching Kotlin: t_hash_t, ott=nf, hd=on)
        const apiCookies = `t_hash_t=${hashCookie}; ott=nf; hd=on`;
        
        // 3. Get Playlist from NET51 (Crucial Change)
        const apiUrl = `${PLAYLIST_HOST}/tv/playlist.php?id=${id}&t=${Date.now()}&tm=${Math.floor(Date.now() / 1000)}`;
        const res = await fetch(apiUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": `${MAIN_URL}/tv/home`,
                "Cookie": apiCookies,
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        const data = await res.json();
        const sources: any[] = [];
        const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.sources) {
                    for (const source of item.sources) {
                        let fileUrl = source.file.replace("/tv/", "/"); 
                        if (!fileUrl.startsWith("http")) fileUrl = `https://net51.cc${fileUrl}`;
                        
                        // Proxy URL (No cookie param needed, Proxy hardcodes hd=on)
                        const proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(fileUrl)}`;
                        
                        sources.push({
                            label: source.label,
                            file: proxyUrl,
                            type: "hls"
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            streamData: [{ sources }],
            cookies: "hd=on" 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}