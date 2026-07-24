import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasAnyInventoryPermission } from "../../../lib/inventory-rbac";
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

  const dashboard = await getCeibaInventoryDashboard();
  return <UserInventoryWorkspace actor={actor} dashboard={dashboard} view="registre" />;
}
