import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

function unpack(packed: string): string | null {
    try {
        const regex = /return\s+p\s*\}\s*\(\s*['"](.+?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"](.+?)['"]\.split\(\s*['"]\|['"]\s*\)/;
        const match = packed.match(regex);
        if (!match) return null;
        let [_, payload, radixStr, countStr, keywordsStr] = match;
        const radix = parseInt(radixStr);
        const keywords = keywordsStr.split('|');
        let unpacked = payload.replace(/\b\w+\b/g, (w) => {
            let v = parseInt(w, radix);
            if (keywords[v]) return keywords[v];
            return w;
        });
        return unpacked;
    } catch (e) { return null; }
}

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= 'Z';
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(((charCode - baseCharCode + 13) % 26) + baseCharCode);
  });
}

function decodeString(encryptedString: string): any {
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (error) { return null; }
}

function pen(value: string): string {
  return value.replace(/[a-zA-Z]/g, function (char: string) {
    const charCode = char.charCodeAt(0);
    const limit = char <= 'Z' ? 90 : 122;
    const shifted = charCode + 13;
    return String.fromCharCode(shifted <= limit ? shifted : shifted - 26);
  });
}

function decode(value: string): string {
  if (!value) return '';
  try { return atob(value.toString()); } catch(e) { return ''; }
}

// --- HUBSTREAM SOLVER (RESTORED SCRAPER) ---
const processHubStream = async (url: string, log: string[]): Promise<string | null> => {
    let id = "";
    try {
        const urlObj = new URL(url);
        if (urlObj.hash && urlObj.hash.length > 1) id = urlObj.hash.substring(1); 
        else if (urlObj.pathname.split('/').length > 1) {
            const parts = urlObj.pathname.split('/').filter(p => p);
            id = parts[parts.length - 1]; 
        }
    } catch(e) { if (url.includes("#")) id = url.split("#")[1]; }

    if (!id) return null;

    const baseUrl = "https://hubstream.art";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": `${baseUrl}/`,
        "Origin": baseUrl,
        "X-Requested-With": "XMLHttpRequest"
    };

    // Strategy 1: Direct POST API
    try {
        const apiRes = await fetch(`${baseUrl}/api/v1/video`, {
            method: 'POST', 
            headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${id}`
        });
        if (apiRes.ok) {
            const text = await apiRes.text();
            if (!text.includes("cloudflare")) {
                const m3u8 = text.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/);
                if (m3u8) {
                    log.push(`[✅] HubStream POST API Success`);
                    return m3u8[1];
                }
            }
        }
    } catch(e) {}

    // Strategy 2: Embed Page Scrape (RESTORED)
    try {
        // Fetch the Embed Page
        const embedRes = await fetch(`${baseUrl}/e/${id}`, { headers });
        const html = await embedRes.text();
        
        let searchContent = html;
        // Unpack JS
        const packed = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\(['"]\|['"]\)\)\)/);
        if (packed) {
            const unpacked = unpack(packed[0]);
            if (unpacked) searchContent = unpacked;
        }

        // Search for Token 't'
        const tokenMatch = searchContent.match(/['"]([a-f0-9]{60,})['"]/);
        if (tokenMatch) {
            const token = tokenMatch[1];
            log.push(`[🔑] Found Token, calling Player API`);
            const playerRes = await fetch(`${baseUrl}/api/v1/player?t=${token}`, { headers });
            if (playerRes.ok) {
                const txt = await playerRes.text();
                const m3u8 = txt.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/);
                if (m3u8) return m3u8[1];
            }
        }

        // Search for Direct File
        const fileMatch = searchContent.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                          searchContent.match(/["']([^"']+\.m3u8[^"']*)["']/);
        
        if (fileMatch) {
            log.push(`[✅] HubStream Embed Scrape Success`);
            return fileMatch[1];
        }

    } catch(e) {}

    return null;
};

// --- GADGETSWEB SOLVER ---
async function solveGadgetsWeb(link: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer 
      },
      redirect: 'follow'
    });
    const resText = await res.text();

    const regex = /ck\('_[a-z0-9_]+','([^']+)'/g; 
    let combinedString = '';
    let match;
    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }

    if (combinedString) {
        try {
            const decodedString = decode(pen(decode(decode(combinedString))));
            const data = JSON.parse(decodedString);
            if (data?.data && data?.wp_http1) {
                const token = btoa(data.data);
                return data.wp_http1 + '?re=' + token;
            }
        } catch(e) {}
    }

    if (res.url.includes("hblinks") || res.url.includes("hublinks")) return res.url;
    const metaRefresh = resText.match(/<meta\s+http-equiv=["']refresh["']\s+content=["']\d+;\s*url=([^"']+)["']/i);
    if (metaRefresh) return metaRefresh[1];

    return null;
  } catch (err) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const link = searchParams.get('link');
  const episode = parseInt(searchParams.get('episode') || "1");

  if (!link) return NextResponse.json({ error: 'Link is required' }, { status: 400 });

  const fixUrl = (u: string) => u.startsWith("http") ? u : `https://new1.hdhub4u.fo${u}`;
  const targetUrl = fixUrl(link);
  
  const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const BASE_HEADERS = { "User-Agent": USER_AGENT, "Referer": "https://new1.hdhub4u.fo/" };

  let scanLog: string[] = [`[*] Target: ${targetUrl} (Ep: ${episode})`];
  let qualities: Record<string, { url: string, type: string }> = {};
  let isPlayable = false;

  const fetchWithTimeout = async (url: string, options: any = {}, timeout = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return response;
      } catch (error) {
          clearTimeout(id);
          throw error;
      }
  };

  const makeProxyUrl = (target: string, referer: string) => {
      return `${origin}/api/proxy?url=${encodeURIComponent(target)}&referer=${encodeURIComponent(referer)}`;
  };

  const processHubCloudLink = async (hubLink: string): Promise<{url: string, type: string} | null> => {
       try {
           const hRes = await fetchWithTimeout(hubLink, { headers: { ...BASE_HEADERS, "Cookie": "xyt=2" } }, 15000);
           const hHtml = await hRes.text();
           
           // ✅ 1. Deep Scan for HLS in HubCloud (Best Chance)
           let m3u8 = hHtml.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/)?.[1] ||
                      hHtml.match(/["']([^"']+\.m3u8[^"']*)["']/)?.[1];
           
           if (m3u8) {
               scanLog.push(`[✅] Found HLS in HubCloud: ${m3u8}`);
               if (!m3u8.startsWith("http")) {
                   try { m3u8 = new URL(m3u8, hubLink).toString(); } catch(e) {}
               }
               return { url: m3u8, type: 'hls' };
           }

           // ✅ 2. Check for HubStream embed inside HubCloud
           const hubStreamMatch = hHtml.match(/href=["'](https?:\/\/[^"']*hubstream[^"']*)["']/);
           if (hubStreamMatch) {
               scanLog.push(`[⚡] Found HubStream in HubCloud: ${hubStreamMatch[1]}`);
               const hsUrl = await processHubStream(hubStreamMatch[1], scanLog);
               if (hsUrl) return { url: hsUrl, type: 'hls' };
           }

           const gamerMatch = hHtml.match(/var\s+url\s*=\s*['"]([^'"]*gamerxyt[^'"]*)['"]/);
           let nextUrl = gamerMatch ? gamerMatch[1] : null;
           if (!nextUrl) {
               const hrefMatch = hHtml.match(/href=["']([^"']*gamerxyt\.com\/hubcloud\.php[^"']*)["']/);
               if (hrefMatch) nextUrl = hrefMatch[1].replace(/&amp;/g, "&");
           }

           if (nextUrl) {
               scanLog.push(`[🕹️] GamerXYT Detected`);
               const gRes = await fetchWithTimeout(nextUrl, { headers: { ...BASE_HEADERS, "Cookie": "xyt=2", "Referer": hubLink } }, 15000);
               const gHtml = await gRes.text();

               const btnRegex = /<a[^>]+href=["']([^"']+)["'][^>]*class=["'][^"']*btn[^"']*["'][^>]*>(.*?)<\/a>/gi;
               const buttons = [...gHtml.matchAll(btnRegex)];
               
               let candidates = { 
                   pixeldrain: null as string|null,
                   hubcdn: null as string|null,
                   fsl: null as string|null,
                   gigachad: null as string|null
               };

               for (const btn of buttons) {
                   const href = btn[1];
                   const text = btn[2].toLowerCase();
                   
                   if (href.includes("pixeldrain") || text.includes("pixel")) candidates.pixeldrain = href;
                   else if (href.includes("hubcdn") || text.includes("instant")) candidates.hubcdn = href;
                   else if (href.includes("fsl") || href.includes("firecdn")) candidates.fsl = href;
                   else if (href.includes("gigachad")) candidates.gigachad = href;
               }

               // PixelDrain (Best - Direct MP4)
               if (candidates.pixeldrain) {
                   if (candidates.pixeldrain.includes("pixeldrain.com/u/")) {
                       const pid = candidates.pixeldrain.split("/u/")[1];
                       return { url: `https://pixeldrain.com/api/file/${pid}`, type: 'mp4' }; 
                   }
               }

               // HubCDN (Proxy MP4)
               if (candidates.hubcdn) {
                   return { url: makeProxyUrl(candidates.hubcdn, hubLink), type: 'mp4' };
               }

               // FSL (Backup - likely MKV)
               const backup = candidates.fsl || candidates.gigachad;
               if (backup) {
                   return { url: makeProxyUrl(backup, hubLink), type: 'file' };
               }
           }
           
           // Direct fallbacks
           const directMatch = hHtml.match(/href=["']([^"']*(?:dot\.clouding|fsl|gigabytes|gigachad)\.[^"']*)["']/i);
           if (directMatch) return { url: makeProxyUrl(directMatch[1], hubLink), type: 'file' };

       } catch(e: any) { scanLog.push(`[x] HubCloud Error: ${e.message}`); }
       return null;
  };

  const extractM3U8 = (html: string): string | null => {
      let m3u8 = html.match(/["']([^"']+\.m3u8[^"']*)["']/);
      if (m3u8) return m3u8[1];
      const packed = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\(['"]\|['"]\)\)\)/);
      if (packed) {
          const unpacked = unpack(packed[0]);
          if (unpacked) {
              const hidden = unpacked.match(/["']([^"']+\.m3u8[^"']*)["']/);
              if (hidden) return hidden[1];
          }
      }
      return null;
  };

  try {
    const response = await fetchWithTimeout(targetUrl, { headers: BASE_HEADERS, cache: 'no-store' }, 10000);
    const html = await response.text();

    let foundUrl: string | null = null;
    let streamType = "unknown";

    // 1. STREAM
    const allMatches = [...html.matchAll(/href=["'](https?:\/\/[^"']*(?:hdstream4u|hubstream|4dstream4u)[^"']*)["']/gi)];
    let streamLink = null;
    
    if (allMatches.length > 0) {
        streamLink = allMatches.length === 1 ? allMatches[0][1] : (episode <= allMatches.length ? allMatches[episode-1][1] : allMatches[0][1]);
    }

    if (streamLink) {
        scanLog.push(`[Stream] Found Provider: ${streamLink}`);
        
        if (streamLink.includes("hubstream.art") || streamLink.includes("hubstream")) {
             scanLog.push(`[⚡] Detected HubStream.`);
             const hubStreamUrl = await processHubStream(streamLink, scanLog);
             if (hubStreamUrl) {
                 foundUrl = hubStreamUrl;
                 streamType = "hls";
                 qualities["HubStream"] = { url: hubStreamUrl, type: "hls" };
                 scanLog.push(`[✅] HubStream Solved!`);
             } else {
                 scanLog.push(`[❌] HubStream Failed.`);
             }
        } 
        else {
            try {
                const res = await fetchWithTimeout(streamLink, { headers: { "User-Agent": USER_AGENT, "Referer": targetUrl } }, 8000);
                const streamHtml = await res.text();
                const m3u8 = extractM3U8(streamHtml);
                if (m3u8) {
                    foundUrl = m3u8;
                    streamType = "hls";
                    qualities["720p (Stream)"] = { url: m3u8, type: "hls" };
                    scanLog.push(`[✅] Stream Solved: ${m3u8}`);
                }
            } catch(e) { scanLog.push(`[❌] Stream Error: ${e}`); }
        }
    }

    // 2. DOWNLOADS (Scan & Solve)
    scanLog.push(`[⬇️] Scanning backups...`);
    const dlRegex = /<a[^>]+href=["'](https?:\/\/(?:gadgetsweb|gdtot|hblinks)[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    const allDlLinks = [...html.matchAll(dlRegex)];
    let targetGateway = null;

    if (allDlLinks.length > 0) {
         const epLinks = allDlLinks.filter(m => {
             const txt = m[2].toLowerCase();
             return (txt.includes("episode") || txt.includes("ep")) && txt.includes(`${episode}`);
         });
         targetGateway = epLinks.length > 0 ? epLinks[0][1] : allDlLinks[0][1];
    }

    if (targetGateway) {
        try {
            let hblinksUrl = targetGateway;
            if (targetGateway.includes("gadgetsweb") || targetGateway.includes("gdtot")) {
                 const solvedLink = await solveGadgetsWeb(targetGateway, targetUrl); 
                 if (solvedLink) hblinksUrl = solvedLink;
            }

            const gRes = await fetchWithTimeout(hblinksUrl, { headers: BASE_HEADERS, redirect: 'follow' }, 12000);
            const gHtml = await gRes.text();

            const qualitySections = [{ q: "1080p", match: /1080p/i }, { q: "720p", match: /720p/i }, { q: "480p", match: /480p/i }];
            const linkRegex = /href=["'](https?:\/\/(?:hubcdn|hubcloud|hubdrive)[^"']+)["']/gi;
            const linksInPage = [...gHtml.matchAll(linkRegex)];
            
            for (const match of linksInPage) {
                const url = match[1];
                const index = match.index!;
                let bestQ = "Unknown";
                const preText = gHtml.substring(0, index);
                
                for (const section of qualitySections) {
                    if (preText.lastIndexOf(section.q) !== -1 && (index - preText.lastIndexOf(section.q)) < 4000) {
                        bestQ = section.q;
                    }
                }

                if (bestQ !== "Unknown") {
                    if (!qualities[bestQ] || url.includes("hubcdn")) {
                        if (url.includes("hubcloud") || url.includes("hubdrive")) {
                             const res = await processHubCloudLink(url);
                             if (res) qualities[bestQ] = res;
                        } else {
                             qualities[bestQ] = { url: makeProxyUrl(url, hblinksUrl), type: "file" };
                        }
                    }
                }
            }
        } catch(e: any) { scanLog.push(`[x] Gateway Error: ${e.message}`); }
    }

    // 3. FALLBACK: MIRRORS
    if (Object.keys(qualities).length === 0) {
        const mirrorRegex = /href=["'](https?:\/\/(?:4khdhub|howblogs)[^"']+)["']/gi;
        let candidates = [...html.matchAll(mirrorRegex)].map(m => m[1]);
        
        for (const mirrorUrl of candidates) {
            if (Object.keys(qualities).length > 0) break;
            try {
                const mRes = await fetchWithTimeout(mirrorUrl, { headers: BASE_HEADERS }, 10000);
                const mHtml = await mRes.text();
                const universalGwRegex = /href=["'](https?:\/\/[^"']+(?:\?|&)id=[a-zA-Z0-9]+[^"']*)["']/gi;
                let allGateways = [...mHtml.matchAll(universalGwRegex)].map(m => m[1]).filter(u => !u.includes("facebook"));

                for (const gatewayUrl of allGateways) {
                    try {
                        const gRes = await fetchWithTimeout(gatewayUrl, { headers: { ...BASE_HEADERS, "Referer": mirrorUrl }, redirect: 'follow' }, 10000);
                        const gHtml = await gRes.text();
                        const encryptedMatch = gHtml.split("s('o','")?.[1]?.split("',180")?.[0];
                        if (encryptedMatch) {
                            const decodedData = decodeString(encryptedMatch);
                            if (decodedData?.o) {
                                const result = await processHubCloudLink(atob(decodedData.o));
                                if (result) {
                                    qualities["Backup"] = result;
                                    break; 
                                }
                            }
                        }
                    } catch(e) {}
                }
            } catch(e) {}
        }
    }

    let bestQuality = qualities["720p (Stream)"] || qualities["HubStream"] || qualities["720p"] || qualities["1080p"] || qualities["480p"] || qualities["Backup"];
    
    if (bestQuality) {
        foundUrl = bestQuality.url;
        streamType = bestQuality.type;
        scanLog.push(`[✅] Selected: ${foundUrl} (${streamType})`);
    }

    if (!foundUrl) {
         isPlayable = false;
         scanLog.push(`[❌] All methods failed.`);
    } else {
         isPlayable = true;
    }

    const jsonResponse = NextResponse.json({ streamUrl: foundUrl, streamType: streamType, qualities: qualities, logs: scanLog, isPlayable });
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return jsonResponse;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}