import React from "react";

const strokeWidth = 1.5;
const strokeLinecap = "round";
const strokeLinejoin = "round";

const icons: Record<string, React.ReactNode> = {
  /* MEDIA */
  play: (
    <svg data-filled="true"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3v18l15-9z" />
    </svg>
  ),
  pause: (
    <svg data-filled="true"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),

  /* --- STAR ICONS --- */
  "star-fill": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ),
  "star-outline": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),

  /* --- Modern VOLUME ICONS (Lucide-style SVGs) --- */
  "volume-off": (
        <svg data-filled="true"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
            <path fill="currentColor" stroke="none" d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="15" y1="3" x2="3" y2="21" fill="none" /> 
        </svg>
    ),
    "volume-low": (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
            <path fill="currentColor" stroke="none" d="M11 5L6 9H2v6h4l5 4V5z" />
            <path fill="none" stroke="currentColor" d="M13 8a3 5 0 010 9" /> 
        </svg>
    ),
    "volume-medium": (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
            <path fill="currentColor" stroke="none" d="M11 5L6 9H2v6h4l5 4V5z" />
            <path fill="none" stroke="currentColor" d="M13 8a3 5 0 010 9" />
            <path fill="none" stroke="currentColor" d="M16.8 6.35a5 8 0 010 12.5" />
        </svg>
    ),
    "volume-high": (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
            <path  fill="currentColor" stroke="none" d="M11 5L6 9H2v6h4l5 4V5z" />
            <path fill="none" stroke="currentColor" d="M13 8a3 5 0 010 9" />
            <path fill="none" stroke="currentColor" d="M16.8 6.35a5 8 0 010 12.5" />
            <path fill="none" stroke="currentColor" d="M20 4a12 12 0 010 16" />
        </svg>
    ),

  /* --- 10 SECOND SKIP ICONS --- */
  "backward-10": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,41.41V23a.09.09,0,0,0-.16-.07s-2.58,3.69-4.17,4.78" />
        <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
        <polyline points="9.57 15.41 12.17 24.05 20.81 21.44" />
        <path d="M12.14,23.94a21.91,21.91,0,1,1,-0.91,13.25" />
    </svg>
  ),
  "forward-10": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23.93,41.41V23a.09.09,0,0,0-.16-.07s-2.58,3.69-4.17,4.78" />
        <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
        <polyline points="54.43 15.41 51.83 24.05 43.19 21.44" />
        <path d="M51.86,23.94a21.91,21.91,0,1,0,.91,13.25" />
    </svg>
  ),

  /* VIDEO PLAYER EXTRAS */
  subtitles: (
    <svg data-filled="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 4H3c-1.1 0-2 .9-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6c0-1.1-.9-2-2-2zm0 14H3V6h18v12zM6 10h5v2H6v-2zm0 3h8v2H6v-2zm10 0h2v2h-2v-2z" />
    </svg>
  ),
  "audio-track": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
    </svg>
  ),

  /* FULLSCREEN */
  "fullscreen": (
      <svg data-filled="true"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
      </svg>
  ),
  "fullscreen-exit": (
    <svg data-filled="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 9H3V7h4V3h2v6H7zm0 6v6H7v-4H3v-2h6zm6-6V3h2v4h4v2h-6zm6 6v2h-4v4h-2v-6h6z" />
    </svg>
  ),

  /* UI ACTIONS */
  plus: (
    <svg data-filled="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
    </svg>
  ),
  check: (
    <svg data-filled="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.2l-3.9-3.9L4 13.4l5 5 12-12-1.4-1.4z" />
    </svg>
  ),
  like: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.3l1-5-1.7-1.5L7.6 9c-.4.4-.6 1-.6 1.6V20c0 1.1.9 2 2 2h9c.9 0 1.6-.6 1.9-1.4l3-7.1c.1-.3.1-.5.1-.8v-3z" />
    </svg>
  ),
  heart: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.3l-1.5-1.3C5.3 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.5.8 4.5 2.1C13 3.8 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.3z" />
    </svg>
  ),
  info: (
    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.35288 8.95043C4.00437 6.17301 6.17301 4.00437 8.95043 3.35288C10.9563 2.88237 13.0437 2.88237 15.0496 3.35288C17.827 4.00437 19.9956 6.17301 20.6471 8.95043C21.1176 10.9563 21.1176 13.0437 20.6471 15.0496C19.9956 17.827 17.827 19.9956 15.0496 20.6471C13.0437 21.1176 10.9563 21.1176 8.95044 20.6471C6.17301 19.9956 4.00437 17.827 3.35288 15.0496C2.88237 13.0437 2.88237 10.9563 3.35288 8.95043Z" stroke="white" strokeWidth="2"/>
      <path d="M12 15.5V11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="0.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm12-15h-3.5L14 3h-4l-.5 1H6v2h12V4z" />
    </svg>
  ),
  download: (
    <svg xmlns="http://www.w3.org/2000/svg"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),

  /* USER / NAV */
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
    </svg>
  ),
  globe: (
    <svg width="24px" height="24px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="languageIconTitle" stroke="white" strokeWidth="1" strokeLinecap="square"  fill="none" >
      <title id="languageIconTitle">Language</title> <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" d="M12,22 C14.6666667,19.5757576 16,16.2424242 16,12 C16,7.75757576 14.6666667,4.42424242 12,2 C9.33333333,4.42424242 8,7.75757576 8,12 C8,16.2424242 9.33333333,19.5757576 12,22 Z"/> 
      <path strokeLinecap="round" d="M2.5 9L21.5 9M2.5 15L21.5 15"/>
    </svg>
  ),
  menu: (
    <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.29701 5.2338C3.52243 4.27279 4.27279 3.52243 5.2338 3.29701V3.29701C6.06663 3.10165 6.93337 3.10165 7.7662 3.29701V3.29701C8.72721 3.52243 9.47757 4.27279 9.70299 5.2338V5.2338C9.89835 6.06663 9.89835 6.93337 9.70299 7.7662V7.7662C9.47757 8.72721 8.72721 9.47757 7.7662 9.70299V9.70299C6.93337 9.89835 6.06663 9.89835 5.2338 9.70299V9.70299C4.27279 9.47757 3.52243 8.72721 3.29701 7.7662V7.7662C3.10166 6.93337 3.10166 6.06663 3.29701 5.2338V5.2338Z" stroke="#363853" strokeWidth="1.5"/>
      <path d="M3.29701 16.2338C3.52243 15.2728 4.27279 14.5224 5.2338 14.297V14.297C6.06663 14.1017 6.93337 14.1017 7.7662 14.297V14.297C8.72721 14.5224 9.47757 15.2728 9.70299 16.2338V16.2338C9.89835 17.0666 9.89835 17.9334 9.70299 18.7662V18.7662C9.47757 19.7272 8.72721 20.4776 7.7662 20.703V20.703C6.93337 20.8983 6.06663 20.8983 5.2338 20.703V20.703C4.27279 20.4776 3.52243 19.7272 3.29701 18.7662V18.7662C3.10166 17.9334 3.10166 17.0666 3.29701 16.2338V16.2338Z" stroke="#363853" strokeWidth="1.5"/>
      <path d="M14.297 5.2338C14.5224 4.27279 15.2728 3.52243 16.2338 3.29701V3.29701C17.0666 3.10165 17.9334 3.10165 18.7662 3.29701V3.29701C19.7272 3.52243 20.4776 4.27279 20.703 5.2338V5.2338C20.8983 6.06663 20.8983 6.93337 20.703 7.7662V7.7662C20.4776 8.72721 19.7272 9.47757 18.7662 9.70299V9.70299C17.9334 9.89835 17.0666 9.89835 16.2338 9.70299V9.70299C15.2728 9.47757 14.5224 8.72721 14.297 7.7662V7.7662C14.1017 6.93337 14.1017 6.06663 14.297 5.2338V5.2338Z" stroke="#363853" strokeWidth="1.5"/>
      <path d="M14.297 16.2338C14.5224 15.2728 15.2728 14.5224 16.2338 14.297V14.297C17.0666 14.1017 17.9334 14.1017 18.7662 14.297V14.297C19.7272 14.5224 20.4776 15.2728 20.703 16.2338V16.2338C20.8983 17.0666 20.8983 17.9334 20.703 18.7662V18.7662C20.4776 19.7272 19.7272 20.4776 18.7662 20.703V20.703C17.9334 20.8983 17.0666 20.8983 16.2338 20.703V20.703C15.2728 20.4776 14.5224 19.7272 14.297 18.7662V18.7662C14.1017 17.9334 14.1017 17.0666 14.297 16.2338V16.2338Z" stroke="#363853" strokeWidth="1.5"/>
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-8v2h8v14h-8v2h8a2 2 0 002-2V5a2 2 0 00-2-2z" />
    </svg>
  ),

  /* SEARCH */
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" />
    </svg>
  ),
  "search-symbol": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" />
    </svg>
  ),

  /* SETTINGS */
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.27 1 1.51h.09a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),

  /* CHEVRON / CLOSE / SPINNER */
  "chevron-down": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 9l5 5 5-5H7z" />
    </svg>
  ),
  // ✅ ADDED LEFT CHEVRON
  "chevron-left": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  // ✅ ADDED RIGHT CHEVRON
  "chevron-right": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L12 13.4 5.7 19.7 4.3 18.3 10.6 12 4.3 5.7 5.7 4.3 12 10.6 18.3 4.3z" />
    </svg>
  ),
  spinner: (
   <svg
      className="animate-spin"
      fill="currentColor"
      width="800px"
      height="800px"
      viewBox="0 0 256 256"
      id="Flat"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M132,32V64a4,4,0,0,1-8,0V32a4,4,0,0,1,8,0Zm92,92H192a4,4,0,0,0,0,8h32a4,4,0,0,0,0-8Zm-47.917,46.42676a3.99957,3.99957,0,0,0-5.65625,5.65625L193.05371,198.71a3.99957,3.99957,0,0,0,5.65625-5.65625ZM128,188a4.0002,4.0002,0,0,0-4,4v32a4,4,0,0,0,8,0V192A4.0002,4.0002,0,0,0,128,188ZM79.917,170.42676,57.29,193.05371A3.99957,3.99957,0,1,0,62.94629,198.71l22.627-22.62695a3.99957,3.99957,0,0,0-5.65625-5.65625ZM68,128a4.0002,4.0002,0,0,0-4-4H32a4,4,0,0,0,0,8H64A4.0002,4.0002,0,0,0,68,128ZM62.94629,57.29A3.99957,3.99957,0,0,0,57.29,62.94629l22.627,22.627A3.99957,3.99957,0,0,0,85.57324,79.917Z"/>
    </svg>
  ),
  // Add placeholder for missing icons to avoid crashes
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
       <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  )
};

// 🔹 Automatically infer all icon names
type IconName = keyof typeof icons;

interface IconProps {
  name: IconName; 
  className?: string;
  color?: string;
}

export function Icon({ name, className = "w-6 h-6", color }: IconProps) {
  return (
    <span
      className={className}
      style={{
        color: color || undefined,
        display: "inline-flex",
        lineHeight: 0,
      }}
      aria-hidden="true"
    >
      {icons[name] ?? "❔"}
    </span>
  );
}