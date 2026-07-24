import type { NextRequest } from "next/server";
import { createGeoArchiveUserAccount, listGeoArchiveUsers } from "../../../db/users";
import type { AuthRole } from "../../../lib/geoarchives-auth-types";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../lib/geoarchives-auth";
import { corsJson, corsPreflight } from "../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const session = requireAdminSession(request);
  if (!session) return corsJson(request, { message: "Accès administrateur requis." }, { status: 403 });

  try {
    return corsJson(request, await listGeoArchiveUsers());
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de charger les comptes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = requireAdminSession(request);
  if (!session) return corsJson(request, { message: "Accès administrateur requis." }, { status: 403 });

  try {
    const body = (await request.json()) as { login?: unknown; name?: unknown; password?: unknown; role?: unknown };
    const result = await createGeoArchiveUserAccount(
      {
        login: String(body.login ?? ""),
        name: String(body.name ?? ""),
        password: String(body.password ?? ""),
        role: String(body.role ?? "agent") as AuthRole,
      },
      session,
    );

    return corsJson(request, result.list, { status: 201 });
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de créer le compte." }, { status: 400 });
  }
}

function requireAdminSession(request: NextRequest) {
  const session = verifyAuthSession(request.cookies.get(geoArchivesAuthCookieName)?.value);
  return session?.role === "admin" ? session : null;
}
