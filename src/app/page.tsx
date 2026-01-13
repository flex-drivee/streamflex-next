"use client";

import React, { useEffect, useMemo } from "react";
import Hero from "@/components/Hero";
import VideoCarousel from "@/components/VideoCarousel";
import Spinner from "@/components/Spinner";
import { useVideoData } from "@/context/VideoDataContext";
import { usePlayer } from "@/components/GlobalPlayerProvider";

const HomePage: React.FC = () => {
  const { categories, loading, error } = useVideoData();
  const { playVideo, showDetails } = usePlayer();

  // --- Scroll to top after categories load ---
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [loading]);

  // --- Featured video (first of first category) ---
  const featuredVideo = useMemo(
    () => categories?.[0]?.videos?.[0] || null,
    [categories]
  );

  // --- Loading state ---
  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-[#141414] text-white">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-[#141414] text-white min-h-screen font-sans relative overflow-x-hidden">
      {/* ⚠️ Error Banner */}
      {error && (
        <div className="bg-yellow-600 text-white text-center py-3 text-sm font-medium sticky top-0 z-50">
          {error}
        </div>
      )}

      {/* 🎥 HERO SECTION */}
      {featuredVideo && (
        <div className="relative w-full h-[85vh] lg:h-[95vh]">
          <Hero
            video={featuredVideo}
            onPlay={playVideo}
            onInfo={showDetails}
            isBillboard
          />
          {/* Smooth Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#141414] to-transparent z-10 pointer-events-none" />
        </div>
      )}

      {/* 📺 CAROUSELS */}
      <div className="relative z-10 mt-25 md:mt-37.5 space-y-10 md:space-y-14 pb-20 pl-4 md:pl-12 overflow-hidden">
        {categories.length > 0 ? (
          categories.map((category) => (
            <VideoCarousel
              key={category.id}
              title={category.title || category.name}
              videos={category.videos}
              onPlay={playVideo}
              onInfo={showDetails}
              onExpand={showDetails}
            />
          ))
        ) : !loading && !error ? (
          <div className="text-center text-neutral-400 py-12 px-4">
            No videos available at the moment.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HomePage;