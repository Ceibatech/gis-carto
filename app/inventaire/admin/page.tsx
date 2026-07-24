import { redirect } from "next/navigation";
import { getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { listCeibaInventoryUsers } from "../../../db/ceiba-users";
import { isDatabaseConfigured } from "../../../db";
import { normalizeGeoArchivesApiBaseUrl } from "../../../lib/api-url";
import { getInventoryActorFromServerCookies } from "../../../lib/inventory-authz";
import { hasAnyInventoryPermission } from "../../../lib/inventory-rbac";
import AdminInventoryWorkspace from "../AdminInventoryWorkspace";
import type { CeibaInventoryUserAccountsResponse } from "../../../lib/ceiba-inventory-auth-types";

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
  const users = await getUsersSnapshot();

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

async function getUsersSnapshot(): Promise<CeibaInventoryUserAccountsResponse> {
  if (isDatabaseConfigured()) {
    return listCeibaInventoryUsers();
  }

  const baseUrl = normalizeGeoArchivesApiBaseUrl(process.env.GEOARCHIVES_API_BASE_URL);
  if (!baseUrl) {
    return {
      accounts: [],
      tableReady: false,
      message: "Configuration API distante CEIBA manquante.",
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/inventaire-ceiba/users`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        accounts: [],
        tableReady: false,
        message: `API comptes CEIBA indisponible (HTTP ${response.status}).`,
      };
    }

    const payload = await response.json() as CeibaInventoryUserAccountsResponse;
    return payload;
  } catch {
    return {
      accounts: [],
      tableReady: false,
      message: "Impossible de charger les comptes CEIBA depuis l'API distante.",
    };
  }
}
