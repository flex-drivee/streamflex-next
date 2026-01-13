"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Video } from "@/types";
import VideoPlayerModal from "@/components/modals/VideoPlayerModal"; 
import VideoDetailModal from "@/components/modals/VideoDetailModal"; 
import VideoCard from "@/components/VideoCard";
import { Icon } from "@/components/icons/Icon"; 
import { searchTmdb } from "@/lib/tmdb"; 

// We split the content into a sub-component to handle Suspense boundaries correctly
const SearchContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  // 🎬 Standardized Modal State
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  // --- Sync URL to State on Load ---
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== query) {
        setQuery(q);
    }
  }, [searchParams]);

  // --- API Search Effect ---
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Debounce search
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchTmdb(query);
        setResults(data || []);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // --- Handlers ---
  const handleSearchUpdate = (value: string) => {
    setQuery(value);
    
    // Construct new URL parameters
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    
    // Update URL without reloading
    router.replace(`/search?${params.toString()}`);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    router.replace("/search");
  };

  const handlePlay = (video: Video) => {
    setActiveVideo(null);
    setPlayingVideo(video);
  };

  return (
    <>
      {/* --- Search Bar --- */}
      <div className="max-w-4xl mx-auto mb-12 relative">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
             <Icon 
                name={loading ? "spinner" : "search"} 
                className={`w-6 h-6 text-gray-400 ${loading ? 'animate-spin' : ''}`} 
             />
          </div>
          <input
            type="text"
            placeholder="Movies, TV Shows, Genres..."
            value={query}
            onChange={(e) => handleSearchUpdate(e.target.value)}
            className="w-full pl-12 pr-12 py-4 text-xl bg-[#2b2b2b] border border-transparent focus:border-neutral-500 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all shadow-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white"
            >
              <Icon name="close" className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* --- Results Grid --- */}
      {query ? (
        <div className="max-w-450 mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-300">
            {results.length > 0 
                ? `Results for "${query}"` 
                : loading ? "Searching..." : `No results found for "${query}"`
            }
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((video) => (
              <div key={video.id} className="relative aspect-video z-10">
                <VideoCard
                  video={video}
                  onPlay={handlePlay}
                  onExpand={(v) => setActiveVideo(v)}
                  onInfo={(v) => setActiveVideo(v)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* --- Empty State --- */
        <div className="flex flex-col items-center justify-center h-[40vh] text-gray-600 gap-4">
            <Icon name="search" className="w-24 h-24 opacity-10" />
            <p className="text-xl font-medium text-gray-500">Find your next favorite story.</p>
        </div>
      )}

      {/* --- Modals --- */}
      {activeVideo && (
        <VideoDetailModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onPlay={handlePlay}
        />
      )}

      {playingVideo && (
        <VideoPlayerModal 
            video={playingVideo} 
            onClose={() => setPlayingVideo(null)} 
        />
      )}
    </>
  );
};

// Main Page Component wrapped in Suspense
const SearchPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 px-6 pb-20 font-sans">
      <Suspense fallback={<div className="text-center pt-20">Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
};

export default SearchPage;