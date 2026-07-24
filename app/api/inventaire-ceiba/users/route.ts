import type { NextRequest } from "next/server";
import { createCeibaInventoryUserAccount, listCeibaInventoryUsers } from "../../../../db/ceiba-users";
import type { CeibaInventoryRole } from "../../../../lib/ceiba-inventory-auth-types";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../../../../lib/ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../../lib/geoarchives-auth";
import { corsJson, corsPreflight } from "../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const actor = requireCeibaAdminActor(request);
  if (!actor) return corsJson(request, { message: "Accès administrateur CEIBA requis." }, { status: 403 });

  try {
    return corsJson(request, await listCeibaInventoryUsers());
  } catch (error) {
    return corsJson(request, { message: error instanceof Error ? error.message : "Impossible de charger les comptes CEIBA." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
