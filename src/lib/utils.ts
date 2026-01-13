import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Transition } from "framer-motion";
import type { Video } from "@/types/index";

// ------------------------------------------------------------------
// 1. Tailwind Helper (cn)
// ------------------------------------------------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ------------------------------------------------------------------
// 2. Animation Config (Framer Motion)
// ------------------------------------------------------------------
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const modalTransition: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 25,
};

// ------------------------------------------------------------------
// 3. Helper: Extract Real Certification (US Only for consistency)
// ------------------------------------------------------------------
function getRealMaturityRating(raw: any, type: "movie" | "tv"): string | undefined {
  // If it was already processed/passed
  if (raw.maturityRating) return raw.maturityRating;

  // 1. Movies: Look inside release_dates
  if (type === "movie" && raw.release_dates?.results) {
    const usRelease = raw.release_dates.results.find((r: any) => r.iso_3166_1 === "US");
    // Find the theatrical release (release_type 3) or digital (4), otherwise take the first available
    if (usRelease?.release_dates) {
        const cert = usRelease.release_dates.find((d: any) => d.certification && d.certification !== "");
        return cert ? cert.certification : undefined;
    }
  }

  // 2. TV: Look inside content_ratings
  if (type === "tv" && raw.content_ratings?.results) {
    const usRating = raw.content_ratings.results.find((r: any) => r.iso_3166_1 === "US");
    return usRating?.rating || undefined;
  }

  return undefined;
}

// ------------------------------------------------------------------
// 4. Video Normalization Logic (Strict Mode)
// ------------------------------------------------------------------
export function normalizeVideo(raw: any): Video {
  if (!raw) {
      throw new Error("normalizeVideo: received null or undefined");
  }

  // Stable ID generation
  const id = String(raw.id || raw.tmdbId || raw.videoId || `vid_${Date.now()}`);

  // Determine Media Type
  const isMovie = raw.media_type === 'movie' || raw.type === 'movie' || !!raw.title;
  const mediaType = raw.media_type || (isMovie ? 'movie' : 'tv');

  // ✅ REAL MATCH SCORE: Strictly based on User Vote (0-10) -> Percentage
  const voteAverage = Number(raw.vote_average || raw.rating || 0);
  const matchScore = voteAverage > 0 ? Math.round(voteAverage * 10) : 0; // e.g. 7.4 -> 74%

  // ✅ REAL MATURITY RATING: Attempt to extract, otherwise Undefined (Don't guess)
  const maturityRating = getRealMaturityRating(raw, mediaType);

  // ✅ HD Status: Assume HD for modern content (metadata doesn't provide quality)
  // We do NOT assume UHD/4K based on popularity anymore.
  const isHD = true; 
  const isUHD = false; // Only show 4K badge if we truly know (which we don't from this API)

  // Release Year
  const releaseYear = 
    raw.releaseYear ?? 
    raw.release_date?.slice(0, 4) ?? 
    raw.first_air_date?.slice(0, 4) ?? 
    null;

  return {
    ...raw,
    id,
    tmdbId: raw.id, // Ensure TMDB ID is preserved
    title: raw.title ?? raw.name ?? "Untitled",
    description: raw.description ?? raw.overview ?? "",
    videoUrl: raw.videoUrl ?? "",
    thumbnailUrl: raw.thumbnailUrl ?? raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : "",
    
    // Standardized Fields
    mediaType,
    vidlinkType: mediaType, // Default to same as mediaType
    rating: voteAverage,
    match: matchScore, // Now strictly vote-based
    maturityRating,    // Now strictly data-based or undefined
    isHD,
    isUHD,
    releaseYear,
    
    // Arrays
    genres: raw.genres || [],
    cast: raw.cast || [],
    creators: raw.creators || [],
    
    // Legacy / Raw fields preservation
    poster: raw.poster || (raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : undefined),
    backdrop: raw.backdrop || (raw.backdrop_path ? `https://image.tmdb.org/t/p/original${raw.backdrop_path}` : undefined),
  } as Video;
}

export const getSeriesInfo = (video: Video): string | null => {
  if (video.mediaType !== "tv" && video.type !== "series") return null;
  if (!video.seasonNumber || !video.episodeNumber) return null;
  return `Season ${video.seasonNumber}, Episode ${video.episodeNumber}${
    video.episodeTitle ? ` - ${video.episodeTitle}` : ""
  }`;
};