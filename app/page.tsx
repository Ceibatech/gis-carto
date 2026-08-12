import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ceibaInventoryAuthCookieName, verifyCeibaInventorySession } from "../lib/ceiba-inventory-auth";
import { emptyGeoArchivesDashboard } from "../lib/empty-geoarchives-dashboard";
import { getInitialGeoArchivesDashboard } from "../lib/geoarchives-dashboard-source";
import { geoArchivesAuthCookieName, verifyAuthSession } from "../lib/geoarchives-auth";
import GeoArchivesApp from "./GeoArchivesApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MULCV GeoArchives",
  description:
    "Prototype de plateforme nationale de cartographie, registre, évaluation et suivi des sites d'archives.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const geoSession = verifyAuthSession(cookieStore.get(geoArchivesAuthCookieName)?.value);
  const ceibaSession = verifyCeibaInventorySession(cookieStore.get(ceibaInventoryAuthCookieName)?.value);
  const session = geoSession ?? null;

  if (
    geoSession && (
      geoSession.role === "admin" ||
      geoSession.role === "executive" ||
      geoSession.startApplication === "inventory" ||
      geoSession.landingView === "Gestion des comptes"
    )
  ) {
    redirect("/inventaire/admin");
  }

  if (geoSession && geoSession.role === "admin") {
    redirect("/inventaire/admin");
  }

  if (ceibaSession && (ceibaSession.role === "admin" || ceibaSession.role === "supervisor")) {
    redirect("/inventaire/admin");
  }

  const dashboard = session ? await getInitialGeoArchivesDashboard() : emptyGeoArchivesDashboard();
  return <GeoArchivesApp initialData={dashboard} initialSession={session} />;
}
