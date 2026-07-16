import type { Metadata } from "next";
import GeoArchivesApp from "./GeoArchivesApp";

export const metadata: Metadata = {
  title: "MULCV GeoArchives",
  description:
    "Prototype de plateforme nationale de cartographie, registre, évaluation et suivi des sites d'archives.",
};

export default function Home() {
  return <GeoArchivesApp />;
}
