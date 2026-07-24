import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "../../../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../../lib/api-url";
import { authenticateCeibaInventoryUser, ceibaInventoryAuthCookieName, ceibaInventoryAuthCookieOptions, signCeibaInventorySession } from "../../../../../lib/ceiba-inventory-auth";
import { corsJson, corsPreflight } from "../../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  try {
    const body = (await request.json()) as { login?: unknown; password?: unknown };
    const session = await authenticateCeibaInventoryUser(String(body.login ?? ""), String(body.password ?? ""));
    if (!session) {
      return corsJson(request, { message: "Identifiants CEIBA invalides." }, { status: 401 });
    }

    const signed = signCeibaInventorySession(session);
    if (!signed) {
      return corsJson(request, { message: "Secret CEIBA non configuré." }, { status: 500 });
    }

    const response = corsJson(request, { session });
    response.cookies.set(ceibaInventoryAuthCookieName, signed, ceibaInventoryAuthCookieOptions());
    return response;
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Connexion CEIBA impossible." }, { status: 400 });
  }
}

async function proxyIfRemote(request: Request) {
  if (isDatabaseConfigured()) return null;

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl}/api/inventaire-ceiba/auth/login`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": request.headers.get("content-type") ?? "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const text = await response.text();
  const proxied = new Response(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    proxied.headers.set("set-cookie", setCookie);
  }

  return proxied;
}
