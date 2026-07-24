import { ceibaInventoryAuthCookieName, ceibaInventoryAuthCookieOptions } from "../../../../../lib/ceiba-inventory-auth";
import { corsJson, corsPreflight } from "../../../_cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  const response = corsJson(request, { ok: true });
  response.cookies.set(ceibaInventoryAuthCookieName, "", { ...ceibaInventoryAuthCookieOptions(), maxAge: 0 });
  return response;
}
