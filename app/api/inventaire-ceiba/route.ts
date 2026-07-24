import type { NextRequest } from "next/server";
import { createCeibaInventoryRecord, getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { isDatabaseConfigured } from "../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../lib/api-url";
import { getInventoryActorFromRequest, requireAnyInventoryPermission, requireInventoryPermission } from "../../../lib/inventory-authz";
import type { CeibaInventoryDashboard, CeibaInventoryInput } from "../../../lib/ceiba-inventory-types";
import { corsJson, corsPreflight } from "../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = getInventoryActorFromRequest(request);
  if (!requireInventoryPermission(actor, "inventory.dashboard.view")) {
    return corsJson(request, { message: "Acces refuse: permission inventory.dashboard.view requise." }, { status: 403 });
  }

  const safeActor = actor;
  if (!safeActor) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  const rawDashboard = await getCeibaInventoryDashboard();
  const dashboard = filterDashboardForActor(rawDashboard, safeActor.login, requireInventoryPermission(safeActor, "inventory.record.read_all"));
  return corsJson(request, dashboard);
}

export async function POST(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  try {
    const actor = getInventoryActorFromRequest(request);
    if (!actor) return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
    if (!requireAnyInventoryPermission(actor, ["inventory.record.create", "inventory.record.submit"])) {
      return corsJson(request, { message: "Acces refuse: permissions de creation/soumission requises." }, { status: 403 });
    }

    const input = (await request.json()) as CeibaInventoryInput;
    validateCeibaInventoryInput(input);
    await createCeibaInventoryRecord(input, actor.login);
    const dashboard = await getCeibaInventoryDashboard();
    return corsJson(request, dashboard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer la fiche CEIBA";
    return corsJson(request, { message }, { status: 400 });
  }
}

function filterDashboardForActor(dashboard: CeibaInventoryDashboard, login: string, canReadAll: boolean): CeibaInventoryDashboard {
  if (canReadAll) return dashboard;

  const ownRecords = dashboard.recentRecords.filter((record) => record.createdBy?.toLowerCase() === login.toLowerCase());
  const byStatus = ownRecords.reduce(
    (acc, record) => {
      if (record.status === "Nouveau") acc.newRecords += 1;
      if (record.status === "En revue") acc.reviewedRecords += 1;
      if (record.status === "Traité") acc.processedRecords += 1;
      if (record.status === "Bloqué") acc.blockedRecords += 1;
      return acc;
    },
    { newRecords: 0, reviewedRecords: 0, processedRecords: 0, blockedRecords: 0 },
  );

  const uniqueCommunes = new Set(ownRecords.map((record) => record.commune).filter(Boolean));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecords = ownRecords.filter((record) => new Date(record.createdAt).getTime() >= today.getTime()).length;

  return {
    ...dashboard,
    recentRecords: ownRecords,
    totalRecords: ownRecords.length,
    todayRecords,
    uniqueCommunes: uniqueCommunes.size,
    newRecords: byStatus.newRecords,
    reviewedRecords: byStatus.reviewedRecords,
    processedRecords: byStatus.processedRecords,
    blockedRecords: byStatus.blockedRecords,
    activityByCommune: dashboard.activityByCommune.filter((item) => uniqueCommunes.has(item.commune)),
  };
}

function validateCeibaInventoryInput(input: CeibaInventoryInput) {
  const required = [
    ["Commune", input.commune],
    ["Nature de dossier", input.caseNature],
    ["Nom", input.lastName],
    ["Prénoms", input.firstNames],
    ["Statut", input.status],
  ];

  for (const [label, value] of required) {
    if (!String(value ?? "").trim()) {
      throw new Error(`Merci de renseigner: ${label}`);
    }
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("Adresse email invalide.");
  }
}

async function proxyIfRemote(request: NextRequest) {
  if (isDatabaseConfigured()) return null;

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return null;

  const targetUrl = `${baseUrl}/api/inventaire-ceiba`;
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
