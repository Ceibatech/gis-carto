import type { Metadata } from "next";
import { getGeoArchivesDashboard } from "../db/geoarchives";
import GeoArchivesApp from "./GeoArchivesApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MULCV GeoArchives",
  description:
    "Prototype de plateforme nationale de cartographie, registre, évaluation et suivi des sites d'archives.",
};

export default async function Home() {
  const dashboard = await getGeoArchivesDashboard();
  return <GeoArchivesApp initialData={dashboard} />;
}
