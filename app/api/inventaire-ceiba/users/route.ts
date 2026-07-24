import type { NextRequest } from "next/server";
import { createCeibaInventoryUserAccount, listCeibaInventoryUsers } from "../../../../db/ceiba-users";
import { isDatabaseConfigured } from "../../../../db";
import type { CeibaInventoryRole } from "../../../../lib/ceiba-inventory-auth-types";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../lib/api-url";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../../../../lib/ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../../lib/geoarchives-auth";
import { corsJson, corsPreflight } from "../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = requireCeibaAdminActor(request);
  if (!actor) return corsJson(request, { message: "Accès administrateur CEIBA requis." }, { status: 403 });

  try {
    return corsJson(request, await listCeibaInventoryUsers());
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de charger les comptes CEIBA." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = requireCeibaAdminActor(request);
  if (!actor) return corsJson(request, { message: "Accès administrateur CEIBA requis." }, { status: 403 });

  try {
    const body = (await request.json()) as { login?: unknown; name?: unknown; password?: unknown; role?: unknown };
    const result = await createCeibaInventoryUserAccount(
      {
        login: String(body.login ?? ""),
        name: String(body.name ?? ""),
        password: String(body.password ?? ""),
        role: String(body.role ?? "operator") as CeibaInventoryRole,
      },
      actor,
    );

    return corsJson(request, result, { status: 201 });
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de créer le compte CEIBA." }, { status: 400 });
  }
}

function requireCeibaAdminActor(request: NextRequest) {
  const rootAdmin = verifyAuthSession(request.cookies.get(geoArchivesAuthCookieName)?.value);
  if (rootAdmin?.role === "admin") {
    return rootAdmin;
  }

  const ceibaAdmin = verifyCeibaInventorySession(request.cookies.get(ceibaInventoryAuthCookieName)?.value);
  return ceibaAdmin?.role === "admin" ? ceibaAdmin : null;
}

async function proxyIfRemote(request: NextRequest) {
  if (isDatabaseConfigured()) return null;

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return null;

  const targetUrl = `${baseUrl}/api/inventaire-ceiba/users`;
  const method = request.method.toUpperCase();
  const payload = method === "POST" ? await request.text() : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers: {
      accept: "application/json",
      "content-type": request.headers.get("content-type") ?? "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: payload,
    cache: "no-store",
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
