import type { NextRequest } from "next/server";
import { createCeibaInventoryUserAccount, listCeibaInventoryUsers, resetCeibaInventoryUserPassword, updateCeibaInventoryUserAccount } from "../../../../db/ceiba-users";
import { isDatabaseConfigured } from "../../../../db";
import type { CeibaInventoryRole } from "../../../../lib/ceiba-inventory-auth-types";
import { getInventoryActorFromRequest, requireInventoryPermission } from "../../../../lib/inventory-authz";
import { normalizeGeoArchivesApiBaseUrl } from "../../../../lib/api-url";
import { corsJson, corsPreflight } from "../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = getInventoryActorFromRequest(request);
  if (!requireInventoryPermission(actor, "inventory.users.manage")) {
    return corsJson(request, { message: "Acces refuse: permission inventory.users.manage requise." }, { status: 403 });
  }

  const safeActor = actor;
  if (!safeActor) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  try {
    return corsJson(request, await listCeibaInventoryUsers());
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de charger les comptes CEIBA." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = getInventoryActorFromRequest(request);
  if (!requireInventoryPermission(actor, "inventory.users.manage")) {
    return corsJson(request, { message: "Acces refuse: permission inventory.users.manage requise." }, { status: 403 });
  }

  const safeActor = actor;
  if (!safeActor) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { login?: unknown; name?: unknown; password?: unknown; role?: unknown };
    const result = await createCeibaInventoryUserAccount(
      {
        login: String(body.login ?? ""),
        name: String(body.name ?? ""),
        password: String(body.password ?? ""),
        role: String(body.role ?? "operator") as CeibaInventoryRole,
      },
      { login: safeActor.login, name: safeActor.name, role: safeActor.ceibaRole },
    );

    return corsJson(request, result, { status: 201 });
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de créer le compte CEIBA." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const proxied = await proxyIfRemote(request);
  if (proxied) return proxied;

  const actor = getInventoryActorFromRequest(request);
  if (!requireInventoryPermission(actor, "inventory.users.manage")) {
    return corsJson(request, { message: "Acces refuse: permission inventory.users.manage requise." }, { status: 403 });
  }

  const safeActor = actor;
  if (!safeActor) {
    return corsJson(request, { message: "Acces CEIBA requis." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      action?: unknown;
      id?: unknown;
      role?: unknown;
      status?: unknown;
      password?: unknown;
    };

    const action = String(body.action ?? "").trim();
    const id = String(body.id ?? "").trim();

    if (action === "update") {
      const result = await updateCeibaInventoryUserAccount(
        {
          id,
          role: body.role ? String(body.role) as CeibaInventoryRole : undefined,
          status: body.status ? String(body.status) as "active" | "disabled" : undefined,
        },
        { login: safeActor.login, name: safeActor.name, role: safeActor.ceibaRole },
      );
      return corsJson(request, result);
    }

    if (action === "reset-password") {
      const result = await resetCeibaInventoryUserPassword(
        {
          id,
          password: String(body.password ?? ""),
        },
        { login: safeActor.login, name: safeActor.name, role: safeActor.ceibaRole },
      );
      return corsJson(request, result);
    }

    return corsJson(request, { message: "Action PATCH invalide." }, { status: 400 });
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Operation utilisateur impossible." }, { status: 400 });
  }
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
