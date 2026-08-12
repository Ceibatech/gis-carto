import type { NextRequest } from "next/server";
import { dispatchCeibaInventoryExecutiveReports } from "../../../../db/ceiba-inventory";
import { isDatabaseConfigured } from "../../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../lib/api-url";
import { getInventoryActorFromRequest, requireInventoryPermission } from "../../../../lib/inventory-authz";
import { corsJson, corsPreflight } from "../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = getInventoryActorFromRequest(request);
  if (!actor) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  if (!requireInventoryPermission(actor, "inventory.record.export")) {
    return corsJson(request, { message: "Acces refuse: permission inventory.record.export requise." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { period?: "day" | "week" | "month" };
    const period = body.period === "week" || body.period === "month" ? body.period : "day";

    const result = await dispatchCeibaInventoryExecutiveReports(period);
    if (!result.ok) {
      return corsJson(request, result, { status: 400 });
    }

    return corsJson(request, result, { status: 200 });
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible d'envoyer les rapports." }, { status: 500 });
  }
}

async function proxyIfRemote(request: NextRequest) {
  if (isDatabaseConfigured()) return null;

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return null;

  const targetUrl = `${baseUrl}/api/inventaire-ceiba/reports`;
  const payload = await request.text();

  const response = await fetch(targetUrl, {
    method: "POST",
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
