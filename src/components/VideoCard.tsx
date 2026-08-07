"use client";

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon"; 
import type { Video } from "@/types/index"; 
import { useVideoData } from "@/context/VideoDataContext"; 
import { fetchTmdb } from "@/lib/tmdb"; 

const MemoIcon = React.memo(Icon);

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onExpand?: (video: Video) => void;
  onRemove?: (video: Video) => void;
  onInfo?: (video: Video) => void;
  isFirst?: boolean;
  isLast?: boolean;
  tabbable?: boolean;
  showTitle?: boolean; // ✅ Added Prop
}

export default function VideoCard({
  video: initialVideo,
  onPlay,
  onExpand,
  onRemove,
  onInfo,
  isFirst,
  isLast,
  tabbable,
  showTitle = false, // ✅ Default to false
}: VideoCardProps) {
  // ✅ SSR Safety: Wait for mount before using portals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isInWatchLater,
    isLiked,
    toggleWatchLater,
    toggleLiked,
    saveToHistory,
  } = useVideoData();

  const [isHovered, setIsHovered] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<Partial<Video> | null>(null);

  // Merge: Use fetched details if available, otherwise use initial data
  const video = { ...initialVideo, ...fetchedDetails };

  // --- FETCH ON HOVER LOGIC ---
  useEffect(() => {
    if (isHovered && !fetchedDetails && !video.maturityRating && !video.duration) {
      const loadDetails = async () => {
        try {
          const type = video.mediaType === "tv" || video.type === "series" ? "tv" : "movie";
          const data = await fetchTmdb(Number(video.id), type);
          setFetchedDetails(data as unknown as Partial<Video>);
        } catch (e) {
          console.error("Failed to load hover details", e);
        }
      };
      loadDetails();
    }
  }, [isHovered, video.id, video.mediaType, video.type, fetchedDetails]);

  const cardThumbnail =
    video.thumbnailUrl ||
    video.poster ||
    video.poster_path ||
    video.backdrop ||
    video.backdrop_path ||
    "";

  // detect if poster is portrait or landscape
  const isPortrait = (() => {
    const posterUrl = video.poster || video.poster_path;
    const backdropUrl = video.backdrop || video.backdrop_path;
    if (posterUrl && backdropUrl) return true;
    if (posterUrl) return true;
    if (backdropUrl) return false;
    return false;
  })();

  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const placeholderRef = useRef<HTMLDivElement>(null);
  const innerPortalRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  // --- HIDE PORTAL ON SCROLL ---
  const handleScroll = useCallback(() => {
    if (!isHovered) return;
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsHovered(false);
  }, [isHovered]);

  useEffect(() => {
    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", handleScroll, { capture: true });
  }, [handleScroll]);

  // --- CLOSE PORTAL WITH ESCAPE KEY ---
  useEffect(() => {
    if (!isHovered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsHovered(false);
        placeholderRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isHovered]);

  // --- POSITION PORTAL LOGIC ---
  const positionPortal = useCallback(() => {
    if (!placeholderRef.current || !innerPortalRef.current) return;

    const placeholderRect = placeholderRef.current.getBoundingClientRect();
    const popupHeight = innerPortalRef.current.offsetHeight;
    let finalTop = placeholderRect.top;

    const vh = window.innerHeight;
    const estimatedTranslateYPercent = -0.20;
    const estimatedTranslateY = popupHeight * estimatedTranslateYPercent;
    const finalVisualTop = placeholderRect.top + estimatedTranslateY;
    const finalVisualBottom = finalVisualTop + popupHeight;

    if (finalVisualBottom > vh && placeholderRect.top > vh - placeholderRect.bottom) {
      finalTop = placeholderRect.bottom - popupHeight;
    }

    const popupWidth = Math.min(placeholderRect.width * 1.25, 280);
    setPortalStyle({
      position: "fixed",
      top: finalTop,
      left: placeholderRect.left - (popupWidth - placeholderRect.width) / 2,
      width: popupWidth,
      zIndex: 9999,
    });
  }, []);

  const [transformOrigin, setTransformOrigin] = useState("center center");
  const updateTransformOrigin = useCallback(() => {
    const rect = placeholderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { left, right } = rect;
    const vw = window.innerWidth;
    let originX = "center";
    if (left < vw * 0.1) originX = "left";
    else if (right > vw * 0.9) originX = "right";
    setTransformOrigin(`${originX} top`);
  }, []);

  useLayoutEffect(() => {
    if (!isHovered) return;
    updateTransformOrigin();

    let frameId: number | null = null;
    let resizeTimeout: number | null = null;

    const updatePosition = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        updateTransformOrigin?.();
        positionPortal();
      });
    };
    resizeTimeout = window.setTimeout(updatePosition, 40);
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updatePosition, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [isHovered, positionPortal, updateTransformOrigin]);

  // --- Handlers ---
  const showHover = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (!showTimeoutRef.current) {
      showTimeoutRef.current = window.setTimeout(() => {
        setIsHovered(true);
        showTimeoutRef.current = null;
      }, 400); 
    }
  }, []);

  const hideHover = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (!hideTimeoutRef.current) {
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsHovered(false);
        hideTimeoutRef.current = null;
      }, 150);
    }
  }, []);

  const handleMouseEnter = useCallback(() => { showHover(); }, [showHover]);
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && innerPortalRef.current?.contains(relatedTarget)) return;
    hideHover();
  }, [hideHover]);
  const handleBlur = useCallback(() => hideHover(), [hideHover]);

  const handleExpandAndClose = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    onExpand?.(video);
    setTimeout(() => setIsHovered(false), 180);
  }, [onExpand, video]);

  const handlePortalAction = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  }, []);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    saveToHistory(video);
    onPlay(video);
  }, [video, onPlay, saveToHistory]);

  const handleToggleWatchLater = useCallback((e: React.MouseEvent) => handlePortalAction(e, () => toggleWatchLater(video)), [handlePortalAction, toggleWatchLater, video]);
  const handleToggleLiked = useCallback((e: React.MouseEvent) => handlePortalAction(e, () => toggleLiked(video)), [handlePortalAction, toggleLiked, video]);
  const handleInfo = useCallback((e: React.MouseEvent) => handlePortalAction(e, () => onInfo ? onInfo(video) : handleExpandAndClose()), [handlePortalAction, onInfo, handleExpandAndClose]);
  const handleRemove = useCallback((e: React.MouseEvent) => handlePortalAction(e, () => onRemove?.(video)), [handlePortalAction, onRemove, video]);
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpandAndClose(); }
  }, [handleExpandAndClose]);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={placeholderRef}
        className={`shrink-0 w-full relative cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          isPortrait ? "aspect-2/3" : "aspect-video"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleBlur}
        onKeyDown={handleCardKeyDown}
        tabIndex={tabbable ? 0 : -1}
        role="button"
        aria-expanded={isHovered}
        aria-label={video.title}
      >
        {cardThumbnail ? (
          <img
            src={cardThumbnail}
            alt={video.title}
            className={`absolute inset-0 w-full h-full rounded-lg pointer-events-none ${
              isPortrait ? "object-cover" : "object-cover object-center"
            }`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-neutral-800 rounded-lg flex items-center justify-center pointer-events-none">
            <Icon name="play" className="w-10 h-10 text-neutral-600" />
          </div>
        )}
      </div>

      {/* ✅ SHOW TITLE HERE IF ENABLED */}
      {showTitle && (
        <p className="mt-1 text-sm font-medium text-gray-200 truncate w-full px-1 text-center">
            {video.title}
        </p>
      )}

      {/* ✅ SSR SAFE: Only render portal when mounted on client */}
      {mounted && createPortal(
        <div
          className="video-card-portal-wrapper" 
          style={portalStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleExpandAndClose}
        >
          <AnimatePresence mode="wait">
            {isHovered && (
              <motion.div
                ref={innerPortalRef}
                key="video-popup"
                className="rounded-xl flex flex-col cursor-pointer pointer-events-auto"
                style={{
                  transformOrigin: transformOrigin === 'origin-left' ? 'left center' : transformOrigin === 'origin-right' ? 'right center' : 'center center',
                  background: "var(--sf-bg-card)",
                  border: "1px solid var(--sf-outline)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.8), 0 0 0 1px var(--sf-outline)"
                }}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1.05, y: 0, transition: { type: "spring", stiffness: 200, damping: 22, ease: [0.25, 0.1, 0.25, 1], delay: 0.18, duration: 0.42 }}}
                exit={{ opacity: 0, scale: 0.9, y: 6, transition: { delay: 0.06, duration: 0.25, ease: [0.45, 0, 0.2, 1] }}}
              >
                {/* Thumbnail Area */}
                <div className={`relative w-full overflow-hidden rounded-t-lg ${isPortrait ? "aspect-2/3" : "aspect-video"}`}>
                  {cardThumbnail ? (
                    <img src={cardThumbnail} alt="" className={`w-full h-full ${isPortrait ? "object-contain bg-black" : "object-cover object-center"} rounded-t-lg`} onLoad={() => setTimeout(positionPortal, 0)} onError={() => setTimeout(positionPortal, 0)} />
                  ) : (
                    <div className="w-full h-full bg-neutral-800 rounded-t-lg flex items-center justify-center">
                      <Icon name="play" className="w-8 h-8 text-neutral-600" />
                    </div>
                  )}
                </div>
                
                {/* Details Area */}
                <div className="p-3 space-y-3 text-xs relative">
                  
                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePlay}
                        className="flex items-center justify-center w-8 h-8 bg-white rounded-full text-black hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <MemoIcon name="play" className="w-5 h-5 ml-0.5" />
                      </button>

                      <button onClick={handleToggleWatchLater} className="flex items-center justify-center w-8 h-8 rounded-full text-white hover:scale-110 transition-transform" style={{background:"var(--sf-bg-elevated)",border:"1px solid var(--sf-outline)"}}>
                        <MemoIcon name={isInWatchLater(video.id) ? "check" : "plus"} className="w-5 h-5" />
                      </button>

                      <button onClick={handleToggleLiked} className="flex items-center justify-center w-8 h-8 rounded-full text-white hover:scale-110 transition-transform" style={{background:"var(--sf-bg-elevated)",border:"1px solid var(--sf-outline)"}}>
                        <MemoIcon name={isLiked(video.id) ? "heart" : "like"} className={`w-5 h-5 ${isLiked(video.id) ? "text-pink-500" : ""}`} />
                      </button>
                    </div>

                    <button
                      onClick={handleInfo}
                      className="flex items-center justify-center w-8 h-8 rounded-full text-white hover:scale-110 transition-transform" style={{background:"var(--sf-bg-elevated)",border:"1px solid var(--sf-outline)"}}>
                      <MemoIcon name="chevron-down" className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Metadata Row: Match, Age, Duration */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold">
                    {video.match && video.match > 0 && (
                        <span style={{color:"var(--sf-success)"}} className="font-bold">{video.match}% Match</span>
                    )}
                    {video.maturityRating && (
                        <span className="sf-badge sf-badge-year uppercase">{video.maturityRating}</span>
                    )}
                    {(video.duration || video.seasons) && (
                        <span style={{color:"var(--sf-text-secondary)"}}>
                            {video.duration 
                                ? video.duration 
                                : Array.isArray(video.seasons) 
                                    ? `${video.seasons.length} Season${video.seasons.length > 1 ? 's' : ''}`
                                    : video.seasons || (video.mediaType === 'tv' ? 'Series' : '')
                            }
                        </span>
                    )}
                    <span className="sf-badge sf-badge-hd">HD</span>
                  </div>

                  {/* Genres Row */}
                  {video.genres && video.genres.length > 0 && (
                    <div className="flex flex-wrap items-center text-[11px] text-gray-400 leading-tight">
                      {video.genres.slice(0, 3).map((g, index) => (
                        <React.Fragment key={g}>
                          <span className="hover:text-white transition-colors cursor-pointer">{g}</span>
                          {index < Math.min(video.genres!.length, 3) - 1 && <span className="mx-1.5 text-[8px] text-gray-600">•</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  
                  {onRemove && (
                    <button onClick={handleRemove} className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 border border-gray-500 hover:border-red-500 hover:text-red-500 transition-colors">
                      <MemoIcon name="trash" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  );
}