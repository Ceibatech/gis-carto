"use client";

import type { CeibaInventoryDailyProduction, CeibaInventoryDashboard } from "../../lib/ceiba-inventory-types";
import type { InventoryActor } from "../../lib/inventory-rbac";
import { UserSidebar } from "../components/inventory-workspace-ui";

export default function DailyProductionWorkspace({
  actor,
  dashboard,
  dailyProduction = [],
}: {
  actor: InventoryActor;
  dashboard?: CeibaInventoryDashboard;
  dailyProduction?: CeibaInventoryDailyProduction[];
}) {
  const totals = dashboard ?? {
    totalRecords: 0,
    uniqueCartons: 0,
    damagedCartons: 0,
    damagedDossiers: 0,
    activityByCommune: [],
    blockedRecords: 0,
    databaseReady: false,
    message: null,
    newRecords: 0,
    processedRecords: 0,
    recentRecords: [],
    reviewedRecords: 0,
    schemaReady: false,
    todayRecords: 0,
    uniqueCommunes: 0,
  };

  return (
    <div className="inventory-layout">
      <UserSidebar activeKey="daily" items={[{ key: "new", label: "Nouvelle fiche", href: "/inventaire" }, { key: "daily", label: "Remontee journaliere", href: "/inventaire/remontee" }, { key: "records", label: "Mes fiches", href: "/inventaire/registre" }, { key: "overview", label: "Vue d'ensemble", href: "/inventaire?tab=overview" }]} />
      <main className="inventory-main">
        <header className="inventory-header-card">
          <div>
            <p className="panel-label">CG1020</p>
            <h1>Remontee automatique</h1>
          </div>
          <div className="session-chip compact">
            <span>Operateur</span>
            <strong>{actor.name}</strong>
          </div>
        </header>

        <section className="ceiba-panel inventory-entry-workspace">
          <div className="inventory-form-section">
            <p className="inventory-section-kicker">Moteur de production</p>
            <h3>Indicateurs derives des fiches CEIBA</h3>
            <div className="inventory-form-grid">
              <div className="ceiba-stat-card">
                <div className="ceiba-stat-head"><span className="ceiba-stat-icon">•</span><p>Cartons</p></div>
                <strong>{totals.uniqueCartons}</strong>
              </div>
              <div className="ceiba-stat-card">
                <div className="ceiba-stat-head"><span className="ceiba-stat-icon">•</span><p>Dossiers</p></div>
                <strong>{totals.totalRecords}</strong>
              </div>
              <div className="ceiba-stat-card">
                <div className="ceiba-stat-head"><span className="ceiba-stat-icon">•</span><p>Cartons dégradés</p></div>
                <strong>{totals.damagedCartons}</strong>
              </div>
              <div className="ceiba-stat-card">
                <div className="ceiba-stat-head"><span className="ceiba-stat-icon">•</span><p>Dossiers dégradés</p></div>
                <strong>{totals.damagedDossiers}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="ceiba-panel">
          <div className="ceiba-panel-header">
            <h3>Production calculée</h3>
            <span className="inventory-chip">Lecture seule</span>
          </div>
          {dailyProduction.length === 0 ? (
            <p className="empty-state-text">Aucune production journalière n&apos;a été calculée pour le moment.</p>
          ) : (
            <table className="ceiba-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agent</th>
                  <th>Cartons</th>
                  <th>Dossiers</th>
                  <th>Cartons dégradés</th>
                  <th>Dossiers dégradés</th>
                </tr>
              </thead>
              <tbody>
                {dailyProduction.map((entry) => (
                  <tr key={`${entry.productionDate}-${entry.operatorLogin}`}>
                    <td>{entry.productionDate}</td>
                    <td>{entry.operatorName || entry.operatorLogin}</td>
                    <td>{entry.cartonsCount}</td>
                    <td>{entry.dossiersCount}</td>
                    <td>{entry.damagedCartonsCount ?? 0}</td>
                    <td>{entry.damagedDossiersCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}