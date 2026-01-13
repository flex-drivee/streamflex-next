// src/hooks/useTmdb.ts
import { useEffect, useState } from "react";
import type { TmdbMeta } from "@/lib/tmdb"; // 👈 Update import path
import { fetchTmdb } from "@/lib/tmdb";

export function useTmdb(tmdbId?: number | null, kind: "movie" | "tv" = "movie") {
  const [data, setData] = useState<TmdbMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!tmdbId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tmdbId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTmdb(Number(tmdbId), kind)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, kind]);

  return { data, loading, error };
}
