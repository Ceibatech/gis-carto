import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";

export const dynamic = "force-dynamic";

export default async function InventoryLoginPage() {
  const actor = await getInventoryActorFromServerCookies();
  if (actor) {
    redirect("/inventaire");
  }

  return <LoginForm />;
}
