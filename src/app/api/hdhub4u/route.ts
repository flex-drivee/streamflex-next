import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { getHDHub4uUrl } from '@/lib/utils/providers';

interface HDHub4uItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  altText: string;
  qualities: string[];
  languages: string[];
  year?: string;
}

function normalizeImageUrl(url: string | undefined): string {
  if (!url) return 'https://placehold.co/300x450?text=No+Image';
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

function extractMetadata(title: string) {
    return {
        qualities: ['4K', '2160p', '1080p', '720p', '480p'].filter(q => title.includes(q)),
        languages: ['Hindi', 'English', 'Tamil', 'Telugu', 'Dual Audio'].filter(l => title.includes(l)),
        year: title.match(/\((\d{4})\)/)?.[1]
    };
}

async function scrapeHDHub4u(url: string): Promise<HDHub4uItem[]> {
  try {
    console.log(`[HDHub] Fetching: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const html = await response.text();
    const $ = load(html);

    // 🛑 DEBUGGING: PRINT PAGE INFO
    const pageTitle = $('title').text();
    const bodyClass = $('body').attr('class') || 'No Body Class';
    console.log(`[HDHub] Page Title: "${pageTitle}"`);
    console.log(`[HDHub] Body Classes: "${bodyClass}"`);

    if (pageTitle.includes("Just a moment") || pageTitle.includes("Cloudflare")) {
        console.error("❌ [HDHub] BLOCKED BY CLOUDFLARE");
        return [];
    }

    const items: HDHub4uItem[] = [];
    const uniqueIds = new Set<string>();

    // 1. ATTEMPT STRICT SELECTORS (Best Quality)
    const selectors = [
        '.recent-movies li.thumb',
        '.latest-posts article',
        'article.post',
        '.result-item',
        'div.post-item'
    ];

    let foundSelector = '';
    for (const sel of selectors) {
        if ($(sel).length > 0) {
            foundSelector = sel;
            console.log(`✅ [HDHub] Strict Selector Matched: "${sel}"`);
            break;
        }
    }

    // 2. UNIVERSAL FALLBACK (If strict fails, grab ANY link with an image)
    // This is the "Nuclear Option" that works on almost any site.
    let selection = foundSelector ? $(foundSelector) : $('a:has(img)');

    if (!foundSelector) {
        console.warn("⚠️ [HDHub] Strict selectors failed. Running Universal Scraper...");
        console.log(`[HDHub] Found ${selection.length} potential links with images.`);
    }

    selection.each((_, element) => {
      const $element = $(element);
      
      // Smart Context Switching
      // If we matched a wrapper (like <article>), search INSIDE it.
      // If we matched the link directly (Universal mode), use IT.
      const isWrapper = foundSelector && $element.prop('tagName') !== 'A';
      
      const linkTag = isWrapper ? $element.find('a').first() : $element;
      const imgTag = isWrapper ? $element.find('img').first() : $element.find('img').first();
      
      const postUrl = linkTag.attr('href');
      const imageUrl = normalizeImageUrl(imgTag.attr('src') || imgTag.attr('data-src') || imgTag.attr('data-original'));
      
      // Title Heuristics: Alt text > Title Attr > Text Content
      let title = imgTag.attr('alt') || 
                  imgTag.attr('title') || 
                  (isWrapper ? $element.find('p, h2, h3, .title').text() : $element.text());
      
      title = title?.trim();

      // VALIDATION: Must have Title, URL, and NOT be a navigation link
      if (title && postUrl && 
          !postUrl.includes('/page/') && 
          !postUrl.includes('/category/') &&
          !postUrl.includes('whatsapp') &&
          !postUrl.includes('telegram') &&
          title.length > 5) {

        if (!uniqueIds.has(postUrl)) {
            uniqueIds.add(postUrl);
            const meta = extractMetadata(title);
            items.push({
              id: postUrl, 
              title,
              imageUrl,
              postUrl,
              altText: title,
              qualities: meta.qualities,
              languages: meta.languages,
              year: meta.year
            });
        }
      }
    });

    console.log(`[HDHub] Extracted ${items.length} valid items.`);
    
    // DEBUG: If still 0, dump the first 5 links we found to see what's wrong
    if (items.length === 0) {
        console.log("🔍 [HDHub] DEBUG DUMP - First 3 Links Found on Page:");
        $('a').slice(0, 3).each((_, el) => {
            console.log(`   - Text: "${$(el).text().trim()}" | Href: "${$(el).attr('href')}"`);
        });
    }

    return items;
  } catch (error) {
    console.error('[HDHub] Scrape Error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    const baseUrl = await getHDHub4uUrl();
    
    let targetUrl = baseUrl;
    if (searchQuery) {
        targetUrl = `${baseUrl}/?s=${encodeURIComponent(searchQuery)}`;
        if (page > 1) targetUrl += `&paged=${page}`; 
    } else {
        targetUrl = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;
    }

    const items = await scrapeHDHub4u(targetUrl);

    if (items.length === 0) {
        return NextResponse.json({
            success: false, 
            error: 'No content found',
            message: searchQuery ? `No results for "${searchQuery}"` : 'Homepage empty or Scraper Blocked'
        });
    }

    return NextResponse.json({
      success: true,
      data: items, 
      totalResults: items.length
    });

  } catch (error: any) {
    console.error('[HDHub API] Critical Error:', error);
    return NextResponse.json({ 
        success: false, 
        error: 'Server Error', 
        message: error.message 
    }, { status: 500 });
  }
}