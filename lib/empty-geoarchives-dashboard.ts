import type { GeoArchivesDashboard } from "./geoarchives-types";

export function emptyGeoArchivesDashboard(message: string | null = null): GeoArchivesDashboard {
  return {
    auditEntries: [],
    databaseReady: false,
    documents: [],
    message,
    missions: [],
    schemaReady: false,
    sites: [],
  };
}
