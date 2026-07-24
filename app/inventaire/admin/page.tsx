import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { listCeibaInventoryUsers } from "../../../db/ceiba-users";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasAnyInventoryPermission } from "../../../lib/inventory-rbac";
import AdminInventoryWorkspace from "../AdminInventoryWorkspace";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function InventaireAdminPage({ searchParams }: PageProps) {
  const actor = await getInventoryActorFromServerCookies();
  if (!actor) {
    redirect("/inventaire/login");
  }

  if (!hasAnyInventoryPermission(actor.permissions, ["inventory.users.manage", "inventory.roles.manage", "inventory.audit.view"])) {
    redirect("/inventaire/acces-refuse");
  }

  const params = await searchParams;
  const requested = params.section;
  const validSections = new Set(["overview", "users", "roles", "audit", "settings"]);
  const section = validSections.has(requested || "") ? requested as "overview" | "users" | "roles" | "audit" | "settings" : "overview";

  const dashboard = await getCeibaInventoryDashboard();
  const users = await listCeibaInventoryUsers();

  return (
    <AdminInventoryWorkspace
      actor={actor}
      dashboard={dashboard}
      initialAccounts={users.accounts}
      tableReady={users.tableReady}
      tableMessage={users.message}
      section={section}
    />
  );
}
