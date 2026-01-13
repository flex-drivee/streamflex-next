"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Video } from "@/types";
import VideoDetailModal from "@/components/modals/VideoDetailModal";
import VideoPlayerModal from "@/components/modals/VideoPlayerModal";
import { AnimatePresence } from "framer-motion";

type PlayerContextType = {
  playVideo: (video: Video) => void;
  showDetails: (video: Video) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within GlobalPlayerProvider");
  return context;
};

export const GlobalPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const playVideo = (video: Video) => {
    setActiveVideo(null);
    setPlayingVideo(video);
  };

  const showDetails = (video: Video) => {
    setActiveVideo(video);
  };

  return (
    <PlayerContext.Provider value={{ playVideo, showDetails }}>
      {children}
      
      {/* GLOBAL MODALS */}
      <AnimatePresence>
        {activeVideo && (
          <VideoDetailModal
            video={activeVideo}
            key="detail-modal"
            onClose={() => setActiveVideo(null)}
            onPlay={playVideo}
          />
        )}
        {playingVideo && (
            <VideoPlayerModal
            video={playingVideo}
            key="player-modal"
            onClose={() => setPlayingVideo(null)}
            />
        )}
      </AnimatePresence>
    </PlayerContext.Provider>
  );
};