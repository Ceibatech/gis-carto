"use client";

import { Download, Printer } from "lucide-react";
import type { CeibaInventoryDailyProduction, CeibaInventoryDashboard, CeibaInventoryOperatorPerformance } from "../../lib/ceiba-inventory-types";
import type { InventoryActor } from "../../lib/inventory-rbac";
import { UserSidebar } from "../components/inventory-workspace-ui";

type Props = {
  actor: InventoryActor;
  dashboard: CeibaInventoryDashboard;
  operatorPerformance: CeibaInventoryOperatorPerformance[];
  dailyProduction: CeibaInventoryDailyProduction[];
};

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function ProductionInventoryWorkspace({ actor, dashboard, operatorPerformance, dailyProduction }: Props) {
  const totalCartons = dailyProduction.reduce((sum, item) => sum + item.cartonsCount, 0);
  const totalDossiers = dailyProduction.reduce((sum, item) => sum + item.dossiersCount, 0);
  const hasDailyProduction = dailyProduction.some((item) => item.source === "daily");
  const totalDamagedCartons = dailyProduction.reduce((sum, item) => sum + (item.damagedCartonsCount ?? 0), 0) || dashboard.damagedCartons;
  const totalDamagedDossiers = dailyProduction.reduce((sum, item) => sum + (item.damagedDossiersCount ?? 0), 0) || dashboard.damagedDossiers;

  function downloadReport() {
    const rows = [
      ["UNITE DE CONSERVATION (UC)", ...dailyProduction.map((item) => item.operatorName), "TOTAL GENERAL"],
      ["NBRE DE CARTONS", ...dailyProduction.map((item) => item.cartonsCount), totalCartons],
      ["NBRE DE DOSSIERS", ...dailyProduction.map((item) => item.dossiersCount), totalDossiers],
      ["NBRE DE CARTONS DEGRADES", ...dailyProduction.map((item) => item.damagedCartonsCount ?? "Non renseigne"), hasDailyProduction ? totalDamagedCartons : "Non renseigne"],
      ["NBRE DE DOSSIERS DEGRADES", ...dailyProduction.map((item) => item.damagedDossiersCount ?? "Non renseigne"), hasDailyProduction ? totalDamagedDossiers : "Non renseigne"],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `suivi-production-ceiba-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="inventory-layout">
      <UserSidebar
        activeKey="production"
        items={[
          { key: "new", label: "Nouvelle fiche", href: "/inventaire" },
          { key: "records", label: "Mes fiches", href: "/inventaire/registre" },
          { key: "overview", label: "Vue d'ensemble", href: "/inventaire?tab=overview" },
          { key: "production", label: "Pilotage production", href: "/inventaire/production" },
        ]}
      />

      <main className="inventory-main">
        <header className="inventory-header-card">
          <div>
            <p className="panel-label">Inventaire</p>
            <h1>Production</h1>
          </div>
          <div className="session-chip compact"><span>Utilisateur</span><strong>{actor.name}</strong></div>
        </header>

        <section className="production-brief">
          <div><p>Suivi quotidien</p><strong>Production</strong><span>Consolide les indicateurs de production enregistrés dans la journée.</span></div>
          <div className="production-brief-actions">
            <button className="secondary-button" type="button" onClick={downloadReport}><Download size={16} /> Télécharger CSV</button>
            <button className="primary-button" type="button" onClick={() => window.print()}><Printer size={16} /> Imprimer</button>
          </div>
        </section>

        <section className="production-kpi-grid">
          <article><span>Nbre de cartons</span><strong>{totalCartons}</strong><small>{dailyProduction.length} operateur(s)</small></article>
          <article><span>Nbre de dossiers</span><strong>{totalDossiers}</strong><small>{dashboard.totalRecords} fiche(s) detaillee(s)</small></article>
          <article><span>Cartons degrades</span><strong>{hasDailyProduction ? totalDamagedCartons : dashboard.damagedCartons || "-"}</strong><small>{hasDailyProduction ? "Declare dans CG1020" : (dashboard.damagedCartons ? "Calcule depuis l'état des cartons" : "Non renseigne historiquement")}</small></article>
          <article><span>Dossiers degrades</span><strong>{hasDailyProduction ? totalDamagedDossiers : dashboard.damagedDossiers || "-"}</strong><small>{hasDailyProduction ? "Declare dans CG1020" : (dashboard.damagedDossiers ? "Calcule depuis l'état des dossiers" : "Non renseigne historiquement")}</small></article>
        </section>

        <section className="ceiba-panel operator-performance-panel">
          <div className="ceiba-panel-head">
            <div><p className="panel-label">Suivi de production</p><h3>Indicateurs operateurs</h3></div>
            <span className="production-date">Données journalieres</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom et prénoms</th>
                  <th>Salle / localisation</th>
                  <th>Date de production</th>
                  <th>Nombre de cartons</th>
                  <th>Nombre de dossiers</th>
                  <th>Cartons dégradés</th>
                  <th>Dossiers dégradés</th>
                </tr>
              </thead>
              <tbody>
                {dailyProduction.map((item) => (
                  <tr key={`${item.operatorLogin}-${item.productionDate}`}>
                    <td><strong>{item.operatorName || "—"}</strong><span>{item.operatorLogin || "Login non renseigné"}</span></td>
                    <td>{item.assignedRoom || "Non renseignée"}</td>
                    <td>{new Date(item.productionDate).toLocaleDateString("fr-FR")}</td>
                    <td>{item.cartonsCount}</td>
                    <td>{item.dossiersCount}</td>
                    <td>{item.damagedCartonsCount ?? 0}</td>
                    <td>{item.damagedDossiersCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dailyProduction.length && (
              <div className="ceiba-empty-state">
                <h3>Aucune donnée de production disponible</h3>
                <p>La production apparaît dès qu’une remontée journalière est enregistrée.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}