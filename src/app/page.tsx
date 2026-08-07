"use client";

import React, { useEffect, useMemo } from "react";
import Hero from "@/components/Hero";
import VideoCarousel from "@/components/VideoCarousel";
import { useVideoData } from "@/context/VideoDataContext";
import { usePlayer } from "@/components/GlobalPlayerProvider";

// ── Shimmer skeleton card ──────────────────────────────────────────────────
const ShimmerCard = () => (
  <div
    className="sf-shimmer rounded-[10px] shrink-0"
    style={{ width: "110px", height: "165px" }}
  />
);

const ShimmerRow = () => (
  <div className="py-4">
    <div className="sf-shimmer h-5 w-40 rounded-md mx-4 mb-4" />
    <div className="flex gap-3 px-4 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  </div>
);

// ── Home Page ──────────────────────────────────────────────────────────────
const HomePage: React.FC = () => {
  const { categories, loading, error } = useVideoData();
  const { playVideo, showDetails } = usePlayer();

  // Scroll to top on fresh load
  useEffect(() => {
    if (!loading) window.scrollTo({ top: 0, behavior: "auto" });
  }, [loading]);

  const featuredVideo = useMemo(
    () => categories?.[0]?.videos?.[0] || null,
    [categories]
  );

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "var(--sf-bg-primary)", color: "var(--sf-text-primary)" }}
    >
      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div
          className="sticky top-0 z-50 text-center py-3 text-sm font-semibold animate-fade-in"
          style={{ background: "var(--sf-error)", color: "#fff" }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── HERO SECTION ──────────────────────────────────────────────── */}
      {loading && !featuredVideo ? (
        <div
          className="w-full sf-shimmer"
          style={{ height: "85vh" }}
        />
      ) : featuredVideo ? (
        <div className="relative w-full" style={{ height: "85vh" }}>
          <Hero
            video={featuredVideo}
            onPlay={playVideo}
            onInfo={showDetails}
            isBillboard
          />
          {/* Bottom fade-into-bg gradient */}
          <div
            className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, var(--sf-bg-primary) 0%, transparent 100%)",
            }}
          />
        </div>
      ) : null}

      {/* ── CAROUSELS ─────────────────────────────────────────────────── */}
      <div
        className="relative z-10 pb-24"
        style={{ marginTop: featuredVideo ? "-120px" : "80px" }}
      >
        {loading && categories.length === 0 ? (
          // Shimmer skeleton while loading
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerRow key={i} />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category) => (
              <VideoCarousel
                key={category.id}
                title={category.title || category.name}
                videos={category.videos}
                onPlay={playVideo}
                onInfo={showDetails}
                onExpand={showDetails}
              />
            ))}
          </div>
        ) : !loading && !error ? (
          <div
            className="text-center py-20 px-4"
            style={{ color: "var(--sf-text-secondary)" }}
          >
            <div className="text-5xl mb-4">📺</div>
            <p className="text-lg font-semibold" style={{ color: "var(--sf-text-primary)" }}>
              Nothing here yet
            </p>
            <p className="text-sm mt-1">
              Content is loading or unavailable. Try refreshing.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HomePage;