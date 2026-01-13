// -----------------------------
// src/lib/tmdbLists.ts
// -----------------------------
import { IMAGE_BASE } from "@/lib/tmdb"; 

// ✅ Next.js Env Vars
const API_BASE = process.env.NEXT_PUBLIC_TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
const KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY as string | undefined;

if (!KEY) {
  if (process.env.NODE_ENV === "development") {
    console.error("[TMDB] Missing NEXT_PUBLIC_TMDB_API_KEY — create a .env.local file and add it.");
  } else {
    console.warn("[TMDB] Missing TMDB API key — API calls may fail in production.");
  }
}

export type TmdbListItem = {
  id: number;
  title: string;
  overview?: string;
  poster?: string | null;
  backdrop?: string | null;
  rating?: number | null;
  releaseYear?: string | null;
  mediaType?: "movie" | "tv";
};

function normalize(item: any): TmdbListItem {
  return {
    id: item.id,
    title: item.title || item.name || "Untitled",
    overview: item.overview || "",
    poster: item.poster_path ? `${IMAGE_BASE}/w500${item.poster_path}` : null,
    backdrop: item.backdrop_path ? `${IMAGE_BASE}/original${item.backdrop_path}` : null,
    rating: typeof item.vote_average === "number" ? Number(item.vote_average.toFixed(1)) : null,
    releaseYear: item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || null,
    mediaType: item.media_type || (item.first_air_date ? "tv" : "movie"),
  };
}

// ✅ Generic Fetcher (With Strict Adult Filter)
async function fetchTmdbList(
  endpoint: string,
  page = 1,
  language = "en-US"
): Promise<TmdbListItem[]> {
  if (!KEY) return []; 

  const separator = endpoint.includes("?") ? "&" : "?";
  
  // Always enforce safe search
  const url = `${API_BASE}${endpoint}${separator}api_key=${KEY}&language=${language}&page=${page}&include_adult=false`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); 

  try {
    const res = await fetch(url, { 
        signal: controller.signal,
        next: { revalidate: 3600 } 
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`[TMDB] Failed to fetch ${endpoint} (${res.status})`);

    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results
      .filter((item: any) => item.adult !== true) // Double check safety
      .map(normalize);

  } catch (err: any) {
    if (err.name === "AbortError") {
        console.warn(`[TMDB] Timeout fetching ${endpoint}`);
        return [];
    }
    console.error(`[TMDB] Network error: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ✅ UPDATED Category Map
export const tmdbListEndpoints = {
  // --- Special Collections ---
  mixed: "mixed", 
  top10: "/trending/all/week", 

  // --- Regional Content ---
  bollywood: "/discover/movie?with_original_language=hi&sort_by=popularity.desc&region=IN",
  koreanSeries: "/discover/tv?with_original_language=ko&sort_by=popularity.desc",
  
  // ✅ MODIFIED: Korean Movies (Action|Fantasy|Horror|Thriller only)
  // Genres: 28=Action, 14=Fantasy, 27=Horror, 53=Thriller
  koreanMovies: "/discover/movie?with_original_language=ko&with_genres=28|14|27|53&sort_by=popularity.desc",
  
  indianMovies: "/discover/movie?with_origin_country=IN&sort_by=popularity.desc",

  // --- Standard Lists ---
  trendingMovies: "/trending/movie/week",
  trendingSeries: "/trending/tv/week",
  popular: "/movie/popular",
  toprated: "/movie/top_rated",
  nowplaying: "/movie/now_playing",
  upcoming: "/movie/upcoming",
  
  // --- Genres ---
  action: "/discover/movie?with_genres=28",
  comedy: "/discover/movie?with_genres=35",
  horror: "/discover/movie?with_genres=27",
  romance: "/discover/movie?with_genres=10749",
  documentary: "/discover/movie?with_genres=99",
  scifi: "/discover/movie?with_genres=878",
  animation: "/discover/movie?with_genres=16",
  netflix: "/discover/tv?with_networks=213",
};

export async function fetchTmdbCategory(
  category: keyof typeof tmdbListEndpoints,
  page = 1
) {
  const endpoint = tmdbListEndpoints[category];
  if (!endpoint) throw new Error(`[TMDB] Invalid category: ${category}`);

  // --- Mixed (trending movies + series) ---
  if (category === "mixed") {
    const [movies, series] = await Promise.all([
      fetchTmdbList(tmdbListEndpoints.trendingMovies, page),
      fetchTmdbList(tmdbListEndpoints.trendingSeries, page),
    ]);

    const merged = [...movies, ...series].filter(
      (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
    );

    merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return merged;
  }

  return fetchTmdbList(endpoint, page);
}

// ✅ Named exports
export const fetchTop10 = () => fetchTmdbCategory("top10");
export const fetchBollywood = () => fetchTmdbCategory("bollywood");
export const fetchKDramas = () => fetchTmdbCategory("koreanSeries");
export const fetchTrending = () => fetchTmdbCategory("mixed");
export const fetchPopularMovies = () => fetchTmdbCategory("popular");
export const fetchTopRatedMovies = () => fetchTmdbCategory("toprated");
export const fetchNowPlaying = () => fetchTmdbCategory("nowplaying");
export const fetchUpcoming = () => fetchTmdbCategory("upcoming");
export const fetchActionAdventureMovies = () => fetchTmdbCategory("action");
export const fetchComedyMovies = () => fetchTmdbCategory("comedy");
export const fetchHorrorMovies = () => fetchTmdbCategory("horror");
export const fetchRomanceMovies = () => fetchTmdbCategory("romance");
export const fetchDocumentaries = () => fetchTmdbCategory("documentary");
export const fetchSciFiMovies = () => fetchTmdbCategory("scifi");
export const fetchAnimationMovies = () => fetchTmdbCategory("animation");
export const fetchNewOnNetflix = () => fetchTmdbCategory("netflix");