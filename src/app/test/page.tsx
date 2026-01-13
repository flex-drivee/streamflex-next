"use client";

import React, { useState, useRef, useEffect } from "react";
import Hls from "hls.js";

// --- ICONS ---
const Icon = ({ name, className }: { name: string; className?: string }) => {
  if (name === "download") return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
  return null;
};

export default function TestLab() {
  // --- STATE ---
  const [source, setSource] = useState<"streamflix" | "hdo" | "netmirror" | "hdhub4u" | "vidsrc">("hdhub4u");
  const [mediaType, setMediaType] = useState<"movie" | "tv">("tv");
  const [title, setTitle] = useState("Wednesday");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tmdbId, setTmdbId] = useState("119051"); // Default: Wednesday

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResultId, setSelectedResultId] = useState(""); 

  const [logs, setLogs] = useState<string[]>([]);
  const [jsonResult, setJsonResult] = useState<any>(null);
  
  // PLAYBACK STATE
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<"hls" | "mkv" | "file" | "mp4">("hls");
  const [qualities, setQualities] = useState<Record<string, {url: string, type: string}>>({});
  
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false); // Can be toggled manually or auto-set
  const [proxyCookie, setProxyCookie] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // --- MAIN HANDLER ---
  const handleFetch = async (forceScrapeId?: string) => {
    const targetId = forceScrapeId || selectedResultId;
    
    // Clear logs if fresh search (only for search-based providers)
    if (!targetId && (source === "hdhub4u" || source === "netmirror")) {
        setLogs([]);
        setSearchResults([]); 
    }
    
    // Reset Player
    setError(null);
    setJsonResult(null);
    setStreamUrl(null);
    setStreamType("hls");
    setQualities({});
    setUseProxy(false); // Reset Proxy
    
    // Cleanup HLS
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    addLog(`🚀 Starting Request to ${source.toUpperCase()}...`);

    try {
      // ----------------------------------------------------
      // NETMIRROR LOGIC (✅ PROXY ENABLED)
      // ----------------------------------------------------
      if (source === "netmirror") {
        if (!targetId) {
            // STEP 1: SEARCH
            if (!title) throw new Error("Title is required");
            
            const searchUrl = `/api/netmirror/search?p=${encodeURIComponent(title)}`;
            addLog(`🔍 Searching: ${searchUrl}`);
            const res = await fetch(searchUrl);
            const data = await res.json();
            setJsonResult(data);
            
            const rawResults = Array.isArray(data) ? data : (data.searchResult || data.results || []);
            
            if (rawResults.length > 0) {
                const normalized = rawResults.map((item: any) => ({
                    id: item.id || item.link, 
                    title: item.t || item.label || item.title || "Unknown Result",
                    subtitle: item.year || "NetMirror"
                }));
                setSearchResults(normalized);
                addLog(`✅ Found ${normalized.length} results.`);
                
                if (normalized.length === 1) {
                    addLog(`🤖 Auto-Selecting: ${normalized[0].title}`);
                    setSelectedResultId(normalized[0].id);
                    handleFetch(normalized[0].id);
                }
                return;
            } else throw new Error("No results found.");
        } 
        else {
            // STEP 2: STREAM
            addLog(`▶️ Fetching Stream ID: ${targetId}`);
            const streamUrlApi = `/api/netmirror/stream?id=${encodeURIComponent(targetId)}`;
            
            const res = await fetch(streamUrlApi);
            const data = await res.json();
            setJsonResult(data);

            if (data.error) throw new Error(data.error);

            // ✅ 3. CAPTURE COOKIES
            const sessionCookies = data.cookies || ""; 
            if (sessionCookies) addLog(`🍪 Captured Session Cookies`);

            const streamData = data.streamData;
            let playlist = [];

            if (Array.isArray(streamData)) {
                playlist = streamData;
            } else if (streamData && typeof streamData === 'object') {
                playlist = [streamData];
            }

            if (playlist.length === 0) throw new Error("No playlist data found.");

            let selectedItem = playlist[0];
            if (mediaType === 'tv' && episode > 0) {
                const epIndex = episode - 1;
                if (playlist[epIndex]) {
                    selectedItem = playlist[epIndex];
                    addLog(`🔢 Selected Episode ${episode} (Item #${epIndex + 1})`);
                } else {
                    addLog(`⚠️ Episode ${episode} not found in playlist. Playing first item.`);
                }
            }

            const sources = selectedItem.sources || [];
            if (sources.length > 0) {
                let bestSource = sources.find((s: any) => s.default === "true") || sources[0];
                const file = bestSource.file;
                const type = (bestSource.type === "application/vnd.apple.mpegurl" || file.includes(".m3u8")) ? "hls" : "mp4";
                
                addLog(`🎯 Found Stream: ${file}`);
                setStreamUrl(file);
                setStreamType(type);
                
                // ✅ 4. SET COOKIE STATE & FORCE PROXY
                setUseProxy(true);
                setProxyCookie(sessionCookies); 
                addLog(`🛡️ Proxy Enabled with Cookies`);

                const qMap: Record<string, any> = {};
                sources.forEach((s: any) => {
                    qMap[s.label || 'Unknown'] = { url: s.file, type: type };
                });
                setQualities(qMap);

            } else {
                throw new Error("No stream sources found.");
            }
            return;
        }
      }

      // ----------------------------------------------------
      // HDHUB4U LOGIC
      // ----------------------------------------------------
      if (source === "hdhub4u") {
        if (!targetId) {
            const searchUrl = `/api/search?q=${encodeURIComponent(title)}`;
            addLog(`🔍 Searching: ${searchUrl}`);
            const res = await fetch(searchUrl);
            const data = await res.json();
            setJsonResult(data);
            
            const rawResults = data.results || []; 
            if (Array.isArray(rawResults) && rawResults.length > 0) {
                const normalized = rawResults.map((item: any) => ({
                    id: item.link, 
                    title: item.title,
                    subtitle: item.date || "HDHub Post"
                }));
                setSearchResults(normalized);
                addLog(`✅ Found ${normalized.length} results.`);

                if (mediaType === "tv") {
                    const seasonRegex = new RegExp(`(?:season|s)\\s*0?${season}(?!\\d)`, 'i');
                    const match = normalized.find(r => seasonRegex.test(r.title));
                    if (match) {
                        addLog(`🤖 Auto-Selecting: "${match.title}"`);
                        setSelectedResultId(match.id);
                        handleFetch(match.id); 
                        return;
                    }
                } else {
                    if (normalized.length === 1) {
                         addLog(`🤖 Auto-Selecting Single Result: "${normalized[0].title}"`);
                         setSelectedResultId(normalized[0].id);
                         handleFetch(normalized[0].id);
                         return;
                    }
                }
                return;
            } else throw new Error("No results found.");
        }
        else {
            addLog(`▶️ Scraping Link (Ep ${episode}): ${targetId}`);
            const scrapeUrl = `/api/hdhub4u/scrape?link=${encodeURIComponent(targetId)}&episode=${episode}&_t=${Date.now()}`;
            const res = await fetch(scrapeUrl, { headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
            const data = await res.json();
            setJsonResult(data);

            if (data.error) throw new Error(data.error);

            if (data.streamUrl) {
                const finalUrl = data.streamUrl;
                const type = data.streamType || 'hls';
                addLog(`🎯 Found Stream: ${finalUrl} [Type: ${type}]`);
                
                setStreamType(type);
                setStreamUrl(finalUrl);
                setQualities(data.qualities || {});

                if (finalUrl.includes("hdstream4u")) setUseProxy(false); 

                if (type !== 'hls' && type !== 'mp4') {
                    addLog(`⚠️ Format is ${type}. Showing Download UI.`);
                }
            } else throw new Error("No playable links extracted.");
            return;
        }
      }
      
// ----------------------------------------------------
      // OTHER SOURCES (StreamFlix / HDO / VidSrc)
      // ----------------------------------------------------
       if (source === "streamflix" || source === "hdo" || source === "vidsrc") {
          let url = "";
          
          if (source === "streamflix") {
             url = `/api/streamflix?title=${encodeURIComponent(title)}&season=${season}&episode=${episode}`;
          } 
          else if (source === "hdo" || source === "vidsrc") { 
             // 🛑 DYNAMIC ENDPOINT: Calls /api/vidsrc OR /api/hdo based on selection
             url = `/api/${source}?tmdb=${tmdbId}&type=${mediaType}`;
             
             if (mediaType === 'tv') {
                 url += `&season=${season}&episode=${episode}`;
             }
          }

          addLog(`🚀 Requesting: ${url}`);
          const res = await fetch(url);
          const data = await res.json();
          setJsonResult(data);

          if (data.error) throw new Error(data.error);

          let videoLink = null;
          
          if (source === "streamflix") {
              videoLink = data.streams?.[0]?.link;
          } else {
              // BOTH HDO and VidSrc return 'streamData' format
              const streams = data.streamData?.[0]?.sources;
              if (streams && streams.length > 0) {
                  videoLink = streams[0].file;
                  
                  // Map qualities
                  const qMap: Record<string, any> = {};
                  streams.forEach((s: any) => {
                      qMap[s.label || 'Auto'] = { url: s.file, type: 'hls' };
                  });
                  setQualities(qMap);
              }
          }

          if (videoLink) { 
              addLog(`🎯 Found Stream: ${videoLink}`);
              setStreamType("hls");
              setStreamUrl(videoLink); 
              setUseProxy(false); 
          } else {
              throw new Error("No stream found in response");
          }
       }

       
    } catch (e: any) {
      setError(e.message);
      addLog(`❌ ERROR: ${e.message}`);
    }
  };

  // ✅ ROBUST PLAYBACK EFFECT (Handles Proxy Logic)
  useEffect(() => {
      const v = videoRef.current;
      if (!v || !streamUrl) return;

      if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
      }

      if (streamType === "mkv" || streamType === "file") return;

      addLog(`▶️ Attempting Playback: ${streamUrl}`);

      let finalUrl = streamUrl;
      
      // 🛡️ APPLY PROXY IF ENABLED
      if (useProxy) {
           let referer = "https://net20.cc/"; 
           if (streamUrl.includes("hubcdn")) referer = "https://hubcdn.fans/";
           if (streamUrl.includes("hdstream4u")) referer = "https://hdstream4u.com/";
           
           // ✅ APPEND COOKIE
           finalUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}`;
           if (proxyCookie) {
               finalUrl += `&cookie=${encodeURIComponent(proxyCookie)}`;
           }
      }

      if (Hls.isSupported() && (streamUrl.includes(".m3u8") || streamType === "hls")) {
          const hls = new Hls({ debug: false, enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(finalUrl);
          hls.attachMedia(v);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
              addLog("✅ HLS Manifest Parsed. Playing...");
              v.play().catch(e => addLog(`⚠️ Autoplay Blocked: ${e.message}`));
          });
          
          hls.on(Hls.Events.ERROR, (e, data) => {
              if (data.fatal) addLog(`❌ HLS Fatal: ${data.type}`);
          });
      } else {
          v.src = finalUrl;
          v.play().catch(e => addLog(`⚠️ Autoplay Blocked: ${e.message}`));
      }
  }, [streamUrl, streamType, useProxy]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
        <h1 className="text-3xl font-bold mb-6 text-red-600 tracking-wider">🧪 NETFLIX LAB V3</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CONTROLS */}
        <div className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div>
            <label className="block text-gray-400 mb-2 text-xs uppercase font-bold">Provider</label>
            <select className="w-full bg-black border border-zinc-700 p-3 rounded text-white focus:border-red-600 outline-none" value={source} onChange={(e) => setSource(e.target.value as any)}>
                <option value="vidsrc">VidSrc (Best for TMDB)</option>
                <option value="hdhub4u">HDHub4u (Auto-Select)</option>
                <option value="netmirror">NetMirror (New)</option>
                <option value="streamflix">StreamFlix</option>
                <option value="hdo">HDO (Requires TMDB ID)</option>
            </select>
          </div>
          
          <div className="flex bg-zinc-800 rounded p-1">
              <button onClick={() => setMediaType("movie")} className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${mediaType === "movie" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>MOVIE</button>
              <button onClick={() => setMediaType("tv")} className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${mediaType === "tv" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>TV SHOW</button>
          </div>
          
          <div className="space-y-4">
             {/* CONDITIONAL INPUTS */}
             {source === 'hdo' ? (
                 <div>
                    <label className="block text-gray-400 mb-2 text-xs uppercase font-bold">TMDB ID</label>
                    <input 
                        className="w-full bg-black border border-zinc-700 p-2 rounded focus:border-red-600 outline-none font-mono text-yellow-400" 
                        value={tmdbId} 
                        onChange={(e) => setTmdbId(e.target.value)} 
                        placeholder="e.g. 119051"
                    />
                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                        <span>Wednesday: 119051</span>
                        <span>Inception: 27205</span>
                    </div>
                 </div>
             ) : (
                 <div>
                    <label className="block text-gray-400 mb-2 text-xs uppercase font-bold">Title</label>
                    <input className="w-full bg-black border border-zinc-700 p-2 rounded focus:border-red-600 outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
                 </div>
             )}

             {mediaType === "tv" && (
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-gray-400 mb-2 text-xs uppercase font-bold">Season</label><input type="number" className="w-full bg-black border border-zinc-700 p-2 rounded text-center focus:border-red-600 outline-none" value={season} onChange={(e) => setSeason(parseInt(e.target.value))} /></div>
                    <div><label className="block text-gray-400 mb-2 text-xs uppercase font-bold">Episode</label><input type="number" className="w-full bg-black border border-zinc-700 p-2 rounded text-center focus:border-red-600 outline-none" value={episode} onChange={(e) => setEpisode(parseInt(e.target.value))} /></div>
                 </div>
             )}
          </div>
          
          <button onClick={() => { setSelectedResultId(""); handleFetch(); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded transition shadow-lg shadow-red-900/20">
            {source === 'hdo' ? "FETCH STREAM" : (searchResults.length === 0 ? "SEARCH & AUTO-PLAY" : "REFRESH SEARCH")}
          </button>
          
          <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} id="useProxy" />
              <label htmlFor="useProxy" className="text-gray-400 text-xs font-bold">FORCE PROXY (Toggle if blocked)</label>
          </div>

          {/* SEARCH RESULTS */}
          {searchResults.length > 0 && (
              <div className="bg-zinc-800 p-2 rounded max-h-40 overflow-y-auto mt-4 border border-zinc-700 scrollbar-thin scrollbar-thumb-zinc-600">
                  {searchResults.map((item: any, idx: number) => (
                      <button key={idx} className={`w-full text-left text-xs p-3 rounded mb-1 flex justify-between ${selectedResultId === item.id ? "bg-red-900/20 border border-red-500" : "bg-zinc-700 hover:bg-zinc-600"}`} onClick={() => { setSelectedResultId(item.id); handleFetch(item.id); }}>
                          <span className="truncate">{item.title}</span>
                      </button>
                  ))}
              </div>
          )}
          
          <div className="bg-black p-4 rounded h-48 overflow-y-auto border border-zinc-800 text-[10px] font-mono">
            {logs.map((log, i) => <div key={i} className="mb-1 border-b border-zinc-900 pb-1 text-green-400/80">{log}</div>)}
          </div>
        </div>

        {/* PLAYER */}
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span> Preview Player</h2>
            <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 relative flex items-center justify-center shadow-2xl">
                
                {/* QUALITY SWITCHER */}
                {Object.keys(qualities).length > 1 && (
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        {Object.entries(qualities).map(([qName, qData]) => (
                            <button 
                                key={qName}
                                onClick={() => {
                                    setStreamUrl(qData.url);
                                    setStreamType(qData.type as any);
                                    addLog(`🔄 Switched to ${qName}`);
                                }}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all border border-red-900/50 backdrop-blur-sm ${streamUrl === qData.url ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black/60 text-gray-300 hover:bg-red-900/40'}`}
                            >
                                {qName.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {/* HLS/MP4 PLAYER */}
                {(streamType === 'hls' || streamType === 'mp4') && streamUrl ? (
                    <video ref={videoRef} className="w-full h-full" controls playsInline autoPlay />
                ) : null}
                
                {/* DOWNLOAD UI */}
                {(streamType === 'mkv' || streamType === 'file') && streamUrl ? (
                    <div className="text-center p-6 bg-zinc-800/90 rounded-lg backdrop-blur border border-zinc-600">
                        <div className="text-red-500 mb-4 flex justify-center"><Icon name="download" className="w-16 h-16" /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Download Only</h3>
                        <p className="text-gray-400 text-xs mb-4">Format: {streamType.toUpperCase()}</p>
                        <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold transition shadow-lg shadow-red-900/40">
                            <Icon name="download" className="w-4 h-4" /> Download File
                        </a>
                    </div>
                ) : null}
                
                {!streamUrl && !error && <div className="text-zinc-600 font-bold text-sm">Ready to Fetch</div>}
                {error && <div className="text-red-500 font-bold text-sm px-8 text-center">{error}</div>}
            </div>
        </div>

        {/* JSON RESPONSE */}
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">API Response</h2>
            <div className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800 overflow-auto font-mono text-xs text-green-400 shadow-inner">
                <pre>{jsonResult ? JSON.stringify(jsonResult, null, 2) : "// Waiting..."}</pre>
            </div>
        </div>
      </div>
    </div>
  );
}