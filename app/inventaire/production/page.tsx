import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard, getCeibaInventoryOperatorPerformance } from "../../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasInventoryPermission } from "../../../lib/inventory-rbac";
import ProductionInventoryWorkspace from "../ProductionInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventoryProductionPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) redirect("/inventaire/login");
  if (!hasInventoryPermission(actor.permissions, "inventory.record.read_all")) redirect("/inventaire/acces-refuse");

  const [dashboard, operatorPerformance] = await Promise.all([
    getCeibaInventoryDashboard(),
    getCeibaInventoryOperatorPerformance(),
  ]);

  return <ProductionInventoryWorkspace actor={actor} dashboard={dashboard} operatorPerformance={operatorPerformance} />;
}