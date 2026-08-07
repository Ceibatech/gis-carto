import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateGeoArchivesUser,
  authRuntimeReady,
  geoArchivesAuthCookieName,
  geoArchivesAuthCookieOptions,
  signAuthSession,
} from "../../../../lib/geoarchives-auth";
import { proxyToRemoteApi } from "../../../../lib/geoarchives-server-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // En deploiement scinde, les comptes crees depuis "Gestion des comptes"
  // vivent uniquement dans la base du backend distant: ce front n'a aucun
  // moyen de les authentifier localement. Le relais est donc tente en
  // premier, avant tout court-circuit local.
  const proxied = await proxyToRemoteApi(request, "/api/auth/login");
  if (proxied) return proxied;

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
