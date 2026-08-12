import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasAnyInventoryPermission, hasInventoryPermission } from "../../../lib/inventory-rbac";
import { filterCeibaDashboardForActor } from "../../../lib/ceiba-inventory-visibility";
import UserInventoryWorkspace from "../UserInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventaireRegistrePage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) {
    redirect("/inventaire/login");
  }

  if (!hasAnyInventoryPermission(actor.permissions, ["inventory.record.read_own", "inventory.record.read_all"])) {
    redirect("/inventaire/acces-refuse");
  }

  if (hasInventoryPermission(actor.permissions, "inventory.dashboard.view") && !hasInventoryPermission(actor.permissions, "inventory.record.create")) {
    redirect("/inventaire/admin");
  }

  const dashboard = filterCeibaDashboardForActor(await getCeibaInventoryDashboard(), actor);
  return <UserInventoryWorkspace actor={actor} dashboard={dashboard} view="registre" />;
}
