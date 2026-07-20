import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  const session = verifyAuthSession(cookieStore.get(geoArchivesAuthCookieName)?.value);
  const dashboard = session ? await getInitialGeoArchivesDashboard() : emptyGeoArchivesDashboard();
  return <GeoArchivesApp initialData={dashboard} initialSession={session} />;
}
