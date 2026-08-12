import { redirect } from "next/navigation";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";

export const dynamic = "force-dynamic";

export default async function InventoryProductionPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) redirect("/inventaire/login");

  redirect("/inventaire");
}