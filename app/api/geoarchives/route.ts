import { getGeoArchivesDashboard } from "../../../db/geoarchives";
import { corsJson, corsPreflight } from "../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  const dashboard = await getGeoArchivesDashboard();
  return corsJson(request, dashboard);
}
