import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../lib/inventory-authz";
import { hasInventoryPermission } from "../../lib/inventory-rbac";
import { filterCeibaDashboardForActor } from "../../lib/ceiba-inventory-visibility";
import UserInventoryWorkspace from "./UserInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventairePage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) {
    redirect("/?next=/inventaire");
  }

  if (!hasInventoryPermission(actor.permissions, "inventory.dashboard.view")) {
    redirect("/inventaire/acces-refuse");
  }

  const dashboard = filterCeibaDashboardForActor(await getCeibaInventoryDashboard(), actor);
  return <UserInventoryWorkspace actor={actor} dashboard={dashboard} view="dashboard" />;
}
