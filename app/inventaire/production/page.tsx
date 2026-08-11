import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCeibaInventoryProductionSnapshot } from "../../../db/ceiba-inventory";
import { isDatabaseConfigured } from "../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../lib/api-url";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasInventoryPermission } from "../../../lib/inventory-rbac";
import type { CeibaInventoryProductionSnapshot } from "../../../lib/ceiba-inventory-types";
import ProductionInventoryWorkspace from "../ProductionInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventoryProductionPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) redirect("/inventaire/login");
  if (!hasInventoryPermission(actor.permissions, "inventory.record.read_all")) redirect("/inventaire/acces-refuse");

  const { dashboard, operatorPerformance, dailyProduction } = await getProductionSnapshot();

  return <ProductionInventoryWorkspace actor={actor} dashboard={dashboard} operatorPerformance={operatorPerformance} dailyProduction={dailyProduction} />;
}

async function getProductionSnapshot(): Promise<CeibaInventoryProductionSnapshot> {
  if (isDatabaseConfigured()) return getCeibaInventoryProductionSnapshot();

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) return getCeibaInventoryProductionSnapshot();

  try {
    const cookieStore = await cookies();
    const response = await fetch(`${baseUrl}/api/inventaire-ceiba?view=production`, {
      cache: "no-store",
      headers: { accept: "application/json", cookie: cookieStore.toString() },
    });
    if (response.ok) return await response.json() as CeibaInventoryProductionSnapshot;
  } catch {
    // The local fallback below retains the existing dashboard unavailable state.
  }

  return getCeibaInventoryProductionSnapshot();
}