import { useQuery } from "@tanstack/react-query";
import { getPersistence } from "@/services/persistence";
import type {
  ArchiveResultRecord,
  DailyResultRecord,
} from "@/services/persistence";

export const resultKeys = {
  daily: ["results", "daily"] as const,
  archive: ["results", "archive"] as const,
};

/** All official daily results (newest day first). */
export function useDailyResults() {
  return useQuery<DailyResultRecord[]>({
    queryKey: resultKeys.daily,
    queryFn: () => getPersistence().listDailyResults(),
    // Games write straight to persistence, so always re-read on mount.
    staleTime: 0,
  });
}

/** All free-play (archive/practice) results. */
export function useArchiveResults() {
  return useQuery<ArchiveResultRecord[]>({
    queryKey: resultKeys.archive,
    queryFn: () => getPersistence().listArchiveResults(),
    staleTime: 0,
  });
}

/** Both sets together, with a single loading flag. */
export function useAllResults() {
  const daily = useDailyResults();
  const archive = useArchiveResults();
  return {
    daily: daily.data ?? [],
    archive: archive.data ?? [],
    isLoading: daily.isLoading || archive.isLoading,
    isError: daily.isError || archive.isError,
  };
}
