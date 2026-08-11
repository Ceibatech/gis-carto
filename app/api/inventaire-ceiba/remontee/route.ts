import type { NextRequest } from "next/server";
import { isDatabaseConfigured } from "../../../../db";
import { saveCeibaInventoryDailyProduction } from "../../../../db/ceiba-inventory";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../lib/api-url";
import { getInventoryActorFromRequest, requireInventoryPermission } from "../../../../lib/inventory-authz";
import type { CeibaInventoryDailyProductionInput } from "../../../../lib/ceiba-inventory-types";
import { corsJson, corsPreflight } from "../../_cors";

export function OPTIONS(request: Request) { return corsPreflight(request); }

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return proxyRemote(request);
  const actor = getInventoryActorFromRequest(request);
  if (!actor || !requireInventoryPermission(actor, "inventory.record.create")) return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  try {
    const input = await request.json() as CeibaInventoryDailyProductionInput;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.productionDate)) throw new Error("Date de production invalide.");
    for (const value of [input.cartonsCount, input.dossiersCount, input.damagedCartonsCount, input.damagedDossiersCount]) if (!Number.isInteger(value) || value < 0) throw new Error("Les indicateurs doivent etre des nombres entiers positifs.");
    await saveCeibaInventoryDailyProduction(input, actor);
    return corsJson(request, { ok: true }, { status: 201 });
  } catch (error) { return corsJson(request, { message: error instanceof Error ? error.message : "Remontee impossible." }, { status: 400 }); }
}

async function proxyRemote(request: NextRequest) {
  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return corsJson(request, { message: "API distante CEIBA manquante." }, { status: 503 });
  const response = await fetch(`${baseUrl}/api/inventaire-ceiba/remontee`, { method: "POST", headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "" }, body: await request.text() });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json" } });
}