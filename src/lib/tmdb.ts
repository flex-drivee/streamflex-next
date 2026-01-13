import { type Video } from "@/types/index";

// ✅ Export constants at the top so other files (like tmdbLists.ts) can use them safely
export const IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_BASE = process.env.NEXT_PUBLIC_TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
const KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!KEY && typeof window !== "undefined") {
  console.warn("⚠️ TMDB API Key missing. Check .env.local");
}

export type TmdbMeta = {
  id: number;
  title: string;
  overview?: string;
  poster?: string | null;
  backdrop?: string | null;
  genres: string[];
  rating?: number | null;
  releaseYear?: string | null;
  releaseDate?: string; 
  firstAirDate?: string;
  cast?: string[];
  creators?: string[];
  runtime?: number;
  totalSeasons?: number;
  match?: number;
  maturityRating?: string;
  duration?: string;
  isHD?: boolean;
  isUHD?: boolean;
  imdb_id?: string;
  tmdbId?: number;
  mediaType?: "movie" | "tv";
  vidlinkType?: "movie" | "tv";
  related?: Video[]; 
  seasons?: {
      season_number: number;
      episode_count: number;
      name: string;
  }[];
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  air_date?: string;
  runtime?: number;
  vote_average: number; 
};

// Simple in-memory cache for details (Client Side Only)
const CACHE_TTL = 1000 * 60 * 15; 
const cache = new Map<string, { ts: number; data: TmdbMeta }>();

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts > CACHE_TTL) cache.delete(key);
  }
}

function formatDuration(minutes?: number): string {
    if (!minutes) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

function getMaturityRating(data: any, kind: "movie" | "tv"): string | undefined {
    let rating = undefined;
    if (kind === "movie" && data.release_dates?.results) {
        const usRelease = data.release_dates.results.find((r: any) => r.iso_3166_1 === "US");
        if (usRelease?.release_dates?.length > 0) {
            const cert = usRelease.release_dates.find((d: any) => d.certification);
            if (cert) rating = cert.certification;
        }
    } else if (kind === "tv" && data.content_ratings?.results) {
        const usRating = data.content_ratings.results.find((r: any) => r.iso_3166_1 === "US");
        if (usRating?.rating) rating = usRating.rating;
    }
    return rating;
}

// ✅ Mapper: Converts raw TMDB data to our Video interface
function mapTmdbToVideo(item: any): Video {
  const isMovie = item.media_type === 'movie' || item.title;
  return {
    id: item.id,
    tmdbId: item.id,
    title: item.title || item.name || "Unknown",
    description: item.overview || "",
    poster: item.poster_path ? `${IMAGE_BASE}/w500${item.poster_path}` : undefined,
    backdrop: item.backdrop_path ? `${IMAGE_BASE}/original${item.backdrop_path}` : undefined,
    thumbnailUrl: item.poster_path ? `${IMAGE_BASE}/w500${item.poster_path}` : "",
    mediaType: isMovie ? 'movie' : 'tv',
    vidlinkType: isMovie ? 'movie' : 'tv',
    rating: item.vote_average,
    match: item.vote_average ? Math.round(item.vote_average * 10) : 0,
    releaseYear: (item.release_date || item.first_air_date || "").substring(0, 4),
    releaseDate: item.release_date,
    firstAirDate: item.first_air_date,
    genres: [],
    isHD: true,
    maturityRating: undefined 
  };
}

// ✅ Fetch Full Details (Used by Modal)
export async function fetchTmdb(
  id: number,
  kind: "movie" | "tv" = "movie"
): Promise<TmdbMeta> {
  cleanupCache();
  const now = Date.now();
  const cacheKey = `${kind}-${id}`;
  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

  if (!KEY) throw new Error("[TMDB] Missing API key");

  const url = `${API_BASE}/${kind}/${id}?api_key=${KEY}&language=en-US&append_to_response=external_ids,credits,recommendations,similar,release_dates,content_ratings`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache on server for 1 hour
    
    if (!res.ok) {
        throw new Error(`[TMDB] Fetch failed (${res.status})`);
    }

    const d = await res.json();

    const title = d.title || d.name || "Untitled";
    const overview = d.overview || "";
    const poster = d.poster_path ? `${IMAGE_BASE}/w500${d.poster_path}` : null;
    const backdrop = d.backdrop_path
      ? `${IMAGE_BASE}/original${d.backdrop_path}`
      : null;
    const genres = Array.isArray(d.genres) ? d.genres.map((g: any) => g.name) : [];
    const rating =
      typeof d.vote_average === "number"
        ? Number(d.vote_average.toFixed(1))
        : null;

    const releaseYear =
      (d.release_date && d.release_date.slice(0, 4)) ||
      (d.first_air_date && d.first_air_date.slice(0, 4)) ||
      null;
      
    const imdb_id =
      d.imdb_id ||
      (d.external_ids && d.external_ids.imdb_id) ||
      undefined;

    let seasons = [];
    if (kind === 'tv' && d.seasons) {
        seasons = d.seasons
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
              season_number: s.season_number,
              episode_count: s.episode_count,
              name: s.name
          }));
    }

    const cast = d.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [];
    const creators = d.created_by?.map((c: any) => c.name) 
      || d.credits?.crew?.filter((c: any) => c.job === "Director").map((c: any) => c.name) 
      || [];
    const realRuntime = d.runtime || (d.episode_run_time ? d.episode_run_time[0] : null);
    
    const maturityRating = getMaturityRating(d, kind);

    const relatedRaw = d.recommendations?.results?.length 
        ? d.recommendations.results 
        : d.similar?.results || [];

    const related = relatedRaw
        .filter((item: any) => item.poster_path || item.backdrop_path)
        .slice(0, 12)
        .map(mapTmdbToVideo); 

    const meta: TmdbMeta = {
      id,
      title,
      overview,
      poster,
      backdrop,
      genres,
      rating,
      releaseYear,
      releaseDate: d.release_date,
      firstAirDate: d.first_air_date,
      cast,
      creators,
      runtime: realRuntime,
      totalSeasons: d.number_of_seasons || null,
      match: rating ? Math.round(rating * 10) : 0,
      maturityRating: maturityRating,
      duration: formatDuration(realRuntime),
      isHD: true,
      isUHD: false,
      imdb_id,
      tmdbId: id,
      mediaType: kind,
      vidlinkType: kind,
      seasons: seasons.length > 0 ? seasons : undefined,
      related
    };

    cache.set(cacheKey, { ts: now, data: meta });
    return meta;
  } catch (err: any) {
    console.error(`[TMDB] Error fetching details for ${id}:`, err);
    throw err;
  }
}

// ✅ Fetch Season Episodes (Client Side mostly)
export async function fetchSeasonDetails(tvId: number, seasonNumber: number): Promise<Episode[]> {
  if (!KEY) return [];
  const url = `${API_BASE}/tv/${tvId}/season/${seasonNumber}?api_key=${KEY}&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.episodes || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      overview: e.overview,
      still_path: e.still_path ? `${IMAGE_BASE}/w500${e.still_path}` : null,
      episode_number: e.episode_number,
      season_number: e.season_number,
      air_date: e.air_date,
      runtime: e.runtime,
      vote_average: e.vote_average || 0
    }));
  } catch (e) {
    return [];
  }
}

export async function searchTmdb(query: string) {
  if (!KEY) return [];
  // Added &include_adult=false
  const url = `${API_BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || [])
      // ✅ Strict Filter
      .filter((item: any) => !item.adult) 
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map(mapTmdbToVideo);
  } catch (e) {
    return [];
  }
}

// ✅ Fallback Trending (Updated)
export async function getTrendingTmdb() {
  if (!KEY) return [];
  const url = `${API_BASE}/trending/all/week?api_key=${KEY}&language=en-US`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    return (data.results || [])
      // ✅ Strict Filter (Trending endpoint ignores parameter, so we MUST filter here)
      .filter((item: any) => !item.adult)
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map(mapTmdbToVideo);
  } catch (e) {
    return [];
  }
}