// src/components/VideoPlayerModal.tsx
import { motion } from 'framer-motion';
import React, { useEffect, useCallback, useRef, useState } from "react";

import Hls from "hls.js";
import styles from "./VideoPlayerModal.module.css";
import { Icon } from "@/components/icons/Icon"; // ✅ Standardized import path
import { getSeriesInfo } from "@/lib/utils"; // ✅ Standardized import path
import { useClickOutside } from "@/hooks/useClickOutside"; // ✅ Standardized import path
import type { Video, SubtitleTrack, QualityOpt } from "@/types/index";
import { backdropVariants, modalVariants, modalTransition, } from "@/lib/utils"; 

/**
 * VideoPlayerModal (Complete Fixed Version)
 *
 * Props:
 *   - video: Video
 *   - onClose: () => void
 *
 * Notes:
 *   - Optional fields on Video:
 *       subtitleTracks?: SubtitleTrack[]
 *       audioTracks?: AudioTrack[]
 *       thumbnailsVtt?: string
 *       qualities?: QualityOpt[]
 *
 *   - Uses localStorage key: streamflex-player-settings-<video.id>
 */


/* ---------------------- Types ---------------------- */
type QualityItem = { label: string; url: string };

type AudioTrackId = number | "default";

type AudioTrackItem = {
  id: AudioTrackId;
  name: string;
  lang?: string;
  url?: string;
};



interface VideoMeta {
  id: string;
  title: string;
  description?: string;
  videoUrl: string; // .m3u8 or mp4
  poster?: string;
  qualities?: QualityItem[]; // fallback manual quality list
  // optional static audioTracks for non-HLS sources (not commonly used)
  audioTracks?: { lang: string; label?: string; url?: string }[];
}

interface VideoPlayerModalProps {
  video: VideoMeta;
  thumbnailsVtt?: string | null;
  onClose: () => void;
  autoPlay?: boolean;
}



interface Props {
  video: Video;
  onClose: () => void;
}

const DOUBLE_CLICK_SEEK = 10; // seconds
const CONTROLS_HIDE_MS = 2200;

function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(s: number | null | undefined): string {
  if (s == null || !isFinite(s) || s < 0) return "0:00"; // ✅ handles null, NaN, negative
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ------------------- Helpers: VTT parse ------------------- */
function parseTimestamp(ts: string): number {
  if (!ts) return 0;
  ts = ts.replace(",", ".").trim();
  const parts = ts.split(":").map((p) => p.trim());
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  const num = parseFloat(parts[0]);
  return isNaN(num) ? 0 : num;
}

function parseVtt(raw: string) {
  if (!raw || raw.trim().length === 0) {
    return [{ start: 0, end: 0, text: "No preview available" }];
  }
  const lines = raw.split(/\r?\n/);
  const cues: { start: number; end: number; text: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || /^WEBVTT/i.test(line) || /^\d+$/.test(line)) {
      i++;
      continue;
    }
    if (line.includes("-->")) {
      const [startStr, endStr] = line.split("-->").map((s) => s.trim());
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }
      cues.push({
        start: parseTimestamp(startStr),
        end: parseTimestamp(endStr),
        text: textLines.join("\n") || "No preview available",
      });
    } else {
      i++;
    }
  }
  if (cues.length === 0) return [{ start: 0, end: 0, text: "No preview available" }];
  return cues;
}

// ✅ Helper: Convert SRT to WebVTT for browser compatibility
function srtToVtt(srt: string) {
  const vtt = "WEBVTT\n\n" + srt
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Fix timestamps (comma to dot)
    .replace(/\{\\([ibu])\}/g, '</$1>') // Fix formatting tags
    .replace(/\{\\([ibu])1\}/g, '<$1>')
    .replace(/([^0-9\n\r]+)\r?\n-->/g, '$1\n-->'); // Fix cue identifiers
  return vtt;
}

// ✅ StreamFlix Helper
const getStreamFlixLink = async (
  title: string, 
  season?: number, 
  episode?: number
) => {
  try {
    // StreamFlix relies on Title searching
    const url = `/api/streamflix?title=${encodeURIComponent(title)}&season=${season || 1}&episode=${episode || 1}`;
    
    console.log(`[StreamFlix] Requesting: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const data = await res.json();
    return data; // Returns { streams: [...], ... }
  } catch (e) {
    console.error("[StreamFlix] Error:", e);
    return null;
  }
};

// ✅ Helper: Generate Deep Links for External Players
const getExternalPlayerLinks = (url: string) => {
  return [
    { name: "VLC", link: `vlc://${url}` },
    { name: "PotPlayer", link: `potplayer://${url}` },
    { name: "Infuse (Mac/iOS)", link: `infuse://x-callback-url/play?url=${encodeURIComponent(url)}` },
    { name: "Outplayer (iOS)", link: `outplayer://${url}` },
  ];
};

//// ✅ HDO Helper Function: Returns Stream + Subtitles
const getHdoLink = async (
  tmdbId: string | number, 
  imdbId: string | undefined, 
  type: 'movie' | 'tv', 
  season?: number, 
  episode?: number
) => {
  try {
    const sParams = type === 'tv' ? `&season=${season || 1}&episode=${episode || 1}` : '';
    // Pass imdbID if available to fetch subtitles
    const imdbParam = imdbId ? `&imdb=${imdbId}` : '';
    const url = `/api/hdo?tmdb=${tmdbId}${imdbParam}&type=${type}${sParams}`;
    
    console.log(`[HDO] Requesting: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const data = await res.json();
    return data; // Returns { stream: {...}, subtitles: [...] }
  } catch (e) {
    console.error("[HDO] Error:", e);
    return null;
  }
};

// ✅ HDHub Helper: Smart Season/Episode Selection
const getHdHubLink = async (title: string, type: 'movie' | 'tv', season?: number, episode?: number) => {
  try {
    let targetLink: string | null = null;
    
    // ---------------------------------------------------------
    // STRATEGY 1: BROAD SEARCH + FILTER
    // Search just the title to see if our season is in the list
    // ---------------------------------------------------------
    console.log(`[HDHub] Broad Search: ${title}`);
    let searchRes = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
    let searchData = await searchRes.json();

    if (searchData.results && searchData.results.length > 0) {
      if (type === 'tv' && season) {
        // Regex matches: "Season 1", "Season 01", "S1", "S01"
        // \b ensures we don't match "Season 10" when looking for "1"
        const seasonRegex = new RegExp(`(?:season|s)\\s*0?${season}(?!\\d)`, 'i');
        
        const match = searchData.results.find((res: any) => seasonRegex.test(res.title));
        if (match) {
          console.log(`[HDHub] Found Exact Season Match: ${match.title}`);
          targetLink = match.link;
        }
      } else {
        // For movies, just take the first result
        targetLink = searchData.results[0].link;
      }
    }

    // ---------------------------------------------------------
    // STRATEGY 2: SPECIFIC SEARCH (Fallback)
    // If broad search didn't find the specific season, force a specific query
    // ---------------------------------------------------------
    if (!targetLink && type === 'tv' && season) {
       const specificQuery = `${title} Season ${season}`;
       console.log(`[HDHub] Specific Search: ${specificQuery}`);
       searchRes = await fetch(`/api/search?q=${encodeURIComponent(specificQuery)}`);
       searchData = await searchRes.json();
       
       if (searchData.results && searchData.results.length > 0) {
         // Trust the top result of the specific search
         targetLink = searchData.results[0].link;
       }
    }

    // Default to the first broad result if everything else failed
    if (!targetLink && searchData.results && searchData.results.length > 0) {
        targetLink = searchData.results[0].link;
        console.warn(`[HDHub] Season match failed. Defaulting to: ${searchData.results[0].title}`);
    }

    if (!targetLink) return null;

    // ---------------------------------------------------------
    // SCRAPE (With Episode & No Proxy)
    // ---------------------------------------------------------
    console.log(`[HDHub] Scraping: ${targetLink}`);
    const scrapeRes = await fetch(
      `/api/hdhub4u/scrape?link=${encodeURIComponent(targetLink)}&episode=${episode || 1}&_t=${Date.now()}`, 
      { headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } }
    );
    return await scrapeRes.json();

  } catch (e) {
    console.error("[HDHub] Error:", e);
    return null;
  }
};

export default function VideoPlayerModal({ video, onClose }: Props) {
                // --- Core Refs ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
   
    // menu refs for click outside

  const menuPanelRef = useRef<HTMLDivElement>(null);
  const subsMenuPanelRef = useRef<HTMLDivElement>(null);

  const OVERLAY_DURATION = 1600;
              // --- Timeouts for overlays/controls ---
  const controlsTimeout = useRef<number | null>(null);
  const cursorTimeout = useRef<number | null>(null);
  const flashTimeout = useRef<number | null>(null);
  const volOverlayTimeout = useRef<number | null>(null);
  const pausedInfoTimeout = useRef<number | null>(null);

  const [showPausedInfo, setShowPausedInfo] = useState(false);
  const mouseMoveTimer = useRef<number | null>(null);
  const [dimVideo, setDimVideo] = useState(false);
  

              // --- Playback states ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

            // --- Timeline ---    
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [bufferPercent, setBufferPercent] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);

           // --- Volume / rate ---
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

           // --- Controls visibility ---
  const [showControls, setShowControls] = useState<boolean>(true);
  const [controlsVisibleDueToMove, setControlsVisibleDueToMove] = useState(false);

  // transient cursor overlay shown only on click/dbl/keyboard toggle
  const [showCursorPlay, setShowCursorPlay] = useState<boolean>(false)
  const [flashType, setFlashType] = useState<"play" | "pause" | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // ✅ ADD THIS: Connect to your local backend

  const [currentSource, setCurrentSource] = useState<"default" | "hdo" | "streamflix" | "hdhub4u">("default");
  const [streamUrl, setStreamUrl] = useState<string | null>(video.videoUrl || null);
  const [streamType, setStreamType] = useState<string>("hls");
  const [externalQualities, setExternalQualities] = useState<Record<string, {url: string, type: string}>>({});

// ✅ SHARED: Smart Error Handler
  const onSmartError = useCallback(() => {
    const v = videoRef.current;
    // 1. Ignore if player is gone or URL is empty (Fixes "Blank URL" error)
    if (!v || !streamUrl) return;

    // 2. Ignore if video is actually playing (Fixes "Ghost Error" on HDO)
    if (!v.paused && v.currentTime > 0 && !v.ended) return;

    // 3. Ignore if HLS is handling things (Let HLS logic decide fatal errors)
    if (hlsRef.current) return;

    // Check if it's likely a format issue (MKV)
    const isMkv = streamUrl.includes(".mkv");
    const errorDetails = v.error ? `Code ${v.error.code}: ${v.error.message}` : "Unknown Error";

    console.error("Video Error:", errorDetails);

    if (isMkv) {
      setErrorMessage("Browser cannot play .MKV files natively.");
    } else {
      setErrorMessage("Playback failed. Stream might be offline.");
    }
    
  setLoading(false);
    logAnalytics("video_error", { error: errorDetails, url: streamUrl });
  }, [streamUrl, streamType]);

// ✅ UPDATED: Fetch Stream based on Source Selection
  useEffect(() => {
    // Determine Type & IDs
    const tmdbId = video.tmdbId || video.id;
    const isTv = video.mediaType === 'tv' || video.type === 'series' || video.vidlinkType === 'tv';
    const type = isTv ? 'tv' : 'movie';
    const season = video.seasonNumber || 1;
    const episode = video.episodeNumber || 1;

    const fetchStream = async () => {
          setLoading(true);
          setErrorMessage(null);
          setStreamUrl(null);   
    
          // 1. HDO Source Selected
          if (currentSource === "hdo") {
            const result = await getHdoLink(tmdbId, video.imdb_id, type, season, episode);
            const videoUrl = result?.stream?.url;
            
            if (videoUrl) {
              setStreamUrl(videoUrl);
              // Merge subtitles
              if (result.subtitles && result.subtitles.length > 0) {
                 const newSubs = result.subtitles.map((s: any) => ({
                     lang: s.lang,
                     url: s.url,
                     label: s.label
                 }));
                 setSubtitleTracks((prev) => {
                     const existingUrls = new Set(prev.map(p => p.url));
                     const uniqueNew = newSubs.filter((n: any) => !existingUrls.has(n.url));
                     return [...prev, ...uniqueNew];
                 });
              }
            } else {
              setErrorMessage("Stream not found on HDO."); // ✅ Use setErrorMessage
            }
            setLoading(false);
            return;
          }

          // 2. StreamFlix Source (✅ THIS WAS MISSING)
          if (currentSource === "streamflix") {
            const result = await getStreamFlixLink(video.title, season, episode);
            
            if (result && result.streams && result.streams.length > 0) {
              const bestStream = result.streams[0]; 
              console.log(`[StreamFlix] Playing: ${bestStream.link}`);
              setStreamUrl(bestStream.link);
            } else {
              setErrorMessage("Stream not found on StreamFlix.");
            }
            setLoading(false);
            return;
          }

// 3. HDHub4u Source (UPDATED)
          if (currentSource === "hdhub4u") {
            const result = await getHdHubLink(video.title, type, season, episode);
            
            if (result && result.streamUrl) {
              setStreamUrl(result.streamUrl);
              setStreamType(result.streamType || 'hls');

              // ✅ Handle Multi-Quality Options
              if (result.qualities && Object.keys(result.qualities).length > 0) {
                  setExternalQualities(result.qualities);
                  
                  // Map to UI-friendly list
                  const qOpts: QualityOpt[] = Object.entries(result.qualities).map(([label, data]: any) => ({
                      label: label.toUpperCase(),
                      url: data.url
                  }));
                  setQualityList(qOpts);
                  
                  // Set initial selected index to match the current streamUrl
                  const selectedIdx = qOpts.findIndex(q => q.url === result.streamUrl);
                  setSelectedQualityIndex(selectedIdx !== -1 ? selectedIdx : 0);
              } else {
                  setExternalQualities({});
                  setQualityList([]);
              }
            } else {
              setErrorMessage("Stream not found on HDHub4u.");
            }
            setLoading(false);
            return;
          }
                    
          // 3. Default Source
          if (video.videoUrl) {
             setStreamUrl(video.videoUrl);
          } else {
             setErrorMessage("No stream available.");
          }
          setLoading(false);
    };

    fetchStream();
  }, [currentSource, video]);

  // Ripple feedback
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  // 🌀 Ripple state and cleanup
  const rippleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRipple = (clientX: number, clientY: number) => {
    if (rippleTimeout.current) clearTimeout(rippleTimeout.current);

    setRipple({ x: clientX, y: clientY, id: Date.now() });

    rippleTimeout.current = setTimeout(() => {
      setRipple(null);
    }, 450); // match CSS animation length
  };

  useEffect(() => {
    return () => {
      if (rippleTimeout.current) clearTimeout(rippleTimeout.current);
    };
  }, []);



         // --- Subtitles ---
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(video.subtitleTracks ?? []);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);

           // --- Episodes ---
  const [episodes, setEpisodes] = useState<{ id: string; title?: string; src?: string }[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number>(0);

           // --- Thumbnails & previews ---
  const [thumbnailsVtt, setThumbnailsVtt] = useState<string | null>((video as any).thumbnailsVtt ?? null);
  const [thumbPreview, setThumbPreview] = useState<{ url: string; x: number } | null>(null);
  const [vttCues, setVttCues] = useState<{ start: number; end: number; text: string }[]>([]);
       
          // --- Auto play next episode ---
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);

            // --- Quality / Audio Tracks ---
  const [qualityList, setQualityList] = useState<QualityOpt[]>(video.qualities ?? []);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(-1);

  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | "default">("default");
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* 🗣 Live Language Overlay */
const [langOverlay, setLangOverlay] = useState<{
  type: "audio" | "subtitle";
  label: string;
} | null>(null);

function showLanguageOverlay(type: "audio" | "subtitle", label: string) {
  setLangOverlay({ type, label });
  setTimeout(() => setLangOverlay(null), OVERLAY_DURATION);
}

function logAnalytics(event: string, data: Record<string, any> = {}) {
  const payload = {
    event,
    videoId: video.id,
    title: video.title,
    data,
    ts: Date.now(),
  };

  console.log("📊 Analytics:", payload);

  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", event, payload);
  }
}



// --- Quality Switch Handler (Updated for External Sources) ---
  const handleQualitySwitch = (idx: number) => {
    const v = videoRef.current;
    if (!v) return;

    const currentTime = v.currentTime || 0;
    const wasPlaying = !v.paused;

    // ✅ Case A: HDHub External Qualities (Switch Source URL)
    if (Object.keys(externalQualities).length > 0) {
        const selectedQ = qualityList[idx];
        // Find the matching entry in externalQualities
        const entry = Object.values(externalQualities).find(e => e.url === selectedQ.url);
        
        if (entry) {
            console.log(`[Player] Switching to ${selectedQ.label} (${entry.type})`);
            setStreamUrl(entry.url);
            setStreamType(entry.type); // Updates UI to "Download" if MKV
            setSelectedQualityIndex(idx);
            closeMenu();
            return;
        }
    }

    // ✅ Case B: HLS Internal Levels (Standard behavior)
    if (hlsRef.current && Hls.isSupported()) {
      hlsRef.current.currentLevel = idx; // -1 = Auto
    } else {
      // ✅ Case C: Native fallback for MP4
      const quality = qualityList[idx];
      if (quality && quality.url !== v.src) {
        v.src = quality.url;
        v.currentTime = currentTime;
        if (wasPlaying) {
          v.play().catch(() => {});
        }
      }
    }

    setSelectedQualityIndex(idx);
    closeMenu();

    logAnalytics("quality_change", {
      label: idx === -1 ? "Auto" : qualityList[idx]?.label,
      index: idx,
    });
  };

// --- Audio Switch Handler ---
const handleAudioSwitch = (trackId: number | "default") => {
  if (!hlsRef.current) {
    // fallback for native video (rare)
    setSelectedAudioTrack("default");
    return;
  }

  try {
    if (trackId === "default") {
      hlsRef.current.audioTrack = 0; // first/default
    } else {
      hlsRef.current.audioTrack = trackId;
    }

    setSelectedAudioTrack(trackId);

    logAnalytics("audio_change", {
      trackId,
      trackName:
        trackId === "default"
          ? "Default"
          : audioTracks.find((t) => t.id === trackId)?.name,
    });

    closeMenu();


  } catch (err) {
    console.error("Failed to switch audio track", err);
  }
};


// When mouse moves
// When mouse moves
const handleMouseMove = () => {
  const v = videoRef.current;
  if (!v) return;

  // 1. Show controls temporarily (Existing logic)
  setShowControls(true);
  showControlsTemporarily();

  // 2. Hide paused info + dim temporarily if it's currently showing
  if (showPausedInfo) {
    setShowPausedInfo(false);
    setDimVideo(false);
  }

  // 3. Clear any existing re-show timer
  if (mouseMoveTimer.current) {
    window.clearTimeout(mouseMoveTimer.current);
    mouseMoveTimer.current = null;
  }

  // 4. ONLY start a re-show timer IF the video is paused
  if (v.paused) {
    mouseMoveTimer.current = window.setTimeout(() => {
      // Re-show the paused info and dim effect
      setShowPausedInfo(true);
      setDimVideo(true);
      mouseMoveTimer.current = null;
    }, 2000) as unknown as number; // 2 seconds delay to re-show
  }
};
  
useEffect(() => {
  const handleFullscreenChange = () => {
    const fsElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement;

    setIsFullscreen(!!fsElement);
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("msfullscreenchange", handleFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.removeEventListener("msfullscreenchange", handleFullscreenChange);
  };
}, []);


  // Menus
  type Menu = null | "subs" | "quality" | "settings";
  const [openMenu, setOpenMenu] = useState<Menu>(null);
  const [isMenuFading, setIsMenuFading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"speed" | "audio" | "quality" | "source">("speed");
  const [isSpinning, setIsSpinning] = useState(false);


useClickOutside(
  menuPanelRef,
  () => {
    closeMenu();
  },
  !!openMenu
);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [showUpNextOverlay, setShowUpNextOverlay] = useState(false);

  // volume overlay
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const [volumeOverlayValue, setVolumeOverlayValue] = useState<number>(Math.round(volume * 100));
  const [showVolumePanel, setShowVolumePanel] = useState(false);

  // load persisted settings for this video
  const settingsKey = (vid: Video) => `streamflex-player-settings-${vid.id}`;

  // Utility: show controls briefly (with fade + always visible when paused)
  const showControlsTemporarily = (timeout = CONTROLS_HIDE_MS) => {
    setShowControls(true);
    setControlsVisibleDueToMove(true);

    if (controlsTimeout.current) {
      window.clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }

    controlsTimeout.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;

      // If paused, keep controls visible
      if (v.paused) {
        setShowControls(true);
        setControlsVisibleDueToMove(false);
        return;
      }

      // Otherwise, fade them out
      setShowControls(false);
      setControlsVisibleDueToMove(false);
      controlsTimeout.current = null;
    }, timeout) as unknown as number;
  };

  // Trigger flash overlay (1s) and clear previous
  const triggerFlash = (type: "play" | "pause") => {
    setFlashType(type);
    if (flashTimeout.current) {
      window.clearTimeout(flashTimeout.current);
      flashTimeout.current = null;
    }
    flashTimeout.current = window.setTimeout(() => {
      setFlashType(null);
      flashTimeout.current = null;
    }, OVERLAY_DURATION);
  };

  // show volume overlay helper
  const showVolOverlay = (val: number) => {
    setVolumeOverlayValue(Math.round(val * 100));
    setShowVolumeOverlay(true);
    if (volOverlayTimeout.current) {
      window.clearTimeout(volOverlayTimeout.current);
      volOverlayTimeout.current = null;
    }
    volOverlayTimeout.current = window.setTimeout(() => {
      setShowVolumeOverlay(false);
      volOverlayTimeout.current = null;
    }, OVERLAY_DURATION);
  };

  // transient cursor overlay
  const showCursorTransient = (clientX: number, clientY: number, duration = 800) => {
    setCursorPos({ x: clientX, y: clientY });
    setShowCursorPlay(true);
    if (cursorTimeout.current) {
      window.clearTimeout(cursorTimeout.current);
      cursorTimeout.current = null;
    }
    cursorTimeout.current = window.setTimeout(() => {
      setShowCursorPlay(false);
      cursorTimeout.current = null;
    }, duration) as unknown as number;
  };

useEffect(() => {
  if (openMenu) {
    setIsMenuFading(false); // reset fade state when opening
  }
}, [openMenu]);


  /* ---------------- Load video + HLS + VTT + persisted settings ---------------- */
  useEffect(() => {
      const v = videoRef.current;
      // ✅ NEW: Wait for streamUrl to be ready
      if (!v || !streamUrl) return;
    
    setLoading(true);
    setError(null);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

// HLS support
    if (Hls.isSupported() && streamUrl.includes(".m3u8")) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(v);

      // ♻️ REUSABLE FUNCTION: Extracts audio tracks whenever HLS updates
      const updateAudioTracks = () => {
          try {
              const languageMap: Record<string, string> = {
                  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
                  pt: "Portuguese", ru: "Russian", pl: "Polish", nl: "Dutch", sv: "Swedish",
                  ja: "Japanese", ko: "Korean", zh: "Chinese", hi: "Hindi", ar: "Arabic",
                  bn: "Bengali", ur: "Urdu", ta: "Tamil", tr: "Turkish",
              };

              const hlsTracks = hls.audioTracks || [];
              
              if (hlsTracks.length > 0) {
                  const mergedTracks = hlsTracks.map((t: any, idx: number) => {
                      let displayName = t.name?.trim();
                      if (!displayName && t.lang) {
                          const langCode = t.lang.toLowerCase();
                          displayName = languageMap[langCode] || t.lang;
                      }
                      return {
                          id: idx,
                          name: displayName || `Track ${idx + 1}`,
                          lang: t.lang,
                      };
                  });

                  // Add "Default" + The Found Tracks
                  setAudioTracks([{ id: "default", name: "Auto / Default" }, ...mergedTracks]);
                  
                  // Auto-select the correct track if one is active
                  const currentIdx = hls.audioTrack;
                  if (currentIdx !== -1 && mergedTracks[currentIdx]) {
                       setSelectedAudioTrack(currentIdx);
                  }
                  
                  console.log(`[Player] Updated Audio Tracks: ${mergedTracks.length} found.`);
              }
          } catch (err) {
              console.warn("Failed to parse audio tracks:", err);
          }
      };
          
      hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
        setErrorMessage(null); 
        setLoading(false);
        try { v.play().catch(() => {}); } catch {}
        
        // 1. Handle Qualities
        try {
          const levels = (data && data.levels) || [];
          const qlist = levels.map((lvl: any, idx: number) => {
            const label = lvl?.height
              ? `${lvl.height}p`
              : lvl?.bitrate
              ? `${Math.round(lvl.bitrate / 1000)}kbps`
              : `Level ${idx + 1}`;
            return { label, url: lvl?.url || `${video.videoUrl}#level=${idx}` };
          });

          setQualityList(qlist);
          setSelectedQualityIndex(-1); // -1 = Auto
        } catch (e) {}

        // 2. Initial Audio Check
        updateAudioTracks();
      });
      
      // ✅ THE FIX: Listen for "AUDIO_TRACKS_UPDATED" and re-run the check!
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          console.log("[Player] Audio tracks event received, refreshing list...");
          updateAudioTracks();
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
          const currentIdx = hls.audioTrack;
          setSelectedAudioTrack(currentIdx === -1 ? "default" : currentIdx);
      });

      // Error Handling
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad(); 
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setErrorMessage("Playback Error: Stream is offline or blocked.");
            setLoading(false);
            try { hls.destroy(); } catch {}
            break;
        }
      });

      return () => {
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch {}
          hlsRef.current = null;
        }
      };
      
      
    } else {
      // ✅ NEW: Native playback uses streamUrl
      v.src = streamUrl;
      v.load(); // 👈 Important: Force reload the video element
      setQualityList(video.qualities ?? []);
      setLoading(false);
      setErrorMessage(null); // 👈 Important: Clear any old errors
      v.play().catch(() => {});
    }

    // load persisted settings
    try {
      const raw = localStorage.getItem(settingsKey(video));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1) {
          setVolume(parsed.volume);
        }
        if (typeof parsed.playbackRate === "number" && parsed.playbackRate > 0) {
          setPlaybackRate(parsed.playbackRate);
        }
        if (typeof parsed.activeSubtitle === "string" || parsed.activeSubtitle === null) {
          setActiveSubtitle(parsed.activeSubtitle);
        }
      }
    } catch (err) {
      console.warn("Failed to load persisted player settings:", err);
    }

    const onLoaded = () => {
      if (v.duration && isFinite(v.duration)) {
        setDuration(v.duration);
      }
      setLoading(false);
      v.volume = volume;
      v.playbackRate = playbackRate;
      v.muted = isMuted;
    
      // 🎬 Apply persisted subtitle track after metadata is available
      if (activeSubtitle !== undefined) {
        handleSubtitleChange(activeSubtitle);
      }
    };


    const onLoadStart = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = onSmartError;

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [streamUrl, video.id]);

  /* ---------------- Playback/time listeners ---------------- */
useEffect(() => {
  const v = videoRef.current;
  if (!v) return;

  logAnalytics("session_start", {
    videoId: video.id,
    title: video.title,
  });

  const onLoadedMetadata = () => {
  if (v.duration && isFinite(v.duration)) {
    setDuration(v.duration);
  }
  };


const onPlay = () => {
    setIsPlaying(true);
    setShowPausedInfo(false); 
    setDimVideo(false); // <--- ADD THIS LINE HERE (or ensure it's already there)

    // Clear ALL pending "show info" timeouts/refs
    if (pausedInfoTimeout.current) {
        clearTimeout(pausedInfoTimeout.current);
        pausedInfoTimeout.current = null;
    }
    if (mouseMoveTimer.current) {
        clearTimeout(mouseMoveTimer.current);
        mouseMoveTimer.current = null;
    }

    logAnalytics("video_play", { currentTime: v.currentTime });
};


  const onPause = () => {
      setIsPlaying(false);
      logAnalytics("video_pause", { currentTime: v.currentTime });

      // 1. Clear any immediate re-show timer just in case
      if (mouseMoveTimer.current) {
          clearTimeout(mouseMoveTimer.current);
          mouseMoveTimer.current = null;
      }

      // 2. Start the 10-second timer to show overlay + dim
      if (!pausedInfoTimeout.current) {
        pausedInfoTimeout.current = window.setTimeout(() => {
          setShowPausedInfo(true);
          setDimVideo(true);
          pausedInfoTimeout.current = null;
        }, 10000);
      }

  };

  const onTime = () => {
    setCurrentTime(v.currentTime);
    if (v.duration && v.duration > 0 && isFinite(v.duration)) {
      setProgressPercent((v.currentTime / v.duration) * 100);
    }

    // Heartbeat every 15 seconds
    const now = Date.now();
    if (now - lastHeartbeat > 15000) {
      logAnalytics("video_heartbeat", {
        currentTime: v.currentTime,
        duration: v.duration,
      });
      lastHeartbeat = now;
    }
  };

  const onProgress = () => {
    if (v.buffered && v.buffered.length > 0 && v.duration && v.duration > 0 && isFinite(v.duration)) {
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferPercent((end / v.duration) * 100);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setShowResumeOverlay(true);
    if (autoPlayNext) {
      setShowUpNextOverlay(true);
    }
    logAnalytics("video_end", { duration: v.duration });
  };

  const onSeeked = () => {
    setLoading(false);
    logAnalytics("video_seek", { newTime: v.currentTime });
  };

  const onVolumeChange = () => {
    logAnalytics("video_volume", { volume: v.volume, muted: v.muted });
  };

  const onError = onSmartError;

  const onWaiting = () => {
    setLoading(true);
    logAnalytics("video_buffering_start", { currentTime: v.currentTime });
  };

  const onPlaying = () => {
    setLoading(false);
    logAnalytics("video_buffering_end", { currentTime: v.currentTime });
  };

  let lastHeartbeat = 0;

  v.addEventListener("play", onPlay);
  v.addEventListener("pause", onPause);
  v.addEventListener("timeupdate", onTime);
  v.addEventListener("progress", onProgress);
  v.addEventListener("ended", onEnded);
  v.addEventListener("seeked", onSeeked);
  v.addEventListener("volumechange", onVolumeChange);
  v.addEventListener("error", onError);
  v.addEventListener("waiting", onWaiting);
  v.addEventListener("playing", onPlaying);
  v.addEventListener("loadedmetadata", onLoadedMetadata);

  return () => {
      if (pausedInfoTimeout.current) {
        clearTimeout(pausedInfoTimeout.current);
        pausedInfoTimeout.current = null;
      }
      // 🧹 NEW: Clear the mouse re-show timer on component unmount
      if (mouseMoveTimer.current) {
          clearTimeout(mouseMoveTimer.current);
          mouseMoveTimer.current = null;
      }
    logAnalytics("session_end", {
      videoId: video.id,
      title: video.title,
      lastTime: v.currentTime,
    });

    v.removeEventListener("play", onPlay);
    v.removeEventListener("pause", onPause);
    v.removeEventListener("timeupdate", onTime);
    v.removeEventListener("progress", onProgress);
    v.removeEventListener("ended", onEnded);
    v.removeEventListener("seeked", onSeeked);
    v.removeEventListener("volumechange", onVolumeChange);
    v.removeEventListener("error", onError);
    v.removeEventListener("waiting", onWaiting);
    v.removeEventListener("playing", onPlaying);
    v.removeEventListener("loadedmetadata", onLoadedMetadata);
  };
}, [autoPlayNext, episodes, activeEpisodeIndex, video.id]);

 /* ---------------- VTT thumbnails load ---------------- */
  useEffect(() => {
    if (!thumbnailsVtt) {
      setVttCues([]);
      return;
    }
  
    const ac = new AbortController();
  
    fetch(thumbnailsVtt, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => setVttCues(parseVtt(text)))
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Failed to load VTT thumbnails:", err);
          setVttCues([]);
        }
      });
    
    return () => ac.abort(); // ✅ cleanup to avoid leaks
  }, [thumbnailsVtt]);
  

  // Updated togglePlay: unified toggling + flash overlays + show controls + cursor transient
const togglePlay = (clientX?: number, clientY?: number) => {
  console.log("[player] togglePlay called, paused:", videoRef.current?.paused, "loading:", loading, "error:", errorMessage);
  const v = videoRef.current;
  if (!v) return;

  if (v.paused) {
    v.play().catch((err) => {
      console.warn("Play failed:", err);
      setError("Failed to play video.");
    });
    triggerFlash("play");
  } else {
    v.pause();
    triggerFlash("pause");
  }

  showControlsTemporarily();

  if (typeof clientX === "number" && typeof clientY === "number") {
    showCursorTransient(clientX, clientY);
  }
};

// ✅ UPDATED: Handle Subtitles (Fetch -> Convert SRT to VTT -> Blob)
  const handleSubtitleChange = async (lang: string | null) => {
    closeMenu(); // Close menu immediately
    setActiveSubtitle(lang);
    
    const v = videoRef.current;
    if (!v) return;

    // Turn off if requested
    if (!lang) {
      Array.from(v.textTracks).forEach((t) => (t.mode = "hidden"));
      showLanguageOverlay("subtitle", "Off");
      return;
    }

    // Find the track
    const trackIndex = subtitleTracks.findIndex((t) => t.lang === lang);
    const track = subtitleTracks[trackIndex];

    if (track) {
      // If external URL (not blob), fetch and convert
      if (track.url && !track.url.startsWith("blob:")) {
        try {
          console.log(`[Subtitles] Fetching & converting: ${track.lang}`);
          const resp = await fetch(track.url);
          const text = await resp.text();
          
          // Convert SRT to VTT
          const vttText = srtToVtt(text);
          
          // Create local Blob
          const blob = new Blob([vttText], { type: "text/vtt" });
          const blobUrl = URL.createObjectURL(blob);

          // Update state
          const newTracks = [...subtitleTracks];
          newTracks[trackIndex] = { ...track, url: blobUrl };
          setSubtitleTracks(newTracks);
          
          // Wait for DOM update then activate
          setTimeout(() => {
             const updatedV = videoRef.current;
             if (!updatedV) return;
             Array.from(updatedV.textTracks).forEach((t) => {
                const trackLabel = t.label || t.language;
                if (trackLabel === (track.label || track.lang)) t.mode = "showing";
                else t.mode = "hidden";
             });
          }, 100);

        } catch (e) {
          console.error("Subtitle conversion failed:", e);
          showLanguageOverlay("subtitle", "Error loading sub");
        }
      } else {
        // Already a blob or native track
        Array.from(v.textTracks).forEach((t) => {
           const trackLabel = t.label || t.language;
           if (trackLabel === (track.label || track.lang)) t.mode = "showing";
           else t.mode = "hidden";
        });
      }
      showLanguageOverlay("subtitle", track.label || track.lang);
    }
  };

  // menu toggles
  const toggleMenu = (m: Menu) => {
    setOpenMenu((prev) => (prev === m ? null : m));
    if (m === "settings") setSettingsTab("speed");
  };

  // 🔵 Control fullscreen entry/exit (used by F key or button)
const requestFullscreen = (el: HTMLElement) => {
  const anyEl = el as any;
  if (anyEl.requestFullscreen) return anyEl.requestFullscreen();
  if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
  if (anyEl.msRequestFullscreen) return anyEl.msRequestFullscreen();
};

const exitFullscreen = () => {
  const doc: any = document;
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.msExitFullscreen) return doc.msExitFullscreen();
};

// 🎛 Unified menu-closing helper
const closeMenu = (delay = 200) => {
  setIsMenuFading(true);
  setTimeout(() => {
    setOpenMenu(null);
    setIsMenuFading(false);
  }, delay);
};

// Toggle helper (for F key and button)
const toggleFullscreen = () => {
  const el = containerRef.current;
  if (!el) return;

  const fsElement =
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement;

  if (!fsElement) requestFullscreen(el);
  else exitFullscreen();
};


/* ---------------- Keyboard Shortcuts ---------------- */

const onKey = useCallback(
  (e: KeyboardEvent) => {
    const v = videoRef.current;
    if (!v) return;

    // Ignore inputs / textareas / editable elements
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      (e.target as HTMLElement).isContentEditable
    ) {
      return;
    }

    // --- Helper functions ---
    const requestFullscreen = (el: HTMLElement) => {
      const anyEl = el as any;
      if (anyEl.requestFullscreen) return anyEl.requestFullscreen();
      if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
      if (anyEl.msRequestFullscreen) return anyEl.msRequestFullscreen();
    };

    const exitFullscreen = () => {
      const doc: any = document;
      if (doc.exitFullscreen) return doc.exitFullscreen();
      if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
      if (doc.msExitFullscreen) return doc.msExitFullscreen();
    };

    switch (e.code) {
      /* ▶️ Play / Pause */
      case "Space":
        e.preventDefault();
        togglePlay(window.innerWidth / 2, window.innerHeight / 2);
        break;

      /* ⛶ Fullscreen */
      case "KeyF":
        e.preventDefault();
        toggleFullscreen();
        break;


      /* 🔇 Mute / Unmute */
      case "KeyM":
        e.preventDefault();
        const newMuted = !v.muted;
        v.muted = newMuted;
        setIsMuted(newMuted);
        showVolOverlay(newMuted ? 0 : v.volume);
        break;

      /* ⏩ / ⏪ Skip */
      case "ArrowRight":
        e.preventDefault();
        if (v.duration && isFinite(v.duration)) {
          v.currentTime = Math.min(v.duration, v.currentTime + 5);
        }
        break;

      case "ArrowLeft":
        e.preventDefault();
        if (v.duration && isFinite(v.duration)) {
          v.currentTime = Math.max(0, v.currentTime - 5);
        }
        break;

      /* 🔊 Volume */
      case "ArrowUp":
        e.preventDefault();
        const volUp = clamp(v.volume + 0.05, 0, 1);
        v.volume = volUp;
        v.muted = false;
        setVolume(volUp);
        setIsMuted(false);
        showVolOverlay(volUp);
        break;

      case "ArrowDown":
        e.preventDefault();
        const volDown = clamp(v.volume - 0.05, 0, 1);
        v.volume = volDown;
        setVolume(volDown);
        if (volDown === 0) {
          v.muted = true;
          setIsMuted(true);
        }
        showVolOverlay(volDown);
        break;

      /* 🖼 Picture-in-Picture */
      case "KeyP":
        e.preventDefault();
        try {
          if ("requestPictureInPicture" in v) {
            (v as any).requestPictureInPicture().catch(() => {});
          }
        } catch {}
        break;

      /* 💬 Toggle Subtitles */
      case "KeyC":
        e.preventDefault();
        if (!subtitleTracks?.length) return;
        if (activeSubtitle === null) {
          handleSubtitleChange(subtitleTracks[0].lang);
        } else {
          handleSubtitleChange(null);
        }
        break;

      /* 🎧 Cycle Audio Tracks */
      case "KeyD":
        e.preventDefault();
        if (!audioTracks?.length) return;
        const idx = audioTracks.findIndex(
          (a) => a.id === selectedAudioTrack
        );
        const next = audioTracks[(idx + 1) % audioTracks.length];
        if (next) handleAudioSwitch(next.id);
        break;

      /* ❌ Close / Exit */
      case "Escape":
        e.preventDefault();
        onClose();
        break;

      /* ⏩ Jump to percentage (0–9) */
      default:
        if (e.code.startsWith("Digit")) {
          const digit = Number(e.code.replace("Digit", ""));
          if (!isNaN(digit) && v.duration && isFinite(v.duration)) {
            v.currentTime = (v.duration * digit) / 10;
          }
        }
        break;
    }
  },
  [
    togglePlay,
    setIsMuted,
    showVolOverlay,
    setVolume,
    handleSubtitleChange,
    handleAudioSwitch,
    activeSubtitle,
    subtitleTracks,
    audioTracks,
    selectedAudioTrack,
    onClose,
  ]
);

// ✅ Attach listener only once per stable `onKey`
useEffect(() => {
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [onKey]);

  /* ---------------- UI handlers ---------------- */
  // ✅ Fix stop() to accept all React events safely
  const stop = (e?: Event | React.SyntheticEvent) => {
    if (e && "stopPropagation" in e && typeof (e as any).stopPropagation === "function") {
      (e as any).stopPropagation();
    }
  };


// 🎧 Handle Audio Track Selection
function handleAudioChange(trackId: number | "default") {
  // 🔹 Switch the actual audio stream (HLS or native)
  handleAudioSwitch(trackId);

  // 🔹 Update local state
  setSelectedAudioTrack(trackId);

  // 🔹 Show audio language overlay
  const selected = audioTracks.find((a) => a.id === trackId);
  if (selected) {
    showLanguageOverlay("audio", selected.name);
  }

  // 🔹 Close the menu with fade animation
  closeMenu();
}

  // ✅ Fix handleVideoClick to support both Mouse & Touch events
  let lastTapTime = 0; // 🔹 Store last tap timestamp
  const TAP_THRESHOLD = 300; // ms — ignore taps that occur too close together

  const handleVideoClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTime < TAP_THRESHOLD) {
      console.log("[player] Ignored quick double-tap");
      return; // 🚫 Skip rapid consecutive taps
    }
    lastTapTime = now;

    const target = e.target as HTMLElement;

    // 🧠 Ignore clicks inside UI controls or overlays
    if (
      target.closest("button") ||
      target.closest("input[type='range']") ||
      target.closest("[role='menu']") ||
      target.closest("[data-tooltip]") ||
      target.closest("[data-ignore-toggle]") ||
      target.closest(`.${styles.controlsWrap}`) ||
      target.closest(`.${styles.resumeBox}`) ||
      target.closest(`.${styles.upNextBox}`)
    ) {
      return; // ⛔ Do nothing if click is inside interactive UI
    }

    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // 🌀 Trigger ripple instantly for feedback
    triggerRipple(clientX, clientY);

    // ▶️ Then toggle playback
    togglePlay(clientX, clientY);
  };



  


  const handleDoubleClick = (e: React.MouseEvent) => {
    stop(e);
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const isRight = e.clientX > rect.left + rect.width / 2;
    const seekAmount = isRight ? DOUBLE_CLICK_SEEK : -DOUBLE_CLICK_SEEK;
    v.currentTime = clamp(v.currentTime + seekAmount, 0, v.duration);
    showCursorTransient(e.clientX, e.clientY);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    stop(e);
    const el = progressRef.current;
    const v = videoRef.current;
    if (!el || !v || !duration || !isFinite(duration)) return;
    
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = clamp(x / rect.width, 0, 1);
    v.currentTime = pct * duration;
    setProgressPercent(pct * 100);
    showControlsTemporarily();
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    stop(e);
    const el = progressRef.current;
    const v = videoRef.current;
    if (!el || !v || !duration || !isFinite(duration)) return;
    
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = clamp(x / rect.width, 0, 1);
    const time = pct * duration;
    setHoverTime(time);
    setHoverX(e.clientX);

    if (vttCues && vttCues.length > 0) {
      const cue = vttCues.find((c) => time >= c.start && time <= c.end);
      if (cue && cue.text) {
        setThumbPreview({ url: cue.text, x: e.clientX });
        return;
      }
    }
    setThumbPreview(null);
  };

  const handleProgressLeave = () => {
    setHoverTime(null);
    setHoverX(null);
    setThumbPreview(null);
  };

  // --- helper to constrain between 0–1
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  
  const beginDrag = (e: React.MouseEvent) => {
    e.preventDefault();
  
    const startDrag = (ev: MouseEvent) => {
      const el = progressRef.current;
      const v = videoRef.current;
      if (!el || !v || !duration || !isFinite(duration)) return;
    
      const rect = el.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = clamp(x / rect.width, 0, 1);
      setProgressPercent(pct * 100);
      v.currentTime = pct * duration;
    };
  
    const endDrag = () => {
      document.removeEventListener("mousemove", startDrag);
      document.removeEventListener("mouseup", endDrag);
    };
  
    document.addEventListener("mousemove", startDrag);
    document.addEventListener("mouseup", endDrag);
  };
  
  // ✅ NEW: Cleanup any leftover listeners if component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", () => {});
      document.removeEventListener("mouseup", () => {});
    };
  }, []);
  

  const handleVolumeChange = (val: number) => {
    const v = videoRef.current;
    const normalized = clamp(val, 0, 1);
    
    setVolume(normalized);
    setIsMuted(normalized === 0);
    
    if (v) {
      v.volume = normalized;
      v.muted = normalized === 0;
    }
    
    try {
      const key = settingsKey(video);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.volume = normalized;
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (err) {
      console.warn("Failed to save volume setting:", err);
    }
    
    showVolOverlay(normalized);
  };

  const getVolumeIconName = () => {
    if (isMuted || volume === 0) return "volume-off";
    if (volume <= 0.35) return "volume-low";
    if (volume <= 0.70) return "volume-medium";
    return "volume-high";
  };

  const handlePlaybackRateChange = (r: number) => {
    if (r <= 0) return;
    
    setPlaybackRate(r);
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    
    try {
      const key = settingsKey(video);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.playbackRate = r;
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (err) {
      console.warn("Failed to save playback rate:", err);
    }
    


  };

  // Close menus if clicking outside
useClickOutside(
  menuPanelRef,
  () => {
    closeMenu();
  },
  openMenu === "settings"
);


useClickOutside(
  subsMenuPanelRef,
  () => {
  closeMenu();
  },
  openMenu === "subs" // Only active when Subtitles is open
);


  // Cleanup timeouts and HLS on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) window.clearTimeout(controlsTimeout.current);
      if (cursorTimeout.current) window.clearTimeout(cursorTimeout.current);
      if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
      if (volOverlayTimeout.current) window.clearTimeout(volOverlayTimeout.current);
      
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, []);



  // Slider background style (blue fill)
  const sliderBg = (val: number) => {
    const pct = Math.round(clamp(val, 0, 1) * 100);
    return { 
      background: `linear-gradient(90deg, #3b82f6 ${pct}%, rgba(255,255,255,0.12) ${pct}%)` 
    } as React.CSSProperties;
  };

  const closeVisible = showControls || !isPlaying || openMenu !== null;

  return (
    <motion.div
     variants={backdropVariants}
     initial="hidden" 
     animate="visible" 
     exit="exit"
      ref={containerRef}
      className={`${styles.overlay} fixed inset-0 z-50 flex items-center justify-center`}
      role="dialog"
      aria-label={`Video player: ${video.title}`}
       onMouseMove={handleMouseMove}
    >
      {/* backdrop close */}
      <div 
        className="absolute inset-0 bg-black/90" 
        onClick={() => onClose()}
        aria-label="Close player" 
      />

      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={modalTransition}
        
        
        onMouseMove= {() => showControlsTemporarily()}
        onPointerDown={handleVideoClick}
        className={styles.videoContainer}
        style={{ maxHeight: "100vh", maxWidth: "100vw", position: "relative" }}
        
      >
        {/* Close button - positioned absolutely at top-right */}
        <div
          className={`${styles.closeButtonWrapper} ${closeVisible ? styles.closeVisible : styles.closeHidden}`}
          aria-hidden={!closeVisible}
        >
          <button
            type="button"
            className={styles.closeTopRight}
            data-tooltip="Close (Esc)"
            onClick={(e) => {
              stop(e);
              onClose();
            }}
            aria-label="Close player"
          >
            <Icon name="close" className={`${styles.iconBase} ${styles.iconXLarge}`} />
          </button>
        </div>

        {/* video element */}
        <video
          ref={videoRef}
          className={styles.videoElement}
          playsInline
          crossOrigin="anonymous"
        >
          
          {subtitleTracks?.map((track: SubtitleTrack, idx: number) => (
            <track 
              key={`${track.lang}-${idx}`}
              src={track.url} 
              kind="subtitles" 
              srcLang={track.lang} 
              label={track.label} 
              default={idx === 0} 
            />
          ))}
        </video>
        {/* --- Dim overlay --- */}
        <div className={`${styles.dimOverlay} ${dimVideo ? "" : styles.hide}`} />

        {/* --- Paused Info Overlay --- */}
        {video && (
          <div
            className={`${styles.pausedInfoOverlay} ${
              showPausedInfo ? "" : styles.hide
            }`}
          >
            <div className={styles.pausedInfoText}>
              <div className={styles.pausedLabel}>You're watching</div>
              <div className={styles.pausedTitle}>
                {video.title} {video.year ? `(${video.year})` : ""}
              </div>
              {getSeriesInfo(video) && (
                <div className={styles.pausedEpisode}>{getSeriesInfo(video)}</div>
              )}
              {video.description && (
                <div className={styles.pausedDescription}>{video.description}</div>
              )}
            </div>
          </div>
        )}



  
        {ripple && (
          <span
            key={ripple.id}
            className={styles.rippleEffect}
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
            }}
          />
        )}


                {/* 🗣 Live Language Overlay */}
        {langOverlay && (
          <div className={styles.langOverlay}>
            <div
              className={`${styles.langOverlayBox} ${
                langOverlay.type === "audio" ? styles.langAudio : styles.langSubtitle
              }`}
            >
              <span className={styles.langIcon}>
                <Icon
                  name={langOverlay.type === "audio" ? "audio-track" : "subtitles"}
                  className={styles.langIconSvg}
                />
              </span>
              <span>{langOverlay.label}</span>                         
            </div>
          </div>
        )}



        {/* Central video area click/tap */}


        {/* Volume overlay - positioned outside video element */}
        {showVolumeOverlay && (
          <div className={styles.volumeOverlay} aria-hidden>
            <div className={styles.volumePercentOverlay}>{volumeOverlayValue}%</div>
            <div className={styles.volumeBar}>
              <div
                className={styles.volumeBarFill}
                style={{ height: `${volumeOverlayValue}%` }}
              />
            </div>
          </div>
        )}

{/* ✅ SMART TRAFFIC COP: Handles Downloads & Errors */}
        {((errorMessage || (streamType === 'mkv' || streamType === 'file'))) && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/90">
            
            {/* CASE A: DOWNLOAD UI (For MKV/File) */}
            {(streamType === 'mkv' || streamType === 'file') ? (
               <div className="text-center p-8 border border-gray-700 rounded-xl bg-gray-900/80 backdrop-blur max-w-md">
                <div className="text-red-500 mb-4 flex justify-center"><Icon name="download" className="w-16 h-16" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Download Only</h3>
                <p className="text-gray-400 mb-6">
                  This Video is availabe in ({streamType.toUpperCase()}) Formaet. Please Download it and Enjoy it offline.
                </p>
                
                <a 
                  href={streamUrl || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/30"
                >
                  <Icon name="download" className="w-5 h-5 mr-2" />
                  Download Video
                </a>

                <button
                  className="block w-full mt-6 text-gray-500 hover:text-white text-sm underline"
                  onClick={() => onClose()}
                >
                  Close Player
                </button>
              </div>
            ) : (
              /* CASE B: GENERIC ERROR UI (For broken HLS) */
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl max-w-md text-center shadow-2xl">
                <Icon name="warning" className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
                <p className="text-gray-400 mb-6">
                   {errorMessage || "The video failed to load. It might be offline or blocked."}
                </p>
                <button
                  className="mt-2 text-gray-500 hover:text-white text-sm underline"
                  onClick={() => onClose()}
                >
                  Close Player
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Loading spinner */}
        {loading && (
          <div 
            className={styles.spinnerOverlay} 
            role="status" 
            aria-live="polite" 
            style={{ pointerEvents: "none" }}
          >
            <Icon name="spinner" className={`${styles.iconBase} ${styles.iconXLarge} ${styles.iconRed} animate-spin`} />
          </div>
        )}

        {/* Resume overlay */}
        {showResumeOverlay && (
          <div className={styles.resumeOverlay}>
            <div className={styles.resumeBox}>
              <div>Playback ended</div>
              <div style={{ marginTop: 8, display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  className={styles.resumePrimary}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.currentTime = 0;
                    v.play().catch(() => {});
                    setShowResumeOverlay(false);
                  }}
                >
                  Restart
                </button>
                <button 
                  className={styles.resumeSecondary} 
                  onClick={() => setShowResumeOverlay(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Up Next overlay */}
        {showUpNextOverlay && episodes.length > 0 && activeEpisodeIndex < episodes.length - 1 && (
          <div className={styles.upNext}>
            <div className={styles.upNextBox}>
              <div>Up Next: {episodes[activeEpisodeIndex + 1]?.title || "Next Episode"}</div>
              <div style={{ marginTop: 6, display: "flex", gap: "6px" }}>
                <button
                  className={styles.playNextBtn}
                  onClick={() => {
                    const nextEp = episodes[activeEpisodeIndex + 1];
                    if (nextEp && nextEp.src) {
                      setActiveEpisodeIndex(activeEpisodeIndex + 1);
                      // Update video source logic would go here
                      setShowUpNextOverlay(false);
                    }
                  }}
                >
                  Play
                </button>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => setShowUpNextOverlay(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          className={`${styles.controlsWrap} ${
            showControls || !isPlaying ? styles.controlsVisible : styles.controlsHidden
          }`}
        >

          {/* Background gradient */}
          <div className={styles.controlsGradient} />

          <div className={styles.controlsInner}>
            {/* Progress/Timeline bar */}
            <div
              ref={progressRef}
              className={styles.timeline}
              onClick={handleSeek}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-label="Seek video position"
            >
              <div 
                className={styles.bufferBar} 
                style={{ width: `${Math.max(0, Math.min(100, bufferPercent))}%` }} 
              />
              <div 
                className={styles.playedBar} 
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} 
              />
              <div 
                className={styles.knob} 
                style={{ left: `${Math.max(0, Math.min(100, progressPercent))}%` }} 
                onMouseDown={beginDrag}
                tabIndex={0}
                role="button"
                aria-label="Drag to seek"
              />

              {/* Hover time tooltip */}
              {hoverTime !== null && hoverX !== null && progressRef.current && (
                <div 
                  className={styles.hoverTooltip} 
                  style={{ 
                    left: Math.max(0, Math.min(
                      progressRef.current.offsetWidth - 60,
                      hoverX - progressRef.current.getBoundingClientRect().left
                    ))
                  }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>
            


            {/* Control buttons row */}
            <div className={styles.controlRow}>
              {/* Left side controls */}
              <div className={styles.groupLeft}>
                {/* Play / Pause button */}
                <button
                  className={styles.iconButton}
                  data-tooltip={isPlaying ? "Pause (Space)" : "Play (Space)"}
                  onClick={(e) => { 
                    stop(e); 
                    togglePlay(e.clientX, e.clientY); 
                  }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  <Icon
                    name={isPlaying ? "pause" : "play"}
                    className={`${styles.iconMLarge}`}
                  />
                </button>
                
                {/* ⏪ Backward 10s */}
                <button
                    className={styles.iconButton}
                    data-tooltip="Rewind 10s (←)"
                    onClick={(e) => {
                        stop(e);
                        const v = videoRef.current;
                        if (v) v.currentTime = Math.max(0, v.currentTime - 10);
                    }}
                >
                    <Icon name="backward-10" className={`${styles.iconSkip}`} />
                </button>
                  
                {/* ⏩ Forward 10s */}
                <button
                    className={styles.iconButton}
                    data-tooltip="Forward 10s (→)"
                    onClick={(e) => {
                        stop(e);
                        const v = videoRef.current;
                        if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10);
                    }}
                >
                    <Icon name="forward-10" className={`${styles.iconSkip} ${styles.iconWhite}`} />
                </button>

                {/* 🔊 Volume controls */}
                <div
                  className={styles.volumeGroup}
                  onMouseEnter={() => setShowVolumePanel(true)}
                  onMouseLeave={() => setShowVolumePanel(false)}
                >
                  <button
                    className={styles.iconButton}
                    data-tooltip={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
                    onClick={(e) => {
                      stop(e);
                      const v = videoRef.current;
                      if (!v) return;
                      const newMuted = !v.muted;
                      v.muted = newMuted;
                      setIsMuted(newMuted);
                      if (newMuted) {
                        showVolOverlay(0);
                      } else {
                        const vol = v.volume || 1;
                        setVolume(vol);
                        showVolOverlay(vol);
                      }
                    }}
                    aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  >
                    <Icon
                      name={isMuted ? "volume-off" : getVolumeIconName()}
                      className={`${styles.iconBase} ${styles.iconMLarge}`}
                    />
                  </button>
                  
                  {showVolumePanel && (
                    <input
                      className={styles.volumeSlider}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={isMuted ? 0 : Math.round(volume * 100)}
                      onChange={(e) => {
                        stop(e);
                        const val = parseFloat(e.currentTarget.value);
                        handleVolumeChange(val / 100);
                      }}
                      style={{
                        '--vol-percent': `${isMuted ? 0 : volume * 100}%`,
                      } as React.CSSProperties}
                      aria-label="Volume"
                    />
                  )}
                </div>
                
                {/* 🕒 Time Display */}
                <span className={styles.timeDisplay}>
                  {formatTime(currentTime)} / {formatTime(duration || 0)}
                </span>
              </div>

              {/* Middle side controls */}
              <div className={styles.groupMiddle}>
                {/* 🎬 Centered Now Playing Title */}
                {video && (
                  <div className={styles.centerNowPlayingTitle}>
                    {video.type === "series" ? (
                      <span className={styles.episodeTag}>S1.E1</span>
                    ) : (
                      <span className={styles.movieTag}>Movie</span>
                    )}

                    <span className={styles.titleText}>
                      {video.title.length > 22
                        ? `${video.title.substring(0, 22)}...`
                        : video.title}
                    </span>
                  </div>
                )}
              </div>
              
                
              {/* Right side controls */}
              <div className={styles.groupRight}>
                {/* Subtitles/CC */}
                <div className={styles.dropdownWrap}>
                  <button
                    className={styles.iconButton}
                    data-tooltip="Subtitles (C)"
                    onClick={(e) => {
                      stop(e);
                      toggleMenu("subs");
                    }}
                    aria-label="Subtitle options"
                  >
                    <Icon name="subtitles" className={`${styles.iconBase} ${styles.iconMLarge}`} />
                  </button>
                  
                  {openMenu === "subs" && (
                    <div ref={subsMenuPanelRef} className={`${styles.menuPanel} ${isMenuFading ? styles.fadeOut : styles.show}`} onClick={stop}>
                      <button 
                        className={`${styles.menuItem} ${activeSubtitle === null ? styles.menuItemActive : ""}`} 
                        onClick={() => handleSubtitleChange(null)}
                      >
                        Off
                      </button>
                      {subtitleTracks?.map((track, i) => (
                        <button 
                          key={`${track.lang}-${i}`}
                          className={`${styles.menuItem} ${activeSubtitle === track.lang ? styles.menuItemActive : ""}`} 
                          onClick={() => handleSubtitleChange(track.lang)}
                        >
                          {track.label ?? track.lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Settings menu */}
                <div className={styles.dropdownWrap}>
                  <button
                    className={styles.iconButton}
                    data-tooltip="Settings"
                    onClick={(e) => {
                      stop(e);
                      setIsSpinning(true);
                      setTimeout(() => setIsSpinning(false), 700);
                      toggleMenu("settings");
                      setSettingsTab("speed");
                    }}
                    aria-label="Settings"
                  >
                    <Icon
                      name="settings"
                      className={`${styles.iconSettings} ${styles.iconMLarge} ${isSpinning ? styles.iconSettingsSpin : ""}`}
                    />
                  </button>
                  
                  {openMenu === "settings" && (
                    <div ref={menuPanelRef} className={`${styles.menuPanel} ${isMenuFading ? styles.fadeOut : styles.show}`} onClick={stop}>
                      <div className={styles.settingsTabs}>
                        <button
                          className={`${styles.settingsTab} ${settingsTab === "speed" ? styles.settingsTabActive : ""}`}
                          onClick={() => setSettingsTab("speed")}
                        >
                          Speed
                        </button>
                        <button
                          className={`${styles.settingsTab} ${settingsTab === "audio" ? styles.settingsTabActive : ""}`}
                          onClick={() => setSettingsTab("audio")}
                        >
                          Audio
                        </button>
                        <button
                          className={`${styles.settingsTab} ${settingsTab === "quality" ? styles.settingsTabActive : ""}`}
                          onClick={() => setSettingsTab("quality")}
                        >
                          Quality
                        </button>
                        <button 
                          className={`${styles.settingsTab} ${settingsTab === "source" ? styles.settingsTabActive : ""}`}
                           onClick={() => setSettingsTab("source")}
                        >
                          Source
                        </button>
                      </div>

                      <div className={styles.settingsContent}>
                        {settingsTab === "speed" && (
                          <>
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                className={`${styles.menuItem} ${Math.abs(playbackRate - rate) < 0.001 ? styles.menuItemActive : ""}`}
                                onClick={() => handlePlaybackRateChange(rate)}
                              >
                                {rate}x
                              </button>
                            ))}
                          </>
                        )}

                        {settingsTab === "audio" && (
                          <>
                            <button
                              className={`${styles.menuItem} ${selectedAudioTrack === "default" ? styles.menuItemActive : ""}`}
                              onClick={() => handleAudioChange("default")}
                            >
                              Default
                            </button>
                        
                            {audioTracks.length > 0 ? (
                              audioTracks.map((track) => (
                                <button
                                  key={track.id}
                                  className={`${styles.menuItem} ${selectedAudioTrack === track.id ? styles.menuItemActive : ""}`}
                                  onClick={() => handleAudioChange(track.id)}
                                >
                                  {track.name}
                                </button>
                              ))
                            ) : (
                              <div className={styles.menuItem} style={{ opacity: 0.7 }}>
                                No alternate audio
                              </div>
                            )}
                          </>
                        )}

                        {settingsTab === "quality" && (
                          <>
                            <button
                              className={`${styles.menuItem} ${selectedQualityIndex === -1 ? styles.menuItemActive : ""}`}
                              onClick={() => handleQualitySwitch(-1)}
                            >
                              Auto
                            </button>

                            {qualityList.length > 0 ? (
                              qualityList.map((quality, idx) => (
                                <button
                                  key={`${quality.label}-${idx}`}
                                  className={`${styles.menuItem} ${selectedQualityIndex === idx ? styles.menuItemActive : ""}`}
                                  onClick={() => handleQualitySwitch(idx)}
                                >
                                  {quality.label}
                                </button>
                              ))
                            ) : (
                              <div className={styles.menuItem} style={{ opacity: 0.7 }}>
                                No quality options
                              </div>
                            )}
                          </>
                        )}
{settingsTab === "source" && (
                          <>
                            <button 
                              className={`${styles.menuItem} ${currentSource === "default" ? styles.menuItemActive : ""}`} 
                              onClick={() => { setCurrentSource("default"); closeMenu(); }}
                            >
                              Default Server
                            </button>
                            <button 
                              className={`${styles.menuItem} ${currentSource === "hdo" ? styles.menuItemActive : ""}`} 
                              onClick={() => { setCurrentSource("hdo"); closeMenu(); }}
                            >
                              ⚡ HDO Server
                            </button>
                            <button 
                              className={`${styles.menuItem} ${currentSource === "streamflix" ? styles.menuItemActive : ""}`} 
                              onClick={() => { setCurrentSource("streamflix"); closeMenu(); }}
                            >
                              🚀 StreamFlix (Multi-Audio)
                            </button>
                            {/* ✅ NEW HDHUB BUTTON */}
                            <button 
                              className={`${styles.menuItem} ${currentSource === "hdhub4u" ? styles.menuItemActive : ""}`} 
                              onClick={() => { setCurrentSource("hdhub4u"); closeMenu(); }}
                            >
                              💎 HDHub4u (Dual Audio)
                            </button>
                          </>
                        )} 
                        </div>
                    </div>
                  )}
                </div>
                
                {/* Fullscreen button */}
                <button
                  className={styles.iconButton}
                  data-tooltip={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                  onClick={(e) => {
                    stop(e);
                    try {
                      const el = containerRef.current;
                      if (!el) return;
                      if (!document.fullscreenElement) {
                        el.requestFullscreen().catch(() => {});
                        logAnalytics("fullscreen_enter", {});
                      } else {
                        document.exitFullscreen().catch(() => {});
                        logAnalytics("fullscreen_exit", {});
                      }
                    } catch (err) {
                      console.warn("Fullscreen failed:", err);
                    }
                  }}
                  aria-label="Toggle fullscreen"
                >
                  <Icon 
                    name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                    className={`${styles.iconBase} ${styles.iconMLarge }`} 
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail preview on hover */}
        {thumbPreview && (
          <div 
            style={{ 
              position: "fixed", 
              left: Math.max(10, Math.min(window.innerWidth - 170, thumbPreview.x + 12)), 
              bottom: "22%", 
              zIndex: 120,
              pointerEvents: "none"
            }}
          >
            <div style={{ 
              background: "rgba(0,0,0,0.85)", 
              padding: 6, 
              borderRadius: 6 
            }}>
              <img 
                src={thumbPreview.url} 
                alt="Video preview" 
                style={{ 
                  width: 160, 
                  height: "auto", 
                  display: "block",
                  borderRadius: 4
                }} 
                onError={(e) => {
                  // Hide preview if image fails to load
                  setThumbPreview(null);
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}