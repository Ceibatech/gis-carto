import { cookies } from "next/headers";
import { getGeoArchivesDashboard } from "../db/geoarchives";
import { geoArchivesApiUrl, normalizeGeoArchivesApiBaseUrl } from "./api-url";
import { geoArchivesAuthCookieName } from "./geoarchives-auth";
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

  // L'API distante exige desormais une session: sans ce cookie, le rendu
  // serveur Vercel recevrait un 401 et retomberait sur un dashboard vide.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(geoArchivesAuthCookieName)?.value;

  try {
    const response = await fetch(geoArchivesApiUrl("/api/geoarchives", apiBaseUrl), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(sessionCookie ? { cookie: `${geoArchivesAuthCookieName}=${sessionCookie}` } : {}),
      },
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
