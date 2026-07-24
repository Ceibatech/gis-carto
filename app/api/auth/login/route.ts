import { NextResponse } from "next/server";
import {
  authenticateGeoArchivesUser,
  authRuntimeReady,
  geoArchivesAuthCookieName,
  geoArchivesAuthCookieOptions,
  signAuthSession,
} from "../../../../lib/geoarchives-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authRuntimeReady()) {
    return NextResponse.json(
      { message: "Authentification non configurée sur cet environnement." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { login?: string; password?: string } | null;
  const session = await authenticateGeoArchivesUser(body?.login ?? "", body?.password ?? "");

  if (!session) {
    return NextResponse.json({ message: "Identifiants invalides." }, { status: 401 });
  }

  const response = NextResponse.json({ session });
  response.cookies.set(geoArchivesAuthCookieName, signAuthSession(session), geoArchivesAuthCookieOptions());
  return response;
}
