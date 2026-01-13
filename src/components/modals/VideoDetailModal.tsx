"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import type { Video } from "@/types/index";
import { fetchTmdb, fetchSeasonDetails, type Episode } from "@/lib/tmdb"; 
import { backdropVariants, modalVariants } from "@/lib/utils";

interface Props {
  video: Video;
  onClose: () => void;
  onPlay: (video: Video) => void;
}

// Helper: Render Stars
const StarRating = ({ rating }: { rating?: number }) => {
  if (!rating) return null;
  const stars = Math.round(rating) / 2; 
  
  return (
    <div className="flex items-center gap-0.5 text-yellow-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon 
          key={i} 
          name={i <= stars ? "star-fill" : "star-outline"} 
          className={`w-4 h-4 ${i <= stars ? "fill-current" : "text-gray-500"}`} 
        />
      ))}
      <span className="text-white text-xs font-bold ml-1">({rating.toFixed(1)})</span>
    </div>
  );
};

// Helper: Format Date
const formatDate = (dateString?: string) => {
  if (!dateString) return "Unknown Date";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper: Format Runtime
const formatRuntime = (minutes?: number) => {
    if (!minutes) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function VideoDetailModal({ video: initialVideo, onClose, onPlay }: Props) {
  const [video, setVideo] = useState<Video>(initialVideo);
  const [loading, setLoading] = useState(false);
  
  const [season, setSeason] = useState(video.seasonNumber || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]); 
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [visibleEpisodesCount, setVisibleEpisodesCount] = useState(10);

  const isTv = video.mediaType === 'tv' || video.type === 'series' || (video.seasonNumber && video.seasonNumber > 0);

  // 1. Load Main Details
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const type = video.mediaType || (video.type === 'series' ? 'tv' : 'movie');
        // Ensure ID is a number
        const fullData = await fetchTmdb(Number(video.id), type);
        setVideo({ ...video, ...fullData });
        
        if (fullData.seasons && fullData.seasons.length > 0) {
            const first = fullData.seasons.find((s: any) => s.season_number > 0) || fullData.seasons[0];
            setSeason(first.season_number);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [video.id]);

  // 2. Load Episodes when Season Changes
  useEffect(() => {
    if (!isTv) return;
    setVisibleEpisodesCount(10);
    const loadEps = async () => {
        setEpisodesLoading(true);
        const eps = await fetchSeasonDetails(Number(video.id), season);
        setEpisodes(eps);
        setEpisodesLoading(false);
    };
    loadEps();
  }, [video.id, season, isTv]);


  const handlePlayEpisode = (epNum: number) => {
      onPlay({
          ...video,
          seasonNumber: season,
          episodeNumber: epNum
      });
  };

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      // Ensure z-index is high enough to be above everything else
      className="fixed inset-0 z-1300 flex justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-6 md:py-10"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-5xl bg-[#141414] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto h-fit border border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* === HERO BANNER === */}
        <div className="relative h-120 w-full shrink-0">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
            >
                <Icon name="close" className="w-6 h-6" />
            </button>

            <div className="absolute inset-0">
                <img 
                    src={video.backdrop || video.poster || video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-[#141414]/40 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 p-8 w-full space-y-6">
                <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-xl leading-tight max-w-3xl">
                    {video.title}
                </h1>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handlePlayEpisode(1)} 
                        className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-neutral-200 transition"
                    >
                        <Icon name="play" className="w-7 h-7" />
                        Play
                    </button>
                    <button className="flex items-center gap-2 bg-neutral-600/80 text-white px-6 py-3 rounded font-bold hover:bg-neutral-600 transition">
                          <Icon name="plus" className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>

        {/* === CONTENT BODY === */}
        <div className="px-8 pb-8 bg-[#141414]">
            
            {/* ✅ DETAIL GRID */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 pt-4 mb-8">
                {/* LEFT: Info */}
                <div className="space-y-4">
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-300 font-medium">
                        <div className="flex items-center gap-2">
                            {video.rating && <StarRating rating={video.rating} />}
                            <span className="text-green-400 font-bold ml-2">
                               {video.rating ? `${Math.round(video.rating * 10)}% Match` : ''}
                            </span>
                        </div>
                        <span>{formatDate(video.releaseDate || video.firstAirDate)}</span>
                        
                        {video.maturityRating && (
                            <span className="border border-gray-500 px-1 rounded text-xs">
                                {video.maturityRating}
                            </span>
                        )}

                        <span>
                            {isTv 
                                ? (video.totalSeasons ? `${video.totalSeasons} Season${video.totalSeasons > 1 ? 's' : ''}` : "TV Series")
                                : (video.runtime ? formatRuntime(video.runtime) : video.duration)
                            }
                        </span>
                        <span className="border border-gray-500 px-1 rounded text-xs">HD</span>
                    </div>

                    <p className="text-gray-300 leading-relaxed text-base drop-shadow-md">
                        {video.description || video.overview}
                    </p>
                </div>

                {/* RIGHT: Cast/Genres */}
                <div className="flex flex-col gap-4 text-sm text-gray-400">
                    {video.cast && video.cast.length > 0 && (
                        <div>
                            <span className="text-gray-500">Cast: </span>
                            <span className="text-gray-200 hover:text-white cursor-pointer leading-snug">
                                {video.cast.slice(0, 5).join(", ")}
                            </span>
                        </div>
                    )}
                    {video.genres && video.genres.length > 0 && (
                        <div>
                            <span className="text-gray-500">Genres: </span>
                            <span className="text-gray-200 hover:text-white cursor-pointer leading-snug">
                                {video.genres.join(", ")}
                            </span>
                        </div>
                    )}
                    {video.creators && video.creators.length > 0 && (
                        <div>
                            <span className="text-gray-500">Creators: </span>
                            <span className="text-gray-200 hover:text-white cursor-pointer leading-snug">
                                {video.creators.slice(0, 3).join(", ")}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ EPISODES LIST */}
            {isTv && (
                <div className="mt-2 mb-10 border-t border-neutral-800 pt-8">
                    <div className="flex items-center justify-between mb-6 pb-2">
                        <h3 className="text-2xl font-bold text-white">Episodes</h3>
                        <div className="relative">
                            <select 
                                value={season}
                                onChange={(e) => setSeason(Number(e.target.value))}
                                className="bg-[#242424] border border-neutral-600 text-white px-4 py-2 rounded text-base font-medium outline-none hover:bg-[#303030] cursor-pointer appearance-none pr-8"
                            >
                                {Array.isArray(video.seasons) ? video.seasons.map((s: any) => (
                                    <option key={s.season_number} value={s.season_number}>{s.name}</option>
                                )) : <option value={1}>Season 1</option>}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Icon name="chevron-down" className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {episodesLoading ? (
                            <div className="text-gray-500 py-10 text-center">Loading episodes...</div>
                        ) : (
                            <>
                                {episodes.slice(0, visibleEpisodesCount).map((ep: any) => (
                                    <div 
                                        key={ep.id} 
                                        className="group flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg hover:bg-[#333] cursor-pointer transition border-b border-neutral-800/50 last:border-0"
                                        onClick={() => handlePlayEpisode(ep.episode_number)}
                                    >
                                        <span className="text-2xl font-bold text-gray-500 w-8 text-center shrink-0">{ep.episode_number}</span>
                                        <div className="relative w-40 aspect-video shrink-0 bg-neutral-800 rounded overflow-hidden">
                                            {ep.still_path ? (
                                                <img src={ep.still_path} alt={ep.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-600"><Icon name="image" className="w-8 h-8"/></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Icon name="play" className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 text-center sm:text-left">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                                                <h4 className="text-white font-bold text-base truncate">{ep.name}</h4>
                                                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400 shrink-0 mt-1 sm:mt-0">
                                                    {ep.vote_average > 0 && (
                                                        <div className="flex items-center gap-1 text-yellow-500">
                                                            <Icon name="star-fill" className="w-3 h-3 fill-current" />
                                                            <span className="font-bold text-white">{ep.vote_average.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                    <span>{formatDate(ep.air_date)}</span>
                                                    <span>{ep.runtime ? `${ep.runtime}m` : ""}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-sm line-clamp-2 leading-snug">{ep.overview || "No description available."}</p>
                                        </div>
                                    </div>
                                ))}
                                {episodes.length > visibleEpisodesCount && (
                                    <button 
                                        onClick={() => setVisibleEpisodesCount(prev => prev + 10)}
                                        className="w-full py-4 flex flex-col items-center text-gray-400 hover:text-white hover:bg-[#222] rounded transition group border-t border-neutral-800"
                                    >
                                        <Icon name="chevron-down" className="w-6 h-6 animate-bounce group-hover:text-red-500" />
                                        <span className="text-sm font-semibold uppercase tracking-widest mt-1">Show More Episodes</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ✅ "MORE LIKE THIS" SECTION */}
            {video.related && video.related.length > 0 && (
                <div className="mt-8 pt-8 border-t border-neutral-800">
                    <h3 className="text-2xl font-bold text-white mb-6">More Like This</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {video.related.slice(0, 9).map((rel) => (
                            <div 
                                key={rel.id} 
                                className="bg-[#2f2f2f] rounded-md overflow-hidden hover:bg-[#333] transition cursor-pointer flex flex-col group"
                                onClick={() => {
                                     setVideo(rel);
                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                <div className="relative aspect-video w-full overflow-hidden">
                                    {rel.backdrop || rel.poster || rel.thumbnailUrl ? (
                                         <img 
                                            src={rel.backdrop || rel.poster || rel.thumbnailUrl} 
                                            alt={rel.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                         />
                                    ) : (
                                         <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                            <Icon name="image" className="w-10 h-10 text-gray-600"/>
                                         </div>
                                    )}
                                    
                                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-xs font-bold text-white">
                                        {rel.duration || (rel.mediaType === 'tv' ? 'Series' : 'Movie')}
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                        <div className="bg-white/90 rounded-full p-3">
                                            <Icon name="play" className="w-8 h-8 text-black" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex flex-col gap-3 flex-1">
                                    <div className="flex justify-between items-start gap-3">
                                        <h4 className="text-gray-200 text-base font-bold leading-tight line-clamp-2">
                                            {rel.title}
                                        </h4>
                                        <button className="text-gray-400 hover:text-white transition">
                                            <Icon name="plus" className="w-6 h-6 border-2 border-gray-500 rounded-full p-0.5 hover:border-white" />
                                        </button>
                                    </div>

                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 font-medium">
                                        <span className="text-green-400 font-bold">
                                            {rel.rating ? `${Math.round(rel.rating * 10)}% Match` : "New"}
                                        </span>
                                        
                                        {rel.maturityRating && (
                                            <span className="border border-gray-500 px-1 py-0.5 rounded text-[10px]">
                                                {rel.maturityRating}
                                            </span>
                                        )}
                                        
                                        <span>{rel.releaseYear}</span>
                                    </div>

                                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
                                        {rel.description || rel.overview || "No description available for this title."}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}