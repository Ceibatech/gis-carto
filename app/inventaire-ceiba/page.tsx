import { redirect } from "next/navigation";
import { getInventoryActorFromServerCookies } from "../../lib/inventory-authz";
import { hasInventoryPermission } from "../../lib/inventory-rbac";

export const dynamic = "force-dynamic";

export default async function CeibaInventoryPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) {
    redirect("/inventaire/login");
  }

  if (hasInventoryPermission(actor.permissions, "inventory.users.manage")) {
    redirect("/inventaire/admin");
  }

  redirect("/inventaire");
}
