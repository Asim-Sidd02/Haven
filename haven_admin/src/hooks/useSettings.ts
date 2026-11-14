"use client";

import { useDoc } from "./useCollection";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

export function useSettings() {
  const { data, loading } = useDoc<AppSettings>("settings", "app");
  return { settings: { ...DEFAULT_SETTINGS, ...(data ?? {}) }, loading, exists: data !== null };
}
