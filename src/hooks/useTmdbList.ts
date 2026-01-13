// src/hooks/useTmdbList.ts
import { useEffect, useState } from "react";
import type { TmdbListItem } from "@/lib/tmdbLists";

export function useTmdbList(fetchFunction: () => Promise<TmdbListItem[]>) {
  const [data, setData] = useState<TmdbListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null); // Reset error when a new request starts

    fetchFunction()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err : new Error(String(err)))
      )
      .finally(() => setLoading(false));
  }, [fetchFunction]);

  return { data, loading, error };
}
