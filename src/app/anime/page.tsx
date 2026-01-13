"use client";

import React, { useEffect, useState } from "react";
import VideoCarousel from "@/components/VideoCarousel";
import { usePlayer } from "@/components/GlobalPlayerProvider"; 
import { 
  fetchTrendingAnime, 
  fetchPopularAnime, 
  fetchTopRatedAnime, 
  fetchAnimeMovies 
} from "@/lib/anilist";
import { Video } from "@/types/index";
import { Icon } from "@/components/icons/Icon"; 

export default function AnimePage() {
  // ✅ Hook into the Global Player System (same as Home/Search pages)
  const { playVideo, showDetails } = usePlayer();
  
  // State for different rows
  const [trending, setTrending] = useState<Video[]>([]);
  const [popular, setPopular] = useState<Video[]>([]);
  const [topRated, setTopRated] = useState<Video[]>([]);
  const [movies, setMovies] = useState<Video[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [trendData, popData, topData, movieData] = await Promise.all([
        fetchTrendingAnime(),
        fetchPopularAnime(),
        fetchTopRatedAnime(),
        fetchAnimeMovies()
      ]);
      
      setTrending(trendData);
      setPopular(popData);
      setTopRated(topData);
      setMovies(movieData);
    };

    loadData();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#141414] text-white pb-20 overflow-x-hidden">
      
      {/* Hero Section */}
      {trending.length > 0 && (
        <div className="relative w-full h-[60vh] md:h-[85vh] flex items-end">
          <div className="absolute inset-0">
             <img 
               src={trending[0].backdrop || trending[0].poster || ""} 
               alt="Hero"
               className="w-full h-full object-cover object-top"
             />
             {/* Gradient overlay for readability */}
             <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-[#141414]/40 to-transparent" />
          </div>
          
          <div className="relative z-10 px-4 md:px-12 pb-20 md:pb-32 space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black drop-shadow-xl leading-tight">
              {trending[0].title}
            </h1>
            <p className="text-sm md:text-lg text-gray-200 line-clamp-3 drop-shadow-md leading-relaxed">
              {trending[0].description}
            </p>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => playVideo(trending[0])}
                className="px-6 py-2.5 md:px-8 md:py-3 bg-white text-black font-bold rounded flex items-center gap-2 hover:bg-gray-200 transition"
              >
                <Icon name="play" className="w-6 h-6" />
                Play Now
              </button>
              <button 
                onClick={() => showDetails(trending[0])}
                className="px-6 py-2.5 md:px-8 md:py-3 bg-gray-500/70 text-white font-bold rounded flex items-center gap-2 hover:bg-gray-500/90 transition backdrop-blur-sm"
              >
                <Icon name="info" className="w-6 h-6" />
                More Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Rows */}
      {/* ✅ Fixed Layout: Reduced negative margin (-mt-10) so cards don't overlap banner text */}
      <div className="relative z-20 -mt-2 md:-mt-4 space-y-8 pl-4 md:pl-12">
        <VideoCarousel 
           title="Trending Now" 
           videos={trending} 
           onPlay={playVideo}
           onInfo={showDetails}   // ✅ Pass this!
           onExpand={showDetails} // ✅ Pass this!
        />
        <VideoCarousel 
           title="All Time Popular" 
           videos={popular} 
           onPlay={playVideo}
           onInfo={showDetails}
           onExpand={showDetails}
        />
        <VideoCarousel 
           title="Top Rated Anime" 
           videos={topRated} 
           onPlay={playVideo}
           onInfo={showDetails}
           onExpand={showDetails}
        />
        <VideoCarousel 
           title="Anime Movies" 
           videos={movies} 
           onPlay={playVideo}
           onInfo={showDetails}
           onExpand={showDetails}
        />
      </div>
    </main>
  );
}