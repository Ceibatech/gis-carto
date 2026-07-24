import { cookies } from "next/headers";
import CeibaInventoryApp from "../CeibaInventoryApp";
import { getCeibaInventoryDashboard } from "../../db/ceiba-inventory";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../../lib/ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../lib/geoarchives-auth";

export const dynamic = "force-dynamic";

export default async function CeibaInventoryPage() {
  const cookieStore = await cookies();
  const geoSession = verifyAuthSession(cookieStore.get(geoArchivesAuthCookieName)?.value);
  const ceibaSession = verifyCeibaInventorySession(cookieStore.get(ceibaInventoryAuthCookieName)?.value);
  const session = ceibaSession ?? (geoSession?.role === "admin" ? { login: geoSession.login, name: geoSession.name, role: "admin" as const } : null);

  const dashboard = session ? await getCeibaInventoryDashboard() : {
    activityByCommune: [],
    blockedRecords: 0,
    databaseReady: false,
    message: null,
    newRecords: 0,
    processedRecords: 0,
    recentRecords: [],
    reviewedRecords: 0,
    schemaReady: true,
    todayRecords: 0,
    totalRecords: 0,
    uniqueCommunes: 0,
  };
  return <CeibaInventoryApp initialDashboard={dashboard} session={session} />;
}
