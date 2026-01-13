// src/lib/providers.ts

export const providers = {
  // 1. HDO (Extracted from HDO.kt)
  // Easiest one: Just fetch the JSON
  hdo: async (tmdbId: string, season?: number, episode?: number) => {
    try {
      const type = season ? 'tv' : 'movie';
      const sParams = season ? `&season=${season}&episode=${episode}` : '';
      const url = `https://hdo-cncverse.vercel.app/api/stream?tmdb=${tmdbId}&type=${type}${sParams}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      // Return the first working m3u8 link found
      return data.results?.find((r: any) => r.url)?.url || null;
    } catch (e) {
      console.error("HDO Error:", e);
      return null;
    }
  }
};