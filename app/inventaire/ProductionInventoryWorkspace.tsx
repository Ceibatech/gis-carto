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

const statusPalette = [
  { key: "newRecords", label: "Nouveau", color: "#2675b9" },
  { key: "reviewedRecords", label: "En revue", color: "#e99828" },
  { key: "processedRecords", label: "Traite", color: "#168260" },
  { key: "blockedRecords", label: "Bloque", color: "#c84c4c" },
] as const;

export default function ProductionInventoryWorkspace({ actor, dashboard, operatorPerformance, dailyProduction }: Props) {
  const processedTotal = operatorPerformance.reduce((sum, item) => sum + item.processedRecords, 0);
  const totalCartons = dailyProduction.reduce((sum, item) => sum + item.cartonsCount, 0);
  const totalDossiers = dailyProduction.reduce((sum, item) => sum + item.dossiersCount, 0);
  const hasDailyProduction = dailyProduction.some((item) => item.source === "daily");
  const totalDamagedCartons = dailyProduction.reduce((sum, item) => sum + (item.damagedCartonsCount ?? 0), 0) || dashboard.damagedCartons;
  const totalDamagedDossiers = dailyProduction.reduce((sum, item) => sum + (item.damagedDossiersCount ?? 0), 0) || dashboard.damagedDossiers;
  const statusTotal = dashboard.newRecords + dashboard.reviewedRecords + dashboard.processedRecords + dashboard.blockedRecords;
  const circumference = 2 * Math.PI * 42;
  let cumulativeLength = 0;

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
            <p className="panel-label">Inventaire CEIBA</p>
            <h1>Pilotage de la production</h1>
          </div>
          <div className="session-chip compact"><span>Executif inventaire</span><strong>{actor.name}</strong></div>
        </header>

        <section className="production-brief">
          <div><p>Suivi quotidien des operateurs</p><strong>Production terrain</strong><span>Consolide les indicateurs declares dans les fiches journalières CG1020.</span></div>
          <div className="production-brief-actions">
            <button className="secondary-button" type="button" onClick={downloadReport}><Download size={16} /> Telecharger CSV</button>
            <button className="primary-button" type="button" onClick={() => window.print()}><Printer size={16} /> Imprimer PDF</button>
          </div>
        </section>

        <section className="production-kpi-grid">
          <article><span>Nbre de cartons</span><strong>{totalCartons}</strong><small>{dailyProduction.length} operateur(s)</small></article>
          <article><span>Nbre de dossiers</span><strong>{totalDossiers}</strong><small>{dashboard.totalRecords} fiche(s) detaillee(s)</small></article>
          <article><span>Cartons degrades</span><strong>{hasDailyProduction ? totalDamagedCartons : dashboard.damagedCartons || "-"}</strong><small>{hasDailyProduction ? "Declare dans CG1020" : (dashboard.damagedCartons ? "Calcule depuis l'état des cartons" : "Non renseigne historiquement")}</small></article>
          <article><span>Dossiers degrades</span><strong>{hasDailyProduction ? totalDamagedDossiers : dashboard.damagedDossiers || "-"}</strong><small>{hasDailyProduction ? "Declare dans CG1020" : (dashboard.damagedDossiers ? "Calcule depuis l'état des dossiers" : "Non renseigne historiquement")}</small></article>
        </section>

        <section className="production-bi-grid">
          <article className="ceiba-panel production-chart-panel">
            <div className="ceiba-panel-head">
              <div><p className="panel-label">Etat du portefeuille</p><h3>Repartition des fiches</h3></div>
              <span className="production-date">{statusTotal} fiches</span>
            </div>
            <div className="status-chart-layout">
              <div className="status-donut" role="img" aria-label={`Repartition de ${statusTotal} fiches par statut`}>
                <svg viewBox="0 0 110 110" aria-hidden="true">
                  <circle className="status-donut-track" cx="55" cy="55" r="42" />
                  {statusPalette.map((status) => {
                    const value = dashboard[status.key];
                    const length = statusTotal ? (value / statusTotal) * circumference : 0;
                    const dashOffset = -cumulativeLength;
                    cumulativeLength += length;
                    return <circle key={status.key} className="status-donut-segment" cx="55" cy="55" r="42" stroke={status.color} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} />;
                  })}
                </svg>
                <div><strong>{statusTotal}</strong><span>fiches</span></div>
              </div>
              <div className="status-chart-legend">
                {statusPalette.map((status) => {
                  const value = dashboard[status.key];
                  const percentage = statusTotal ? Math.round((value / statusTotal) * 100) : 0;
                  return <div key={status.key}><i style={{ background: status.color }} /><span>{status.label}</span><strong>{value}</strong><small>{percentage}%</small></div>;
                })}
              </div>
            </div>
          </article>

          <article className="ceiba-panel production-chart-panel">
            <div className="ceiba-panel-head">
              <div><p className="panel-label">Comparatif operateurs</p><h3>Volume et traitement</h3></div>
              <span className="production-date">Par fiche creee</span>
            </div>
            <div className="operator-chart" role="img" aria-label="Production comparee par operateur">
              {operatorPerformance.slice(0, 8).map((item) => {
                const total = item.totalRecords || 1;
                const completed = Math.round((item.processedRecords / total) * 100);
                const pending = Math.round(((item.newRecords + item.reviewedRecords) / total) * 100);
                const blocked = Math.max(0, 100 - completed - pending);
                return <div className="operator-chart-row" key={item.login}>
                  <div className="operator-chart-name" title={item.name}>{item.name}</div>
                  <div className="operator-chart-bar"><i className="operator-chart-completed" style={{ width: `${completed}%` }} /><i className="operator-chart-pending" style={{ width: `${pending}%` }} /><i className="operator-chart-blocked" style={{ width: `${blocked}%` }} /></div>
                  <strong>{item.totalRecords}</strong>
                </div>;
              })}
              {!operatorPerformance.length && <div className="ceiba-empty-state"><p>Aucune donnee de production pour le moment.</p></div>}
            </div>
            <div className="operator-chart-key"><span><i className="operator-chart-completed" /> Traite</span><span><i className="operator-chart-pending" /> En attente</span><span><i className="operator-chart-blocked" /> Bloque</span></div>
          </article>
        </section>

        <section className="ceiba-panel operator-performance-panel">
          <div className="ceiba-panel-head">
            <div><p className="panel-label">Fiche de suivi de la production</p><h3>Indicateurs par operateur</h3></div>
            <span className="production-date">Mis a jour en temps reel</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Operateur</th><th>Nbre de cartons</th><th>Nbre de dossiers</th><th>Cartons degrades</th><th>Dossiers degrades</th></tr></thead>
              <tbody>{dailyProduction.map((item) => <tr key={item.operatorLogin}>
                <td><strong>{item.operatorName}</strong><span>{[item.assignedRoom, item.operatorLogin].filter(Boolean).join(" · ")}</span></td>
                <td>{item.cartonsCount}</td><td>{item.dossiersCount}</td><td>{item.damagedCartonsCount ?? "Non renseigne"}</td><td>{item.damagedDossiersCount ?? "Non renseigne"}</td>
              </tr>)}</tbody>
            </table>
            {!dailyProduction.length && <div className="ceiba-empty-state"><h3>Aucune remontee journaliere disponible</h3><p>Les indicateurs apparaissent apres la premiere fiche CG1020 saisie par un operateur.</p></div>}
          </div>
        </section>
      </main>
    </div>
  );
}