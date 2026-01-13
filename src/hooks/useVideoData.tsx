"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useQueries } from "@tanstack/react-query";
import type { Category, Video } from "@/types/index";
import { CATEGORY_CONFIG } from "@/config/categories";

const DEV = process.env.NODE_ENV === "development";

// --- Types ---
export interface VideoDataContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  getVideoById: (id: string | number) => Video | undefined;
  getCategoryVideos: (categoryId: string) => Video[];
  ensureCategoryLoaded: (categoryId: string) => Promise<Video[]>;
  watchLater: Record<string, Video>;
  liked: Record<string, Video>;
  watchHistory: Video[];
  toggleWatchLater: (video: Video) => void;
  toggleLiked: (video: Video) => void;
  saveToHistory: (video: Video) => void;
  isInWatchLater: (id: string | number) => boolean;
  isLiked: (id: string | number) => boolean;
}

// ✅ Export Context
export const VideoDataContext = createContext<VideoDataContextType | undefined>(undefined);

// --- Helpers (Outside component to avoid parser confusion) ---

const normalizeVideo = (v: Video): Video => ({
  ...v,
  id: String(v.id ?? ""),
  title: v.title ?? v.name ?? "Untitled",
  description: v.description ?? v.overview ?? "",
  rating: typeof v.rating === "number" ? v.rating : (v.vote_average ? Number(v.vote_average) : undefined),
  match: v.match ?? Math.min(100, Math.round(((v.vote_average || 0) * 10 + (v.popularity ? Math.min(v.popularity / 10, 100) : 50)) / 2)),
  maturityRating: v.maturityRating ?? (v.adult ? "A" : (v.vote_average && v.vote_average >= 7.5 ? "U/A 16+" : "U/A 13+")),
  isHD: typeof v.isHD === "boolean" ? v.isHD : (v.vote_average ? v.vote_average >= 6.5 : false),
  isUHD: typeof v.isUHD === "boolean" ? v.isUHD : (v.popularity ? v.popularity >= 80 : false),
  releaseYear: v.releaseYear ?? v.release_date?.slice(0, 4) ?? v.first_air_date?.slice(0, 4) ?? null,
  genre: v.genre ?? v.genres ?? (typeof v.categoryName === "string" ? [v.categoryName] : []),
});

const loadFromStorage = (key: string, fallback: any) => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key: string, data: any) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    if (DEV) console.warn(`[VideoDataContext] Failed to persist ${key}`);
  }
};

// --- Provider ---
export const VideoDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [watchLater, setWatchLater] = useState<Record<string, Video>>({});
  const [liked, setLiked] = useState<Record<string, Video>>({});
  const [watchHistory, setWatchHistory] = useState<Video[]>([]);
  const [videoIndex, setVideoIndex] = useState<Record<string, Video>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mounted, setMounted] = useState(false);

  // Hydrate on mount
  useEffect(() => {
    setWatchLater(loadFromStorage("watchLater", {}));
    setLiked(loadFromStorage("liked", {}));
    setWatchHistory(loadFromStorage("watchHistory", []));
    setMounted(true);
  }, []);

  // Queries
  const categoryQueries = useQueries({
    queries: CATEGORY_CONFIG.map((cat) => ({
      queryKey: ["category", cat.id],
      queryFn: cat.fetcher,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const loading = categoryQueries.some((q) => q.isLoading);
  const error = categoryQueries.find((q) => q.error)
    ? String(categoryQueries.find((q) => q.error)?.error)
    : null;

  // Memoize Categories
  const categories: Category[] = useMemo(() => {
    if (!categoryQueries.length) return [];
    return CATEGORY_CONFIG.map((cat, idx) => {
      const rawVideos = (categoryQueries[idx]?.data as Video[]) ?? [];
      return {
        id: cat.id,
        name: cat.name,
        title: cat.title,
        category: cat.category,
        categoryType: cat.categoryType,
        videos: rawVideos.map(normalizeVideo),
      };
    });
  }, [categoryQueries]);

  // Indexing
  useEffect(() => {
    if (!categories.length) return;
    const allVideos: Record<string, Video> = {};
    for (const cat of categories) {
      for (const v of cat.videos) {
        allVideos[String(v.id)] = v;
      }
    }
    setVideoIndex(allVideos);
  }, [categories]);

  // --- Actions (Explicitly formatted to prevent TSX errors) ---

  const getVideoById = useCallback(
    (id: string | number) => {
      return videoIndex[String(id)];
    },
    [videoIndex]
  );
  
  const getCategoryVideos = useCallback(
    (categoryId: string) => {
      return categories.find((c) => c.id === categoryId)?.videos ?? [];
    }, 
    [categories]
  );

  const ensureCategoryLoaded = useCallback(
    async (categoryId: string) => {
      const cat = CATEGORY_CONFIG.find((c) => c.id === categoryId);
      if (!cat) return [];
      try {
        const data = await cat.fetcher();
        return (Array.isArray(data) ? data : []).map(normalizeVideo);
      } catch (err) {
        if (DEV) console.warn(`[ensureCategoryLoaded] Failed:`, err);
        return [];
      }
    }, 
    []
  );

  const toggleWatchLater = useCallback(
    (video: Video) => {
      setWatchLater((prev) => {
        const updated = { ...prev };
        const key = String(video.id);
        updated[key] ? delete updated[key] : (updated[key] = normalizeVideo(video));
        saveToStorage("watchLater", updated);
        return updated;
      });
    }, 
    []
  );

  const toggleLiked = useCallback(
    (video: Video) => {
      setLiked((prev) => {
        const updated = { ...prev };
        const key = String(video.id);
        updated[key] ? delete updated[key] : (updated[key] = normalizeVideo(video));
        saveToStorage("liked", updated);
        return updated;
      });
    }, 
    []
  );

  const saveToHistory = useCallback(
    (video: Video) => {
      setWatchHistory((prev) => {
        const updated = [normalizeVideo(video), ...prev.filter((v) => String(v.id) !== String(video.id))].slice(0, 50);
        saveToStorage("watchHistory", updated);
        return updated;
      });
    }, 
    []
  );

  const isInWatchLater = useCallback(
    (id: string | number) => !!watchLater[String(id)], 
    [watchLater]
  );

  const isLiked = useCallback(
    (id: string | number) => !!liked[String(id)], 
    [liked]
  );

  const value = useMemo(
    () => ({
      categories,
      loading,
      error,
      getVideoById,
      getCategoryVideos,
      ensureCategoryLoaded,
      watchLater,
      liked,
      watchHistory,
      toggleWatchLater,
      toggleLiked,
      saveToHistory,
      isInWatchLater,
      isLiked,
    }), 
    [
      categories, 
      loading, 
      error, 
      getVideoById, 
      getCategoryVideos, 
      ensureCategoryLoaded, 
      watchLater, 
      liked, 
      watchHistory, 
      toggleWatchLater, 
      toggleLiked, 
      saveToHistory, 
      isInWatchLater, 
      isLiked
    ]
  );

  return (
    <VideoDataContext.Provider value={value}>
      {children}
    </VideoDataContext.Provider>
  );
};

export const useVideoData = () => {
  const ctx = useContext(VideoDataContext);
  if (!ctx) throw new Error("useVideoData must be used within <VideoDataProvider>");
  return ctx;
};