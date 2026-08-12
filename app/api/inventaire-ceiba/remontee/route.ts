import type { NextRequest } from "next/server";
import { isDatabaseConfigured } from "../../../../db";
import { getCeibaInventoryProductionSnapshot } from "../../../../db/ceiba-inventory";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../lib/api-url";
import { getInventoryActorFromRequest, requireAnyInventoryPermission, requireInventoryPermission } from "../../../../lib/inventory-authz";
import { corsJson, corsPreflight } from "../../_cors";

export function OPTIONS(request: Request) { return corsPreflight(request); }

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) return proxyRemote(request);
  const actor = getInventoryActorFromRequest(request);
  if (!actor || !requireAnyInventoryPermission(actor, ["inventory.dashboard.view", "inventory.record.read_all", "inventory.record.read_own"])) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  return corsJson(request, await getCeibaInventoryProductionSnapshot());
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return proxyRemote(request);
  const actor = getInventoryActorFromRequest(request);
  if (!actor || !requireInventoryPermission(actor, "inventory.record.create")) return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });

  return corsJson(request, {
    ok: false,
    message: "La remontée journalière est calculée automatiquement depuis les fiches CEIBA. Aucune saisie manuelle n'est acceptée.",
  }, { status: 403 });
}

async function proxyRemote(request: NextRequest) {
  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return corsJson(request, { message: "API distante CEIBA manquante." }, { status: 503 });
  const response = await fetch(`${baseUrl}/api/inventaire-ceiba/remontee`, { method: request.method, headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "" }, body: request.method === "GET" ? undefined : await request.text() });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json" } });
}