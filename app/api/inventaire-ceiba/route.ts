import type { NextRequest } from "next/server";
import { createCeibaInventoryRecord, getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { isDatabaseConfigured } from "../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../lib/api-url";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../../../lib/ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../lib/geoarchives-auth";
import type { CeibaInventoryInput } from "../../../lib/ceiba-inventory-types";
import { corsJson, corsPreflight } from "../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = requireCeibaActor(request);
  if (!actor) return corsJson(request, { message: "Accès CEIBA requis." }, { status: 403 });

  const dashboard = await getCeibaInventoryDashboard();
  return corsJson(request, dashboard);
}

export async function POST(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  try {
    const actor = requireCeibaActor(request);
    if (!actor) return corsJson(request, { message: "Accès CEIBA requis." }, { status: 403 });

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

function requireCeibaActor(request: NextRequest) {
  const rootAdmin = verifyAuthSession(request.cookies.get(geoArchivesAuthCookieName)?.value);
  if (rootAdmin?.role === "admin") return rootAdmin;

  return verifyCeibaInventorySession(request.cookies.get(ceibaInventoryAuthCookieName)?.value);
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
