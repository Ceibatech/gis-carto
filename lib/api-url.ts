export const defaultGeoArchivesApiBaseUrl = "https://api.geoarchiv.ceiba-analytics.com";

export function normalizeGeoArchivesApiBaseUrl(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "").replace(/\/api$/i, "");
}

export function configuredGeoArchivesApiBaseUrl() {
  return (
    normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL) ||
    normalizeGeoArchivesApiBaseUrl(process.env.NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL) ||
    defaultGeoArchivesApiBaseUrl
  );
}

export function geoArchivesApiUrl(path: string, baseUrl?: string | null) {
  const base = normalizeGeoArchivesApiBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
