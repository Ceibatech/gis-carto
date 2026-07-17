import { NextResponse } from "next/server";
import { getGeoArchivesDashboard } from "../../../db/geoarchives";

export const dynamic = "force-dynamic";

export async function GET() {
  const dashboard = await getGeoArchivesDashboard();
  return NextResponse.json(dashboard);
}
