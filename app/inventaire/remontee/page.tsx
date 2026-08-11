import { redirect } from "next/navigation";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasInventoryPermission } from "../../../lib/inventory-rbac";
import DailyProductionWorkspace from "../DailyProductionWorkspace";

export default async function DailyProductionPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) redirect("/inventaire/login");
  if (!hasInventoryPermission(actor.permissions, "inventory.record.create")) redirect("/inventaire/acces-refuse");
  return <DailyProductionWorkspace actor={actor} />;
}