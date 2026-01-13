"use client";

import React, { useState } from "react";
import VideoCarousel from "@/components/VideoCarousel";
import VideoDetailModal from "@/components/modals/VideoDetailModal";
import VideoPlayerModal from "@/components/modals/VideoPlayerModal";
import Spinner from "@/components/Spinner";
import { useVideoData } from "@/context/VideoDataContext"; // Fixed path
import type { Video } from "@/types";

const SeriesPage: React.FC = () => {
  const { categories, loading, error } = useVideoData();
  
  // ✅ Local state to manage modals (Replaces useOutletContext)
  const [activeVideo, setActiveVideo] = useState<Video | null>(null); // For Detail Modal
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null); // For Player Modal

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-neutral-900">
        {error}
      </div>
    );
  }

  // Filter for Series/TV
  const seriesCategories = categories.filter((c) => c.categoryType === "series");

  return (
    <div className="space-y-12 px-6 py-12 bg-neutral-900 text-white min-h-screen relative">
      <h1 className="text-3xl md:text-5xl font-bold mb-8">TV Series</h1>

      {seriesCategories.length > 0 ? (
        seriesCategories.map((category) => (
          <VideoCarousel
            key={category.id}
            title={category.name}
            videos={category.videos}
            onPlay={(video) => setPlayingVideo(video)}
            onInfo={(video) => setActiveVideo(video)}
            onExpand={(video) => setActiveVideo(video)}
          />
        ))
      ) : (
        <p className="text-gray-500">No TV Series found.</p>
      )}

      {/* ✅ Modals Rendered Here */}
      {activeVideo && (
        <VideoDetailModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onPlay={(video) => {
            setActiveVideo(null);
            setPlayingVideo(video);
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

export default SeriesPage;