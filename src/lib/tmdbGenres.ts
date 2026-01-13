// -----------------------------
// src/lib/tmdbGenres.ts
// -----------------------------

const API_BASE = process.env.NEXT_PUBLIC_TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
const KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!KEY && process.env.NODE_ENV === "development") {
  console.warn("[TMDB] NEXT_PUBLIC_TMDB_API_KEY not set. Genre lookups may fail.");
}

// --- Official TMDb Movie Genres ---
export const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

// --- Official TMDb TV Genres ---
export const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

/**
 * Converts an array of genre IDs into readable names.
 * Safely handles missing IDs and falls back to ["Unknown"] if none found.
 *
 * @param genreIds - Array of TMDb genre IDs (e.g., [28, 12])
 * @param mediaType - Either "movie" or "tv" (default: "movie")
 */
export function mapGenreIdsToNames(
  genreIds: number[] = [],
  mediaType: "movie" | "tv" = "movie"
): string[] {
  if (!Array.isArray(genreIds) || genreIds.length === 0) return [];

  const genreMap = mediaType === "tv" ? TV_GENRES : MOVIE_GENRES;
  const names = genreIds
    .map(id => genreMap[id])
    .filter((name): name is string => typeof name === "string");

  return names.length > 0 ? names : ["Unknown"];
}

/**
 * Fetches the latest genre mapping directly from TMDb.
 * Adds timeout + network error handling for production reliability.
 *
 * @param mediaType - "movie" or "tv"
 * @returns Promise resolving to an array of genres (id + name)
 */
export async function fetchGenresFromTmdb(
  mediaType: "movie" | "tv" = "movie"
): Promise<{ id: number; name: string }[]> {
  if (!KEY) throw new Error("[TMDB] Missing API key");

  const url = `${API_BASE}/genre/${mediaType}/list?api_key=${KEY}&language=en-US`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, { 
        signal: controller.signal,
        next: { revalidate: 86400 } // ✅ Cache for 24 hours (86400 seconds)
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`[TMDB] Failed to fetch genres (${res.status})`);
    }

    const data = await res.json();
    if (!Array.isArray(data.genres)) return [];

    return data.genres;
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("[TMDB] Genre fetch timeout");
    throw new Error(`[TMDB] ${err.message || "Unknown error fetching genres"}`);
  }
}