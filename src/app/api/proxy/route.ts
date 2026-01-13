import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Match Android App UA exactly
const API_USER_AGENT = "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36";

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  
  if (!urlParam) return new NextResponse("Missing URL", { status: 400 });

  let url = urlParam.startsWith("http") ? urlParam : decodeURIComponent(urlParam);

  if (url.startsWith("/")) {
      url = `https://net51.cc${url}`;
  }

  try {
    const targetUrlObj = new URL(url);
    const hostname = targetUrlObj.hostname;
    const globalInToken = targetUrlObj.searchParams.get('in');
    
    // Broad Ecosystem Check
    const isNetMirror = hostname.includes('net51') || hostname.includes('net20') || 
                        hostname.includes('freecdn') || hostname.includes('s21') || 
                        hostname.includes('nm-cdn') || hostname.includes('top');

    const headers: HeadersInit = {
      'User-Agent': API_USER_AGENT,
      'Accept': '*/*', 
      'Connection': 'keep-alive',
      'Accept-Encoding': 'identity',
    };

    if (isNetMirror) {
        if (url.includes('.m3u8')) {
            // 🛑 SELF-REFERER STRATEGY (Matches Kotlin App)
            // The Referer must be the URL of the file itself + "/"
            headers['Referer'] = url + '/';
            headers['Cookie'] = 'hd=on';
        } else {
            // For segments, fallback to root referer as we can't easily guess the parent M3U8
            headers['Referer'] = 'https://net51.cc/';
            // No cookies for segments
        }
    }

    if (req.headers.get('range')) headers['Range'] = req.headers.get('range')!;

    // 2. FETCH
    let response = await fetch(url, { 
        headers,
        redirect: 'manual', 
        cache: 'no-store'
    });

    // 3. HANDLE REDIRECTS
    let redirectCount = 0;
    while (response.status >= 300 && response.status < 400 && redirectCount < 5) {
        const location = response.headers.get('location');
        if (!location) break;

        const newUrl = new URL(location, url).toString();
        // console.log(`[Proxy] Redirect: ${url} -> ${newUrl}`);
        
        const newHeaders = { ...headers };
        
        if (isNetMirror) {
            if (newUrl.includes('.m3u8')) {
                // Update Self-Referer for the new URL
                newHeaders['Referer'] = newUrl + '/';
                newHeaders['Cookie'] = 'hd=on';
            } else {
                newHeaders['Referer'] = 'https://net51.cc/';
                delete newHeaders['Cookie'];
            }
        }

        response = await fetch(newUrl, {
            headers: newHeaders,
            redirect: 'manual',
            cache: 'no-store'
        });
        
        url = newUrl;
        redirectCount++;
    }

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Proxy] Upstream Error ${response.status}: ${errText.substring(0, 100)}`);
        return new NextResponse(`Upstream Error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || "";

    // 4. M3U8 REWRITER
    if (url.includes('.m3u8') || contentType.includes('mpegurl')) {
        const text = await response.text();

        if (!text.includes('#EXTM3U')) {
             console.error("[Proxy] Invalid Playlist received");
             return new NextResponse("Invalid Playlist", { status: 502 });
        }

        const finalUrl = url; 
        const finalUrlObj = new URL(finalUrl);
        const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
        const myOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

        const wrapUrl = (target: string) => {
             let absUrl = target.trim();
             
             if (!absUrl.startsWith('http')) {
                 if (absUrl.startsWith('//')) absUrl = `https:${absUrl}`;
                 else if (absUrl.startsWith('/')) absUrl = `${finalUrlObj.origin}${absUrl}`;
                 else absUrl = `${basePath}${absUrl}`;
             }

             if (absUrl.includes('https:///files/')) absUrl = absUrl.replace('https:///files/', 'https://net51.cc/files/');
             // Kotlin App removes /tv/ from paths
             if (absUrl.includes('/tv/')) absUrl = absUrl.replace('/tv/', '/');

             // 🛑 TOKEN PROPAGATION
             // Ensure the 'in' token is passed to segments if missing
             if (globalInToken && !absUrl.includes('in=')) {
                 const separator = absUrl.includes('?') ? '&' : '?';
                 absUrl = `${absUrl}${separator}in=${encodeURIComponent(globalInToken)}`;
             }

             return `${myOrigin}/api/proxy?url=${encodeURIComponent(absUrl)}`;
        };

        const rewrittenLines = text.split('\n').map(line => {
             let trimmed = line.trim();
             if (trimmed.startsWith('#EXT-X-MEDIA') && trimmed.includes('///files/')) return ''; 
             if (trimmed.startsWith('#EXT-X-KEY')) return trimmed.replace(/URI="([^"]+)"/, (match, u) => `URI="${wrapUrl(u)}"`);
             if (trimmed.startsWith('#') || trimmed === '') return trimmed;
             return wrapUrl(trimmed);
        }).filter(line => line !== '');

        return new NextResponse(rewrittenLines.join('\n'), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            } 
        });
    }

    // 5. BINARY STREAMING
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.delete('Content-Length');
    newHeaders.delete('Content-Encoding');

    if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.ts')) {
        newHeaders.set('Content-Type', 'video/mp2t'); 
    }
    if (url.includes('key.php') || url.endsWith('.key')) {
        newHeaders.set('Content-Type', 'application/octet-stream');
    }

    return new NextResponse(response.body as any, { status: response.status, headers: newHeaders });

  } catch (e: any) {
    return new NextResponse(`Proxy Error: ${e.message}`, { status: 500 });
  }
}