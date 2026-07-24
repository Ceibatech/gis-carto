import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "./ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "./geoarchives-auth";
import { buildInventoryActor, hasAnyInventoryPermission, hasInventoryPermission, type InventoryActor, type InventoryPermission } from "./inventory-rbac";

function fromCookieValues(ceibaCookie?: string | null, geoCookie?: string | null): InventoryActor | null {
  const rootAdmin = verifyAuthSession(geoCookie);
  if (rootAdmin?.role === "admin") {
    return buildInventoryActor({
      login: rootAdmin.login,
      name: rootAdmin.name,
      role: "root-admin",
    });
  }

  const session = verifyCeibaInventorySession(ceibaCookie);
  if (!session) return null;

  return buildInventoryActor({
    login: session.login,
    name: session.name,
    role: session.role,
  });
}

export async function getInventoryActorFromServerCookies() {
  const cookieStore = await cookies();
  return fromCookieValues(
    cookieStore.get(ceibaInventoryAuthCookieName)?.value,
    cookieStore.get(geoArchivesAuthCookieName)?.value,
  );
}

export function getInventoryActorFromRequest(request: NextRequest) {
  return fromCookieValues(
    request.cookies.get(ceibaInventoryAuthCookieName)?.value,
    request.cookies.get(geoArchivesAuthCookieName)?.value,
  );
}

export function requireInventoryPermission(actor: InventoryActor | null, permission: InventoryPermission) {
  return actor ? hasInventoryPermission(actor.permissions, permission) : false;
}

export function requireAnyInventoryPermission(actor: InventoryActor | null, required: InventoryPermission[]) {
  return actor ? hasAnyInventoryPermission(actor.permissions, required) : false;
}
