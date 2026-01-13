import { fetchTmdbCategory, tmdbListEndpoints } from "@/lib/tmdbLists";

export type CategoryType = "movie" | "series" | "mixed";

export interface CategoryConfigItem {
  id: string;
  name: string;
  title: string;
  category: string;
  categoryType: CategoryType;
  fetcher: () => Promise<any>;
}

// ✅ Manual Order: Define exactly what you want to show and in what order
export const CATEGORY_CONFIG: CategoryConfigItem[] = [
  {
    id: "top-10",
    name: "top10",
    title: "Top 10 in Your Country",
    category: "top10",
    categoryType: "mixed",
    fetcher: () => fetchTmdbCategory("top10"),
  },
  {
    id: "bollywood-hits",
    name: "bollywood",
    title: "Bollywood Hits",
    category: "bollywood",
    categoryType: "movie",
    fetcher: () => fetchTmdbCategory("bollywood"),
  },
  {
    id: "k-dramas",
    name: "koreanSeries",
    title: "K-Dramas",
    category: "koreanSeries",
    categoryType: "series",
    fetcher: () => fetchTmdbCategory("koreanSeries"),
  },
  {
    id: "indian-cinema",
    name: "indianMovies",
    title: "Indian Cinema",
    category: "indianMovies",
    categoryType: "movie",
    fetcher: () => fetchTmdbCategory("indianMovies"),
  },
  {
    id: "trending-movies",
    name: "trendingMovies",
    title: "Trending Movies",
    category: "trendingMovies",
    categoryType: "movie",
    fetcher: () => fetchTmdbCategory("trendingMovies"),
  },
  {
    id: "netflix-originals",
    name: "netflix",
    title: "Only on Netflix",
    category: "netflix",
    categoryType: "series",
    fetcher: () => fetchTmdbCategory("netflix"),
  },
  {
    id: "korean-movies",
    name: "koreanMovies",
    title: "Korean Movies",
    category: "koreanMovies",
    categoryType: "movie",
    fetcher: () => fetchTmdbCategory("koreanMovies"),
  },
  {
    id: "action",
    name: "action",
    title: "Action Thrillers",
    category: "action",
    categoryType: "movie",
    fetcher: () => fetchTmdbCategory("action"),
  },
];