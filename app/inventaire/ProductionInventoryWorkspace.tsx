"use client";

import { Download, Printer } from "lucide-react";
import type { CeibaInventoryDashboard, CeibaInventoryOperatorPerformance } from "../../lib/ceiba-inventory-types";
import type { InventoryActor } from "../../lib/inventory-rbac";
import { UserSidebar } from "../components/inventory-workspace-ui";

type Props = {
  actor: InventoryActor;
  dashboard: CeibaInventoryDashboard;
  operatorPerformance: CeibaInventoryOperatorPerformance[];
};

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function ProductionInventoryWorkspace({ actor, dashboard, operatorPerformance }: Props) {
  const processedTotal = operatorPerformance.reduce((sum, item) => sum + item.processedRecords, 0);
  const totalBoxes = operatorPerformance.reduce((sum, item) => sum + item.totalRecords, 0);

  function downloadReport() {
    const rows = [
      ["Operateur", "Identifiant", "Salle", "Fiches", "Nouveau", "En revue", "Traite", "Bloque", "Avancement"],
      ...operatorPerformance.map((item) => {
        const progress = item.totalRecords ? Math.round((item.processedRecords / item.totalRecords) * 100) : 0;
        return [item.name, item.login, item.assignedRoom ?? "", item.totalRecords, item.newRecords, item.reviewedRecords, item.processedRecords, item.blockedRecords, `${progress}%`];
      }),
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
          <div><p>Suivi quotidien des operateurs</p><strong>Production terrain</strong><span>Consolide les fiches enregistrees et leur etat de traitement.</span></div>
          <div className="production-brief-actions">
            <button className="secondary-button" type="button" onClick={downloadReport}><Download size={16} /> Telecharger CSV</button>
            <button className="primary-button" type="button" onClick={() => window.print()}><Printer size={16} /> Imprimer PDF</button>
          </div>
        </section>

        <section className="production-kpi-grid">
          <article><span>Fiches enregistrees</span><strong>{dashboard.totalRecords}</strong><small>{dashboard.todayRecords} aujourd&apos;hui</small></article>
          <article><span>Production operateurs</span><strong>{totalBoxes}</strong><small>{operatorPerformance.length} operateur(s)</small></article>
          <article><span>Dossiers traites</span><strong>{processedTotal}</strong><small>{dashboard.processedRecords} valides au total</small></article>
          <article><span>En attente</span><strong>{dashboard.newRecords + dashboard.reviewedRecords}</strong><small>{dashboard.blockedRecords} bloque(s)</small></article>
        </section>

        <section className="ceiba-panel operator-performance-panel">
          <div className="ceiba-panel-head">
            <div><p className="panel-label">Tableau de suivi</p><h3>Production par operateur</h3></div>
            <span className="production-date">Mis a jour en temps reel</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Operateur</th><th>Fiches</th><th>Nouveau</th><th>En revue</th><th>Traite</th><th>Bloque</th><th>Avancement</th></tr></thead>
              <tbody>{operatorPerformance.map((item) => {
                const progress = item.totalRecords ? Math.round((item.processedRecords / item.totalRecords) * 100) : 0;
                return <tr key={item.login}>
                  <td><strong>{item.name}</strong><span>{[item.assignedRoom, item.login].filter(Boolean).join(" · ")}</span></td>
                  <td>{item.totalRecords}</td><td>{item.newRecords}</td><td>{item.reviewedRecords}</td><td>{item.processedRecords}</td><td>{item.blockedRecords}</td>
                  <td><div className="operator-progress"><div><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div></td>
                </tr>;
              })}</tbody>
            </table>
            {!operatorPerformance.length && <div className="ceiba-empty-state"><h3>Aucune production disponible</h3><p>Les lignes apparaissent apres la premiere fiche enregistree par un operateur.</p></div>}
          </div>
        </section>
      </main>
    </div>
  );
}