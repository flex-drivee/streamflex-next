import { Video } from "@/types/index";
import type { Episode } from "@/lib/tmdb"; // Import Episode type to match

const ANILIST_API = "https://graphql.anilist.co";

// GraphQL Query for Lists
const ANIME_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $status: MediaStatus, $format: MediaFormat) {
    Page (page: $page, perPage: $perPage) {
      media (type: ANIME, sort: $sort, search: $search, isAdult: false, status: $status, format: $format) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          extraLarge
          large
        }
        bannerImage
        averageScore
        genres
        seasonYear
        format
        status
        episodes
      }
    }
  }
`;

// 🆕 DETAILS QUERY (Fetch single anime by ID)
const DETAILS_QUERY = `
  query ($id: Int) {
    Media (id: $id, type: ANIME) {
      id
      idMal
      title { romaji english native }
      description
      coverImage { extraLarge large }
      bannerImage
      averageScore
      genres
      episodes
      seasonYear
      format
      status
      recommendations (perPage: 10, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            bannerImage
            averageScore
            seasonYear
            format
          }
        }
      }
    }
  }
`;

// ✅ Mapper
function mapAnilistToVideo(item: any): Video {
  return {
    id: item.id.toString(),
    tmdbId: undefined, 
    imdb_id: undefined,
    
    title: item.title.english || item.title.romaji || item.title.native || "Unknown Anime",
    description: item.description?.replace(/<[^>]*>?/gm, "") || "", 
    
    poster: item.coverImage.extraLarge || item.coverImage.large,
    backdrop: item.bannerImage || item.coverImage.extraLarge, 
    thumbnailUrl: item.coverImage.extraLarge,
    
    rating: item.averageScore ? item.averageScore / 10 : 0, 
    match: item.averageScore || 0,
    releaseYear: item.seasonYear?.toString() || "2023",
    genres: item.genres || [],
    maturityRating: "13+", 
    
    mediaType: "tv",
    vidlinkType: "anime",
    vidlinkMALId: item.idMal, 
    anilistId: item.id,
    
    // 🆕 Add season info for the modal
    totalSeasons: 1,
    seasons: item.episodes ? [{ season_number: 1, episode_count: item.episodes, name: "Season 1" }] : [],
    related: item.recommendations?.nodes?.map((rec: any) => mapAnilistToVideo(rec.mediaRecommendation)) || []
  };
}

// ✅ Generic Fetcher
async function fetchAnilist(query: string, variables: any) {
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 }, 
    });

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Anilist Fetch Error:", error);
    return null;
  }
}

// ✅ Public Functions
export const fetchTrendingAnime = async () => {
  const data = await fetchAnilist(ANIME_QUERY, { page: 1, perPage: 20, sort: ["TRENDING_DESC"] });
  return data?.Page?.media.map(mapAnilistToVideo) || [];
};

export const fetchPopularAnime = async () => {
  const data = await fetchAnilist(ANIME_QUERY, { page: 1, perPage: 20, sort: ["POPULARITY_DESC"] });
  return data?.Page?.media.map(mapAnilistToVideo) || [];
};

export const fetchTopRatedAnime = async () => {
  const data = await fetchAnilist(ANIME_QUERY, { page: 1, perPage: 20, sort: ["SCORE_DESC"] });
  return data?.Page?.media.map(mapAnilistToVideo) || [];
};

export const fetchAnimeMovies = async () => {
  const data = await fetchAnilist(ANIME_QUERY, { page: 1, perPage: 20, sort: ["POPULARITY_DESC"], format: "MOVIE" });
  return data?.Page?.media.map(mapAnilistToVideo) || [];
};

// 🆕 FETCH DETAILS (For Modal)
export const fetchAnilistDetails = async (id: string | number) => {
  const data = await fetchAnilist(DETAILS_QUERY, { id: Number(id) });
  if (!data?.Media) throw new Error("Anime not found");
  return mapAnilistToVideo(data.Media);
};

// 🆕 GENERATE EPISODES (Since Anilist doesn't give metadata per episode easily)
export const getAnilistEpisodes = (count: number): Episode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Episode ${i + 1}`,
    overview: "No preview available.",
    still_path: null,
    episode_number: i + 1,
    season_number: 1,
    vote_average: 0
  }));
};