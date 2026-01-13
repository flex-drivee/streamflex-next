"use client";

import React, { useEffect, useState } from "react";
import VideoCarousel from "@/components/VideoCarousel";
import VideoDetailModal from "@/components/modals/VideoDetailModal";
import VideoPlayerModal from "@/components/modals/VideoPlayerModal";
import { Icon } from "@/components/icons/Icon"; // Ensure this component exists, or use lucide-react directly
import type { Video } from "@/types";

const MyListPage: React.FC = () => {
  const [watchHistory, setWatchHistory] = useState<Video[]>([]);
  const [watchLater, setWatchLater] = useState<Video[]>([]);
  
  // Local state for modals (Correct approach!)
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  // --- Load Data ---
  useEffect(() => {
    // We must check if window exists to avoid SSR errors with localStorage
    if (typeof window !== "undefined") {
      const history = localStorage.getItem("watchHistory");
      const later = localStorage.getItem("watchLater");
      if (history) setWatchHistory(JSON.parse(history));
      if (later) setWatchLater(JSON.parse(later));
    }
  }, []);

  // --- Save Helpers ---
  const saveList = (key: string, list: Video[]) => {
    localStorage.setItem(key, JSON.stringify(list));
  };

  // --- Handlers ---
  const handleRemove = (key: "watchHistory" | "watchLater", video: Video) => {
    if (key === "watchHistory") {
      const updated = watchHistory.filter((v) => String(v.id) !== String(video.id));
      setWatchHistory(updated);
      saveList("watchHistory", updated);
    } else {
      const updated = watchLater.filter((v) => String(v.id) !== String(video.id));
      setWatchLater(updated);
      saveList("watchLater", updated);
    }
  };

  const handlePlay = (video: Video) => {
    // Update history on play
    const updated = [video, ...watchHistory.filter((v) => String(v.id) !== String(video.id))];
    setWatchHistory(updated);
    saveList("watchHistory", updated);
    setPlayingVideo(video);
  };

  const handleClear = (key: "watchHistory" | "watchLater") => {
    if (confirm(`Are you sure you want to clear your ${key === "watchHistory" ? "History" : "Watch Later"}?`)) {
      if (key === "watchHistory") {
        setWatchHistory([]);
        saveList("watchHistory", []);
      } else {
        setWatchLater([]);
        saveList("watchLater", []);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 px-4 md:px-12 pb-20 font-sans">
      <h1 className="text-3xl md:text-5xl font-bold mb-10 text-[#e5e5e5]">My Library</h1>

      {/* --- Watch Later Section --- */}
      {watchLater.length > 0 && (
        <div className="mb-12">
          <div className="flex justify-between items-end px-4 md:px-12 mb-2">
             <div className="flex-1"></div>
             <button
              onClick={() => handleClear("watchLater")}
              className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest mb-2 flex items-center gap-1"
            >
              <Icon name="trash" className="w-4 h-4" />
              Clear List
            </button>
          </div>
          
          <VideoCarousel
            title="Watch Later"
            videos={watchLater}
            onPlay={handlePlay}
            // Ensure your VideoCarousel component accepts onRemove prop!
            onRemove={(video) => handleRemove("watchLater", video)}
            onExpand={(v) => setActiveVideo(v)}
            onInfo={(v) => setActiveVideo(v)}
          />
        </div>
      )}

      {/* --- History Section --- */}
      {watchHistory.length > 0 && (
        <div className="mb-12">
           <div className="flex justify-between items-end px-4 md:px-12 mb-2">
             <div className="flex-1"></div>
             <button
              onClick={() => handleClear("watchHistory")}
              className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest mb-2 flex items-center gap-1"
            >
              <Icon name="trash" className="w-4 h-4" />
              Clear History
            </button>
          </div>

          <VideoCarousel
            title="Watch History"
            videos={watchHistory}
            onPlay={handlePlay}
            onRemove={(video) => handleRemove("watchHistory", video)}
            onExpand={(v) => setActiveVideo(v)}
            onInfo={(v) => setActiveVideo(v)}
          />
        </div>
      )}

      {/* --- Empty State --- */}
      {watchHistory.length === 0 && watchLater.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-gray-500 gap-4">
            <Icon name="folder" className="w-20 h-20 opacity-20" />
            <p className="text-xl font-medium text-gray-400">Your library is empty.</p>
            <p className="text-sm">Movies and shows you watch or save will appear here.</p>
        </div>
      )}

      {/* --- Modals --- */}
      {activeVideo && (
        <VideoDetailModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onPlay={(v) => {
            setActiveVideo(null);
            handlePlay(v);
          }}
        />
      )}

      {playingVideo && (
        <VideoPlayerModal 
            video={playingVideo} 
            onClose={() => setPlayingVideo(null)} 
        />
      )}
    </div>
  );
};

export default MyListPage;