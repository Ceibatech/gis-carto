import { NextResponse } from "next/server";
import { authenticateCeibaInventoryUser, ceibaInventoryAuthCookieName, ceibaInventoryAuthCookieOptions, signCeibaInventorySession } from "../../../../../lib/ceiba-inventory-auth";
import { corsJson, corsPreflight } from "../../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
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
