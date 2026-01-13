"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useLocalization } from "@/context/LocalizationContext";
import { useVideoData } from "@/context/VideoDataContext";
import VideoCard from "./VideoCard"; 
import type { Video } from "@/types/index";
import { Icon } from "@/components/icons/Icon";

interface VideoCarouselProps {
  title?: string;
  category?: string;
  categoryId?: string;
  videos?: Video[];
  onPlay: (video: Video) => void;
  onInfo?: (video: Video) => void;
  onExpand?: (video: Video) => void;
  onRemove?: (video: Video) => void;
  showTitles?: boolean; // ✅ Added Prop
}

const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 80) => {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), delay);
  };
};

const LazyCardPlaceholder: React.FC<{ className?: string }> = memo(
  ({ className = "" }) => (
    <div className={`${className} bg-neutral-800 rounded-lg animate-pulse`} />
  )
);

const VideoCarousel: React.FC<VideoCarouselProps> = ({
  title,
  category,
  categoryId,
  videos: initialVideos,
  onPlay,
  onExpand,
  onRemove,
  onInfo,
  showTitles = false, // ✅ Default false
}) => {
  const { t } = useLocalization();
  const { getCategoryVideos, ensureCategoryLoaded } = useVideoData();

  // ✅ LOGIC FIX: Determine the best title to show
  const displayTitle = (title || category || "").trim();
  
  // Generate a translation key (e.g., "Trending Now" -> "trending_now")
  const titleKey = displayTitle
    ? displayTitle.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_")
    : "";

  // Try to translate. If translation returns the key itself (meaning missing), revert to displayTitle.
  const translated = t(titleKey);
  const finalTitle = translated !== titleKey ? translated : displayTitle;

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [videos, setVideos] = useState<Video[] | undefined>(
    initialVideos ?? (categoryId ? getCategoryVideos(categoryId) : undefined)
  );
  
  // Scroll & Pagination State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const loadingRef = useRef(false);

  // ---------- Initialize Videos ----------
  useEffect(() => {
    if (initialVideos) setVideos(initialVideos);
    else if (categoryId) setVideos(getCategoryVideos(categoryId));
  }, [initialVideos, categoryId, getCategoryVideos]);

  // ---------- Lazy Load ----------
  useEffect(() => {
    if (!categoryId || (videos && videos.length > 0)) return;
    const el = carouselRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          ensureCategoryLoaded(categoryId)
            .then((fetched) => setVideos(fetched || []))
            .catch((err) => {
              console.error("Category lazy-load failed:", err);
              setVideos([]);
            })
            .finally(() => (loadingRef.current = false));
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px 200px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [categoryId, videos, ensureCategoryLoaded]);

  // ---------- Scroll & Page Calculation ----------
  const checkScrollPosition = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);

    if (clientWidth > 0) {
        const total = Math.ceil(scrollWidth / clientWidth);
        const current = Math.round(scrollLeft / clientWidth);
        setTotalPages(total);
        setCurrentPage(current);
    }
  }, []);

  const checkScrollPositionDebounced = useMemo(
    () => debounce(checkScrollPosition, 50), 
    [checkScrollPosition]
  );

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollPositionDebounced, { passive: true });
    window.addEventListener("resize", checkScrollPositionDebounced);
    
    const id = window.setTimeout(checkScrollPosition, 100);
    
    return () => {
      window.clearTimeout(id);
      el.removeEventListener("scroll", checkScrollPositionDebounced);
      window.removeEventListener("resize", checkScrollPositionDebounced);
    };
  }, [videos, checkScrollPositionDebounced, checkScrollPosition]);

  // ---------- Scroll Logic ----------
  const scroll = useCallback((direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;

    const viewWidth = el.clientWidth;
    const scrollAmount = viewWidth * 0.92;

    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // ---------- Loading State ----------
  if (categoryId && typeof videos === "undefined") {
    return (
      <div className="mb-8 md:mb-12 relative">
        <div className="px-4 md:px-12 mb-3">
          <h3 className="text-base md:text-xl font-bold text-[#e5e5e5] capitalize">
            {finalTitle}
          </h3>
        </div>
        <div className="flex gap-2 overflow-hidden px-4 md:px-12 py-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <LazyCardPlaceholder
              key={i}
              className="shrink-0 w-27.5 md:w-37.5 lg:w-55 aspect-video"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) return null;

  // ---------- Render ----------
  return (
    <div className="mb-8 md:mb-12 relative group z-10">
      
      {/* Header Row */}
      <div className="flex justify-between items-end px-4 md:px-12 mb-3">
        {/* ✅ Title: Added 'capitalize' class just in case, but logic handles it now */}
        <h3 className="text-lg md:text-xl font-bold text-[#e5e5e5] inline-block capitalize">
          {finalTitle}
        </h3>

        {/* Page Indicators */}
        {totalPages > 1 && (
            <div className="flex gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {Array.from({ length: totalPages }).map((_, index) => (
                    <div 
                        key={index}
                        className={`h-0.5 w-3 rounded-full transition-colors duration-300 ${
                            index === currentPage ? "bg-gray-200" : "bg-gray-600"
                        }`}
                    />
                ))}
            </div>
        )}
      </div>

      <div className="relative group/carousel">
        
        {/* Scroll Left */}
        <button
          onClick={() => scroll("left")}
          className={`absolute top-0 bottom-0 left-0 w-12 md:w-16 bg-linear-to-r from-black/80 via-black/40 to-transparent z-30
            flex items-center justify-center text-white transition-all duration-300 origin-left
            ${canScrollLeft ? "opacity-0 group-hover/carousel:opacity-100 hover:scale-105" : "opacity-0 pointer-events-none"}`}
          aria-label="Scroll Left"
        >
          <Icon name="chevron-left" className="w-8 h-8 md:w-10 md:h-10 transform -translate-x-1" />
        </button>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-2 overflow-x-auto overflow-y-visible scroll-smooth px-4 md:px-12 pb-8 pt-2 scrollbar-hide"
          onScroll={checkScrollPositionDebounced}
          style={{ 
              scrollPaddingLeft: '48px', 
              scrollPaddingRight: '48px',
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none' 
          }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
          `}</style>

          {videos.map((video, index) => (
            <div
              key={video.id}
              // ✅ Logic: If showing titles (Anime), remove 'aspect-video' so it can grow vertically
              className={`shrink-0 w-30 md:w-40 lg:w-57.5 video-card-placeholder transition-transform duration-300 ${showTitles ? '' : 'aspect-video'}`}
            >
              <VideoCard
                video={video}
                onPlay={onPlay}
                onExpand={onExpand}
                onRemove={onRemove}
                onInfo={onInfo}
                isFirst={index === 0}
                isLast={index === videos.length - 1}
                showTitle={showTitles} // ✅ Passed prop
              />
            </div>
          ))}
        </div>

        {/* Scroll Right */}
        <button
          onClick={() => scroll("right")}
          className={`absolute top-0 bottom-0 right-0 w-12 md:w-16 bg-linear-to-l from-black/80 via-black/40 to-transparent z-30
            flex items-center justify-center text-white transition-all duration-300 origin-right
            ${canScrollRight ? "opacity-0 group-hover/carousel:opacity-100 hover:scale-105" : "opacity-0 pointer-events-none"}`}
          aria-label="Scroll Right"
        >
          <Icon name="chevron-right" className="w-8 h-8 md:w-10 md:h-10 transform translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default memo(VideoCarousel);