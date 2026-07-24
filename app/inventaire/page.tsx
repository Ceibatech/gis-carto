import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../lib/inventory-authz";
import { hasInventoryPermission } from "../../lib/inventory-rbac";
import UserInventoryWorkspace from "./UserInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventairePage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) {
    redirect("/inventaire/login");
  }

  if (!hasInventoryPermission(actor.permissions, "inventory.dashboard.view")) {
    redirect("/inventaire/acces-refuse");
  }

  const dashboard = await getCeibaInventoryDashboard();
  return <UserInventoryWorkspace actor={actor} dashboard={dashboard} view="dashboard" />;
}
