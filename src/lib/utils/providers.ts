// src/lib/utils/providers.ts

interface Provider {
  name: string;
  url: string;
}

interface ProvidersData {
  [key: string]: Provider;
}

let cachedProviders: ProvidersData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cookie caching
let cachedCookies: string | null = null;
let lastCookieFetchTime = 0;
const COOKIE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function fetchProviders(): Promise<ProvidersData> {
  const now = Date.now();
  if (cachedProviders && (now - lastFetchTime) < CACHE_DURATION) return cachedProviders;

  try {
    const response = await fetch('https://anshu78780.github.io/json/providers.json', {
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    cachedProviders = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.error('Error fetching providers:', error);
    if (cachedProviders) return cachedProviders;
    throw error;
  }
}

export async function getNetMirrorUrl(): Promise<string> {
  try {
    const providers = await fetchProviders();
    const provider = providers['nfMirror'];
    if (!provider) throw new Error('NetMirror provider not found');
    return provider.url.endsWith('/') ? provider.url.slice(0, -1) : provider.url;
  } catch (error) {
    console.error(error);
    return "https://net20.cc"; // Fallback
  }
}

// ✅ ADDED THIS FUNCTION
export async function getHDHub4uUrl(): Promise<string> {
  try {
    const providers = await fetchProviders();
    // 'hdhub' is the key in your JSON file for HDHub4u
    const provider = providers['hdhub']; 
    if (!provider) throw new Error('HDHub4u provider not found');
    return provider.url.endsWith('/') ? provider.url.slice(0, -1) : provider.url;
  } catch (error) {
    console.error(error);
    return "https://hdhub4u.mx"; // Fallback URL if JSON fails
  }
}

export async function fetchNetMirrorCookies(): Promise<string> {
  const now = Date.now();
  if (cachedCookies && (now - lastCookieFetchTime) < COOKIE_CACHE_DURATION) return cachedCookies;

  try {
    const response = await fetch('https://anshu78780.github.io/json/cookies.json', { next: { revalidate: 600 } });
    const data = await response.json();
    if (!data.cookies) throw new Error('No cookies');
    cachedCookies = data.cookies;
    lastCookieFetchTime = now;
    return data.cookies;
  } catch (error) {
    console.error('Error fetching cookies:', error);
    if (cachedCookies) return cachedCookies;
    return 'user_token=0b9f0991e238ee73b1ce39dbf5639c27;'; 
  }
}