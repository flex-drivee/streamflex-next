"use client";

import React, { useEffect, useState } from "react";
import type { Video } from "@/types/index";
import { Icon } from "@/components/icons/Icon"; // Matches your structure
import { useLocalization } from "@/context/LocalizationContext";

interface HeroProps {
  video: Video;
  onPlay: (video: Video) => void;
  onInfo?: (v: Video) => void;
  isBillboard?: boolean;
}

const SCROLL_DIVISOR = 400; 
const TRANSLATE_FACTOR = 30; 
const SCALE_FACTOR = 0.02; 
const ZOOM_INTERVAL = 8000; 

const Hero: React.FC<HeroProps> = ({ video, onPlay, onInfo, isBillboard = false }) => {
  const { t } = useLocalization();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [zoom, setZoom] = useState(Math.random() > 0.5); 

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / SCROLL_DIVISOR, 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isBillboard) return;
    const interval = setInterval(() => setZoom((z) => !z), ZOOM_INTERVAL);
    return () => clearInterval(interval);
  }, [isBillboard]);

  const heroHeight = isBillboard ? "h-[90vh]" : "h-[70vh]";
  const zoomClass = zoom ? "scale-[1.05]" : "scale-[1.0]";

  return (
    <section
      aria-label={`Featured video: ${video.title}`}
      className="relative w-full overflow-hidden mb-8 md:mb-16" 
    >
      {/* --- Background --- */}
      <div
        className={`relative ${heroHeight} w-full overflow-hidden transition-transform duration-6000ms ease-[cubic-bezier(0.25,0.1,0.25,1)] ${zoomClass}`}
        style={{
          transform: `translateY(${scrollProgress * TRANSLATE_FACTOR}px) scale(${
            1 + scrollProgress * SCALE_FACTOR
          })`,
          opacity: 1 - scrollProgress * 0.25,
        }}
      >
        <img
          src={video.backdrop || video.poster || video.thumbnailUrl} // Prefer backdrop for Hero
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover object-top select-none"
          loading="eager"
          fetchPriority="high"
        />
        {/* ✅ Tailwind v4 Gradient Fix */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-[#141414] to-transparent" />
      </div>

      {/* --- Content Overlay --- */}
      <div
        className="absolute bottom-20 left-6 md:left-14 max-w-xl z-20 transition-transform duration-500"
        style={{
          transform: `translateY(${scrollProgress * -10}px)`,
          opacity: 1 - scrollProgress * 0.4,
        }}
      >
        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-xl leading-tight">
          {video.title}
        </h1>

        {/* Metadata Row */}
        <div className="flex items-center gap-4 text-sm font-medium text-gray-200 mb-4 drop-shadow-md">
            {video.match && video.match > 0 && (
                <span className="text-green-400 font-bold">{video.match}% Match</span>
            )}
            <span>{video.releaseYear}</span>
            
            {/* Only show badge if rating exists */}
            {video.maturityRating && (
                <span className="border border-gray-400 px-1.5 py-0.5 rounded text-xs bg-black/20 backdrop-blur-sm">
                    {video.maturityRating}
                </span>
            )}
            
            {(video.totalSeasons || video.duration) && (
                <span>{video.totalSeasons ? `${video.totalSeasons} Seasons` : video.duration}</span>
            )}
        </div>

        {/* Description */}
        {video.description && (
          <p className="hidden md:block text-base text-gray-100 mb-6 line-clamp-3 drop-shadow-md leading-relaxed">
            {video.description}
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onPlay(video)}
            className="flex items-center bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded font-bold transition-colors duration-200"
          >
            <Icon name="play" className="w-7 h-7 mr-2" />
            {t("play")}
          </button>

          {onInfo && (
            <button
              onClick={() => onInfo(video)}
              className="flex items-center bg-neutral-500/70 hover:bg-neutral-500/90 text-white px-6 py-2.5 rounded font-bold transition-colors backdrop-blur-sm"
            >
              <Icon name="info" className="w-7 h-7 mr-2" />
              {t("more Info")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;