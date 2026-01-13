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
import type { Category, Video } from "@/types"; // ✅ Alias import
import { CATEGORY_CONFIG } from "@/config/categories"; // ✅ Alias import

const DEV = process.env.NODE_ENV === "development"; // ✅ Next.js env check

export interface VideoDataContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  getVideoById: (id: string | number) => Video | undefined;

  // Helpers for VideoCarousel
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

const VideoDataContext = createContext<VideoDataContextType | undefined>(undefined);

export const VideoDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ✅ Initialize with empty state to match Server Side
  const [watchLater, setWatchLater] = useState<Record<string, Video>>({});
  const [liked, setLiked] = useState<Record<string, Video>>({});
  const [watchHistory, setWatchHistory] = useState<Video[]>([]);
  const [videoIndex, setVideoIndex] = useState<Record<string, Video>>({});
  const [mounted, setMounted] = useState(false);

  // ---------- LocalStorage Helpers (Client Only) ----------
  const hydrate = useCallback(<T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const persist = useCallback((key: string, data: unknown) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      if (DEV) console.warn(`[VideoDataContext] Failed to persist ${key}`);
    }
  }, []);

  // ✅ Hydrate only after mount to prevent SSR mismatch
  useEffect(() => {
    setWatchLater(hydrate("watchLater", {}));
    setLiked(hydrate("liked", {}));
    setWatchHistory(hydrate("watchHistory", []));
    setMounted(true);
  }, [hydrate]);

  // ---------- Dynamic Category Fetchers ----------
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

  const categories: Category[] = useMemo(() => {
    if (!categoryQueries.length) return [];
    return CATEGORY_CONFIG.map((cat, idx) => ({
      id: cat.id,
      name: cat.name,
      title: cat.title,
      category: cat.category,
      categoryType: cat.categoryType,
      videos: (categoryQueries[idx]?.data as Video[]) ?? [],
    }));
  }, [categoryQueries]);

  // ---------- Build Fast Lookup Index ----------
  useEffect(() => {
    if (!categories.length) return;
    const allVideos: Record<string, Video> = {};
    for (const cat of categories) {
      for (const v of cat.videos ?? []) {
        allVideos[String(v.id)] = v;
      }
    }
    setVideoIndex((prev) => {
      const same = Object.keys(prev).length === Object.keys(allVideos).length;
      return same ? prev : allVideos;
    });
  }, [categories]);

  // ---------- Core Helpers ----------
  const getVideoById = useCallback(
    (id: string | number) => videoIndex[String(id)],
    [videoIndex]
  );

  const getCategoryVideos = useCallback(
    (categoryId: string) => categories.find((c) => c.id === categoryId)?.videos ?? [],
    [categories]
  );

  const ensureCategoryLoaded = useCallback(async (categoryId: string) => {
    const cat = CATEGORY_CONFIG.find((c) => c.id === categoryId);
    if (!cat) return [];
    try {
      const data = await cat.fetcher();
      return (Array.isArray(data) ? data : []) as Video[];
    } catch (err) {
      if (DEV) console.warn(`[ensureCategoryLoaded] Failed:`, err);
      return [];
    }
  }, []);

  // ---------- Mutators ----------
  const toggleWatchLater = useCallback(
    (video: Video) => {
      setWatchLater((prev) => {
        const updated = { ...prev };
        const key = String(video.id);
        updated[key] ? delete updated[key] : (updated[key] = video);
        persist("watchLater", updated);
        return updated;
      });
    },
    [persist]
  );

  const toggleLiked = useCallback(
    (video: Video) => {
      setLiked((prev) => {
        const updated = { ...prev };
        const key = String(video.id);
        updated[key] ? delete updated[key] : (updated[key] = video);
        persist("liked", updated);
        return updated;
      });
    },
    [persist]
  );

  const saveToHistory = useCallback(
    (video: Video) => {
      setWatchHistory((prev) => {
        const updated = [video, ...prev.filter((v) => String(v.id) !== String(video.id))].slice(0, 50);
        persist("watchHistory", updated);
        return updated;
      });
    },
    [persist]
  );

  const isInWatchLater = useCallback(
    (id: string | number) => !!watchLater[String(id)],
    [watchLater]
  );

  const isLiked = useCallback(
    (id: string | number) => !!liked[String(id)],
    [liked]
  );

  // ---------- Context Value ----------
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
      isLiked,
    ]
  );

  useEffect(() => {
    if (DEV && error)
      console.warn("[VideoDataContext] Error fetching categories:", error);
  }, [error]);

  return (
    <VideoDataContext.Provider value={value}>
      {children}
    </VideoDataContext.Provider>
  );
};

export const useVideoData = () => {
  const ctx = useContext(VideoDataContext);
  if (!ctx)
    throw new Error("useVideoData must be used within <VideoDataProvider>");
  return ctx;
};