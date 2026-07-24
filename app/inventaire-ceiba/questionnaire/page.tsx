import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CeibaInventoryApp from "../../CeibaInventoryApp";
import { getCeibaInventoryDashboard } from "../../../db/ceiba-inventory";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../../../lib/ceiba-inventory-auth";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../../../lib/geoarchives-auth";

export const dynamic = "force-dynamic";

export default async function CeibaInventoryQuestionnairePage() {
  const cookieStore = await cookies();
  const geoSession = verifyAuthSession(cookieStore.get(geoArchivesAuthCookieName)?.value);
  const ceibaSession = verifyCeibaInventorySession(cookieStore.get(ceibaInventoryAuthCookieName)?.value);
  const session = ceibaSession ?? (geoSession?.role === "admin" ? { login: geoSession.login, name: geoSession.name, role: "admin" as const } : null);

  if (!session) {
    redirect("/inventaire-ceiba");
  }

  if (session.role === "supervisor") {
    redirect("/inventaire-ceiba");
  }

  const dashboard = await getCeibaInventoryDashboard();
  return <CeibaInventoryApp initialDashboard={dashboard} mode="questionnaire" session={session} />;
}
