import type { NextRequest } from "next/server";
import { getGeoArchivesDashboard } from "../../../db/geoarchives";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../lib/geoarchives-auth";
import { corsJson, corsPreflight } from "../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const session = verifyAuthSession(request.cookies.get(geoArchivesAuthCookieName)?.value);
  if (!session) {
    return corsJson(request, { message: "Session GeoArchives requise." }, { status: 401 });
  }

  const dashboard = await getGeoArchivesDashboard();
  return corsJson(request, dashboard);
}
