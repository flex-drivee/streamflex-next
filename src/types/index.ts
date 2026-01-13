// -------------------
// src/types/index.ts
// -------------------

/* ---------- MEDIA TRACK TYPES ---------- */
export interface SubtitleTrack {
  lang: string;   // e.g. "en", "es"
  url: string;    // subtitle VTT URL
  label: string;  // display label
}

export interface AudioTrack {
  lang: string;   // e.g. "en", "es"
  url: string;    // audio stream URL
  label?: string; // display label
}

export interface QualityOpt {
  label: string;  // e.g. "1080p", "720p"
  url: string;    // video URL for that quality
}

export interface SeasonData {
  season_number: number;
  episode_count: number;
  name: string;
}

/* ---------- VIDEO TYPE (Unified TMDb + Local) ---------- */
export interface Video {
  id: string | number;
  title: string;
  description: string;
  thumbnailUrl: string;

  videoUrl?: string;
  duration?: string;
  rating?: number | null;
  trailerUrl?: string;
  genre?: string | string[];
  subtitleTracks?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
  qualities?: QualityOpt[];
  thumbnailsVtt?: string;
  related?: Video[];

  // ✅ Added fields required by VideoDetailModal
  cast?: string[];
  creators?: string[];

  // --- Series details ---
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  year?: number;
  totalSeasons?: number;
  totalEpisodes?: number;

  // --- TMDb fields (Mapped) ---
  overview?: string;
  poster?: string | null;   // Full URL for poster
  backdrop?: string | null; // Full URL for backdrop
  releaseYear?: string | null;
  genres?: string[];
  mediaType?: "movie" | "tv";       // from TMDb
  type?: "movie" | "series";        // internal normalized
  imdb_id?: string;
  tmdbId?: string | number;
  vidlinkType?: "movie" | "tv" | "anime";
  vidlinkSeason?: number;
  vidlinkEpisode?: number;
  vidlinkMALId?: string | number;

  // --- UI Display Fields ---
  releaseDate?: string;  // "Oct 12, 2023"
  firstAirDate?: string; // for TV Shows
  match?: number;        // e.g. 93
  maturityRating?: string; 
  isHD?: boolean; 
  isUHD?: boolean;
  seasons?: SeasonData[]; // Normalized to array of objects

  // --- Raw TMDb fields (Optional fallback) ---
  poster_path?: string | null;
  backdrop_path?: string | null;
  name?: string;
  original_title?: string;
  original_name?: string;
  popularity?: number;
  vote_average?: number;
  release_date?: string;     // Snake_case from raw API
  first_air_date?: string;   // Snake_case from raw API

  // --- Context info ---
  categoryName?: string;
  
  // Index signature for loose typing if strictly needed
  [key: string]: any;
}

/* ---------- CATEGORY TYPE (Config + Data) ---------- */
export interface Category {
  id: string;
  name: string;                     // e.g. "popular"
  title: string;                    // e.g. "Popular"
  categoryType: "movie" | "series" | "webseries"| "anime" | "mixed";
  videos: Video[];
}

/* ---------- APP-WIDE TYPES ---------- */
export enum Language {
  EN = "en",
  ES = "es",
  FR = "fr",
  DE = "de",
  ZH = "zh",
}

export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  token: string;
  expiresAt: number;
  name?: string;
  avatar?: string; // ✅ Renamed from 'avatarUrl' to match auth.ts
}