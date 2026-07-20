import { getGeoArchivesDashboard } from "../db/geoarchives";
import { geoArchivesApiUrl, normalizeGeoArchivesApiBaseUrl } from "./api-url";
import type { GeoArchivesDashboard } from "./geoarchives-types";

function configuredApiBaseUrl() {
  return normalizeGeoArchivesApiBaseUrl(
    process.env.GEOARCHIVES_API_BASE_URL ?? process.env.NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL,
  );
}

export async function getInitialGeoArchivesDashboard(): Promise<GeoArchivesDashboard> {
  const apiBaseUrl = configuredApiBaseUrl();

  if (!apiBaseUrl) {
    return getGeoArchivesDashboard();
  }

  try {
    const response = await fetch(geoArchivesApiUrl("/api/geoarchives", apiBaseUrl), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API GeoArchives indisponible: ${response.status}`);
    }

    return (await response.json()) as GeoArchivesDashboard;
  } catch (error) {
    console.error("Lecture API GeoArchives distante impossible", error);
    return getGeoArchivesDashboard();
  }
}
