import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../db/ceiba-inventory";
import { getInventoryActorFromServerCookies } from "../../lib/inventory-authz";
import { hasInventoryPermission } from "../../lib/inventory-rbac";
import { filterCeibaDashboardForActor } from "../../lib/ceiba-inventory-visibility";
import UserInventoryWorkspace from "./UserInventoryWorkspace";

export const dynamic = "force-dynamic";

export default async function InventairePage() {
  redirect("/");
}
