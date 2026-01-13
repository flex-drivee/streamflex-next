"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Video } from "@/types/index";
import { Icon } from "@/components/icons/Icon"; // Standardized path
import VideoCard from "@/components/VideoCard"; // Ensure path
import { searchTmdb, getTrendingTmdb } from "@/lib/tmdb";
import { usePlayer } from "@/components/GlobalPlayerProvider"; // ✅ Use Global Player

interface SearchInputProps {
  // We make this optional or ignore it because we use Global Context now
  onPlay?: (video: Video) => void; 
  headerOffset?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({ headerOffset = 64 }) => {
  const { playVideo, showDetails } = usePlayer(); // ✅ Hook into global system

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [results, setResults] = useState<Video[]>([]);
  const [trending, setTrending] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // --- LOAD TRENDING ---
  useEffect(() => {
    const loadTrending = async () => {
        try {
            const data = await getTrendingTmdb();
            if (data && data.length > 0) setTrending(data);
        } catch (e) {
            console.warn("Failed to load trending:", e);
        }
    };
    loadTrending();
  }, []);

  // --- DEBOUNCE ---
  useEffect(() => {
    const t = setTimeout(() => {
        setDebouncedQuery(query); 
    }, 400); 
    return () => clearTimeout(t);
  }, [query]);

  // --- API SEARCH ---
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const doSearch = async () => {
      setLoading(true);
      try {
          const data = await searchTmdb(debouncedQuery);
          if (isMounted) {
              setResults(data || []);
          }
      } catch (error) {
          console.error("Search failed:", error);
          if (isMounted) setResults([]);
      } finally {
          if (isMounted) setLoading(false);
      }
    };

    doSearch();
    return () => { isMounted = false; };
  }, [debouncedQuery]);

  // --- OUTSIDE CLICK ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current && containerRef.current.contains(target)) return;
      // Ignore clicks inside portals (like modals)
      if (target.closest('.video-card-portal-wrapper')) return;

      setIsOpen(false);
      setQuery("");
      setResults([]);
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // --- HELPERS ---
  const saveToHistory = (video: Video) => {
    if (typeof window === "undefined") return;
    try {
      const list: Video[] = JSON.parse(localStorage.getItem("watchHistory") || "[]");
      const updated = [video, ...list.filter((v) => String(v.id) !== String(video.id))];
      localStorage.setItem("watchHistory", JSON.stringify(updated));
    } catch {}
  };

  const handlePlayClick = (video: Video) => {
    saveToHistory(video);
    setIsOpen(false);
    setQuery(""); 
    playVideo(video); // ✅ Global play
  };

  const handleInfoClick = (video: Video) => {
      showDetails(video); // ✅ Global details
  };

  // --- RENDER ---
  const displayList = debouncedQuery ? results : trending;
  const showList = isOpen; 

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!isOpen ? (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="text-gray-300 hover:text-white transition-colors"
        >
          <Icon name="search" className="w-6 h-6" />
        </button>
      ) : (
        <>
          <div className="transform transition-all duration-300 ease-out origin-left ml-2 z-50 relative">
            <div className="flex items-center bg-black/80 backdrop-blur-md rounded-none border-b border-white/50 px-2 py-1">
              {loading ? (
                <Icon name="spinner" className="w-5 h-5 text-gray-400 animate-spin mr-2" />
              ) : (
                <Icon name="search" className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titles, people, genres"
                className="bg-transparent outline-none px-2 py-1 text-sm w-48 sm:w-64 text-white placeholder-gray-500"
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className="text-gray-400 hover:text-white ml-2"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showList && (
            <div
              className="fixed inset-0 overflow-y-auto z-40 bg-[#141414]/95 animate-fade-in"
              style={{ top: 0, paddingTop: headerOffset + 20 }}
            >
              <div className="px-8 md:px-16 pb-20">
                <div className="mb-6 text-sm font-semibold text-gray-400">
                  {debouncedQuery 
                    ? `Results for "${debouncedQuery}"` 
                    : "Trending Now"}
                </div>

                {displayList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {displayList.map((video) => (
                      <div
                        key={video.id}
                        className="relative aspect-video z-10" 
                      >
                        <VideoCard
                          video={video}
                          onPlay={handlePlayClick}
                          onInfo={handleInfoClick}
                          onExpand={handleInfoClick}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                   !loading && <div className="text-center text-gray-500 mt-10">No results found.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* ❌ REMOVED: <VideoDetailModal /> & <VideoPlayerModal /> 
          These are now handled by GlobalPlayerProvider in layout.tsx 
      */}
    </div>
  );
};

export default SearchInput;