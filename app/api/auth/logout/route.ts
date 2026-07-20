import { NextResponse } from "next/server";
import { geoArchivesAuthCookieName, geoArchivesAuthCookieOptions } from "../../../../lib/geoarchives-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(geoArchivesAuthCookieName, "", { ...geoArchivesAuthCookieOptions(), maxAge: 0 });
  return response;
}
