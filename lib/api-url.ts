export function normalizeGeoArchivesApiBaseUrl(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "").replace(/\/api$/i, "");
}

export function geoArchivesApiUrl(path: string, baseUrl?: string | null) {
  const base = normalizeGeoArchivesApiBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
