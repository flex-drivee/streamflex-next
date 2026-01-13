"use client";

import React, { useState } from "react";
import VideoCarousel from "@/components/VideoCarousel";
import VideoDetailModal from "@/components/modals/VideoDetailModal";
import VideoPlayerModal from "@/components/modals/VideoPlayerModal";
import Spinner from "@/components/Spinner";
import { useVideoData } from "@/context/VideoDataContext";
import type { Video } from "@/types";

const MoviesPage: React.FC = () => {
  const { categories, loading, error } = useVideoData();
  
  // Replaced useOutletContext with local state to manage modals directly
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

  const movieCategories = categories.filter((c) => c.categoryType === "movie");

  return (
    <div className="space-y-12 px-6 py-12 bg-neutral-900 text-white min-h-screen relative">
      <h1 className="text-3xl md:text-5xl font-bold mb-8">Movies</h1>

      {movieCategories.map((category) => (
        <VideoCarousel
          key={category.id}
          title={category.name}
          videos={category.videos}
          onPlay={(video) => setPlayingVideo(video)}
          onInfo={(video) => setActiveVideo(video)}
          onExpand={(video) => setActiveVideo(video)}
        />
      ))}

      {/* Logic Added: Actually render the modals you imported */}
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

export default MoviesPage;