"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CeibaInventoryDailyProduction, CeibaInventoryDashboard, CeibaInventoryOperatorPerformance, CeibaInventoryReportDispatch } from "../../lib/ceiba-inventory-types";
import type { CeibaInventoryRole, CeibaInventoryUserAccount } from "../../lib/ceiba-inventory-auth-types";
import { inventoryPermissions, rolePermissionMatrix, type InventoryActor, type InventoryAppRole, type InventoryPermission } from "../../lib/inventory-rbac";
import {
  AdminSidebar,
  AuditLogTable,
  EmptyState,
  RolePermissionEditor,
  StatusBadge,
  UserDrawer,
  roleLabel,
  statusLabel,
} from "../components/inventory-workspace-ui";

type Props = {
  actor: InventoryActor;
  dashboard: CeibaInventoryDashboard;
  dailyProduction: CeibaInventoryDailyProduction[];
  initialAccounts: CeibaInventoryUserAccount[];
  operatorPerformance: CeibaInventoryOperatorPerformance[];
  reportDispatches: CeibaInventoryReportDispatch[];
  tableReady: boolean;
  tableMessage: string | null;
  section: "overview" | "users" | "roles" | "audit" | "reporting" | "settings";
};

const roleOptions: CeibaInventoryRole[] = ["admin", "supervisor", "operator"];

type PeriodKey = "today" | "week" | "month" | "custom";

type AgentAggregate = {
  login: string;
  name: string;
  cartons: number;
  dossiers: number;
  damagedCartons: number;
  damagedDossiers: number;
  total: number;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatDateDisplay(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AdminInventoryWorkspace({
  actor,
  dashboard,
  dailyProduction,
  initialAccounts,
  operatorPerformance,
  reportDispatches,
  tableReady,
  tableMessage,
  section,
}: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | CeibaInventoryRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(tableMessage);
  const [form, setForm] = useState({ assignedRoom: "", email: "", employeeId: "", jobTitle: "", login: "", name: "", password: "", phone: "", role: "operator" as CeibaInventoryRole });
  const [roleEditorRole, setRoleEditorRole] = useState<InventoryAppRole>("ADMIN_CEIBA");
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [customStart, setCustomStart] = useState(() => new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [customRolePermissions, setCustomRolePermissions] = useState<Record<InventoryAppRole, InventoryPermission[]>>({
    AGENT: rolePermissionMatrix.AGENT,
    SUPERVISEUR: rolePermissionMatrix.SUPERVISEUR,
    RESPONSABLE_CEIBA: rolePermissionMatrix.RESPONSABLE_CEIBA,
    ADMIN_CEIBA: rolePermissionMatrix.ADMIN_CEIBA,
  });

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (roleFilter !== "all" && account.role !== roleFilter) return false;
      if (statusFilter !== "all" && account.status !== statusFilter) return false;
      if (search.trim()) {
        const source = `${account.name} ${account.login}`.toLowerCase();
        if (!source.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [accounts, roleFilter, search, statusFilter]);

  const selectedRange = useMemo(() => {
    const today = new Date();
    if (period === "today") return { start: startOfDay(today), end: endOfDay(today), label: "Aujourd'hui" };

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    if (period === "week") return { start: weekStart, end: weekEnd, label: "Cette semaine" };

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    if (period === "month") return { start: monthStart, end: monthEnd, label: "Ce mois" };

    const from = customStart ? new Date(`${customStart}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), 1);
    const to = customEnd ? new Date(`${customEnd}T23:59:59`) : new Date();
    return { start: from, end: to, label: "Période personnalisée" };
  }, [customEnd, customStart, period]);

  const filteredProduction = useMemo(() => {
    if (!dailyProduction.length) return [];
    return dailyProduction.filter((entry) => {
      const value = new Date(entry.productionDate);
      return value >= selectedRange.start && value <= selectedRange.end;
    });
  }, [dailyProduction, selectedRange]);

  const productionSummary = useMemo(() => {
    const source = filteredProduction.length ? filteredProduction : dailyProduction;
    return source.reduce(
      (totals, row) => {
        totals.cartons += Number(row.cartonsCount ?? 0);
        totals.dossiers += Number(row.dossiersCount ?? 0);
        totals.damagedCartons += Number(row.damagedCartonsCount ?? 0);
        totals.damagedDossiers += Number(row.damagedDossiersCount ?? 0);
        return totals;
      },
      { cartons: 0, dossiers: 0, damagedCartons: 0, damagedDossiers: 0 },
    );
  }, [dailyProduction, filteredProduction]);

  const agentRows = useMemo<AgentAggregate[]>(() => {
    const map = new Map<string, AgentAggregate>();
    const source = filteredProduction.length ? filteredProduction : dailyProduction;

    for (const row of source) {
      const key = row.operatorLogin || row.operatorName || "inconnu";
      const current = map.get(key) ?? { login: key, name: row.operatorName || "Inconnu", cartons: 0, dossiers: 0, damagedCartons: 0, damagedDossiers: 0, total: 0 };
      current.cartons += Number(row.cartonsCount ?? 0);
      current.dossiers += Number(row.dossiersCount ?? 0);
      current.damagedCartons += Number(row.damagedCartonsCount ?? 0);
      current.damagedDossiers += Number(row.damagedDossiersCount ?? 0);
      current.total = current.cartons + current.dossiers;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [dailyProduction, filteredProduction]);

  const topAgents = agentRows.slice(0, 5);
  const maxAgentValue = Math.max(...agentRows.map((row) => row.total), 1);
  const selectedAgentRow = selectedAgent ? agentRows.find((row) => row.name === selectedAgent) ?? agentRows[0] ?? null : agentRows[0] ?? null;

  const dateSeries = useMemo(() => {
    const map = new Map<string, { cartons: number; dossiers: number; damagedCartons: number; damagedDossiers: number }>();
    const source = filteredProduction.length ? filteredProduction : dailyProduction;

    for (const row of source) {
      const key = formatDateDisplay(row.productionDate);
      const current = map.get(key) ?? { cartons: 0, dossiers: 0, damagedCartons: 0, damagedDossiers: 0 };
      current.cartons += Number(row.cartonsCount ?? 0);
      current.dossiers += Number(row.dossiersCount ?? 0);
      current.damagedCartons += Number(row.damagedCartonsCount ?? 0);
      current.damagedDossiers += Number(row.damagedDossiersCount ?? 0);
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([label, values]) => ({ label, values }));
  }, [dailyProduction, filteredProduction]);

  const nav = [
    { key: "overview", label: "Vue d'ensemble", href: "/inventaire/admin" },
    { key: "users", label: "Utilisateurs", href: "/inventaire/admin?section=users" },
    { key: "roles", label: "Roles et acces", href: "/inventaire/admin?section=roles" },
    { key: "audit", label: "Journal d'activite", href: "/inventaire/admin?section=audit" },
    { key: "reporting", label: "Suivi des envois", href: "/inventaire/admin?section=reporting" },
    { key: "settings", label: "Parametres", href: "/inventaire/admin?section=settings" },
  ];

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json() as { accounts?: CeibaInventoryUserAccount[]; message?: string };
      if (!response.ok || !payload.accounts) {
        throw new Error(payload.message || "Creation impossible");
      }
      setAccounts(payload.accounts);
      setForm({ assignedRoom: "", email: "", employeeId: "", jobTitle: "", login: "", name: "", password: "", phone: "", role: "operator" });
      setDrawerOpen(false);
      setMessage("Utilisateur cree.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Creation impossible");
    }
  }

  async function patchUser(action: "update" | "reset-password", body: Record<string, unknown>) {
    setMessage(null);
    try {
      const response = await fetch("/api/inventaire-ceiba/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await response.json() as { accounts?: CeibaInventoryUserAccount[]; message?: string };
      if (!response.ok) throw new Error(payload.message || "Operation impossible");
      if (payload.accounts) setAccounts(payload.accounts);
      setMessage(action === "reset-password" ? "Mot de passe reinitialise." : "Mise a jour enregistree.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation impossible");
    }
  }

  function togglePermission(permission: InventoryPermission) {
    setCustomRolePermissions((current) => {
      const currentSet = current[roleEditorRole];
      const exists = currentSet.includes(permission);
      return {
        ...current,
        [roleEditorRole]: exists ? currentSet.filter((item) => item !== permission) : [...currentSet, permission],
      };
    });
  }

  function exportOperatorPerformance() {
    const rows = [
      ["Operateur", "Identifiant", "Fiches creees", "Nouveau", "En revue", "Traite", "Bloque", "Taux de traitement"],
      ...operatorPerformance.map((item) => [
        item.name,
        item.login,
        String(item.totalRecords),
        String(item.newRecords),
        String(item.reviewedRecords),
        String(item.processedRecords),
        String(item.blockedRecords),
        `${item.totalRecords ? Math.round((item.processedRecords / item.totalRecords) * 100) : 0}%`,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "suivi-operateurs-ceiba.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function printOperatorPerformance() {
    window.print();
  }

  async function resendReport(period: "day" | "week" | "month") {
    setMessage(null);
    try {
      const response = await fetch("/api/inventaire-ceiba/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const payload = await response.json() as { ok?: boolean; reason?: string; sent?: number; recipients?: string[] };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Relance impossible.");
      }
      setMessage(`Rapport ${period} relance avec ${payload.sent ?? 0} destinataire(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Relance impossible.");
    }
  }

  return (
    <div className="inventory-layout">
      <AdminSidebar items={nav} activeKey={section} />

      <main className="inventory-main">
        <header className="inventory-header-card">
          <div>
            <p className="panel-label">Inventaire CEIBA</p>
            <h1>Administration des acces</h1>
          </div>
          <div className="session-chip compact">
            <span>Connecte</span>
            <strong>{actor.name}</strong>
          </div>
        </header>

        {message && <div className="inventory-banner">{message}</div>}

        {section === "overview" && (
          <>
            <section className="ceiba-panel inventory-print-hide">
              <div className="ceiba-filter-row">
                <div className="segmented-control" role="tablist" aria-label="Période du dashboard">
                  {(["today", "week", "month"]).map((option) => (
                    <button key={option} type="button" className={period === option ? "active" : ""} onClick={() => setPeriod(option as PeriodKey)}>
                      {option === "today" ? "Aujourd'hui" : option === "week" ? "Cette semaine" : "Ce mois"}
                    </button>
                  ))}
                  <button type="button" className={period === "custom" ? "active" : ""} onClick={() => setPeriod("custom")}>Personnalisé</button>
                </div>

                {period === "custom" && (
                  <div className="date-range-row">
                    <label>
                      <span>Début</span>
                      <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
                    </label>
                    <label>
                      <span>Fin</span>
                      <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
                    </label>
                  </div>
                )}
              </div>
            </section>

            <section className="ceiba-panel">
              <div className="ceiba-kpi-grid">
                <article className="ceiba-stat-card"><p>Cartons traités</p><strong>{productionSummary.cartons.toLocaleString("fr-FR")}</strong><small>{selectedRange.label}</small></article>
                <article className="ceiba-stat-card"><p>Dossiers traités</p><strong>{productionSummary.dossiers.toLocaleString("fr-FR")}</strong><small>{selectedRange.label}</small></article>
                <article className="ceiba-stat-card"><p>Cartons dégradés</p><strong>{productionSummary.damagedCartons.toLocaleString("fr-FR")}</strong><small>À surveiller</small></article>
                <article className="ceiba-stat-card"><p>Dossiers dégradés</p><strong>{productionSummary.damagedDossiers.toLocaleString("fr-FR")}</strong><small>État documentaire</small></article>
              </div>
            </section>

            <section className="ceiba-panel">
              <div className="ceiba-panel-head inventory-print-head">
                <div>
                  <p className="panel-label">Évolution de la production</p>
                  <h3>{selectedRange.label}</h3>
                </div>
                <div className="table-actions inventory-print-hide">
                  <button className="secondary-button" onClick={exportOperatorPerformance} type="button">Exporter Excel (CSV)</button>
                  <button className="primary-button" onClick={printOperatorPerformance} type="button">Exporter PDF</button>
                </div>
              </div>

              <div className="chart-bars">
                {dateSeries.length ? dateSeries.map(({ label, values }) => {
                  const height = clamp((values.cartons / Math.max(...dateSeries.map((point) => point.values.cartons), 1)) * 100, 8, 100);
                  return (
                    <div key={label} className="chart-bar-group">
                      <div className="chart-bar" style={{ height: `${height}%` }} title={`${label}: ${values.cartons} cartons`} />
                      <span>{label}</span>
                    </div>
                  );
                }) : <p className="empty-text">Aucune donnée de production disponible pour cette période.</p>}
              </div>
            </section>

            <section className="ceiba-panel">
              <div className="ceiba-panel-head">
                <div>
                  <p className="panel-label">Performance des agents</p>
                  <h3>Production par opérateur</h3>
                </div>
              </div>

              <div className="dashboard-double-column">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Agent</th><th>Cartons</th><th>Dossiers</th><th>Dégradés</th><th>Total</th></tr></thead>
                    <tbody>
                      {agentRows.map((row) => (
                        <tr key={row.login} className={selectedAgentRow?.name === row.name ? "selected-row" : ""} onClick={() => setSelectedAgent(row.name)}>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.cartons}</td>
                          <td>{row.dossiers}</td>
                          <td>{row.damagedCartons + row.damagedDossiers}</td>
                          <td>{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="chart-vertical-panel">
                  <p className="panel-label">Top opérateurs</p>
                  <div className="ranking-list">
                    {topAgents.map((row, index) => (
                      <div key={row.login} className="ranking-row">
                        <span>{index + 1}.</span>
                        <div className="ranking-bar-wrap">
                          <div className="ranking-meta">
                            <strong>{row.name}</strong>
                            <small>{row.total} points</small>
                          </div>
                          <div className="ranking-bar">
                            <i style={{ width: `${(row.total / maxAgentValue) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {selectedAgentRow && (
              <section className="ceiba-panel">
                <div className="ceiba-panel-head">
                  <div>
                    <p className="panel-label">Performance détaillée</p>
                    <h3>{selectedAgentRow.name}</h3>
                  </div>
                  <span className="production-date">Total {selectedAgentRow.total}</span>
                </div>
                <div className="agent-detail-grid">
                  <article><span>Cartons</span><strong>{selectedAgentRow.cartons}</strong></article>
                  <article><span>Dossiers</span><strong>{selectedAgentRow.dossiers}</strong></article>
                  <article><span>Cartons dégradés</span><strong>{selectedAgentRow.damagedCartons}</strong></article>
                  <article><span>Dossiers dégradés</span><strong>{selectedAgentRow.damagedDossiers}</strong></article>
                </div>
              </section>
            )}
          </>
        )}

        {section === "users" && (
          <section className="ceiba-panel">
            <div className="ceiba-panel-head">
              <div>
                <p className="panel-label">Utilisateurs</p>
                <h3>Gestion des comptes et acces</h3>
              </div>
              <button type="button" className="primary-button" onClick={() => setDrawerOpen(true)}>Ajouter un utilisateur</button>
            </div>

            {!tableReady && <EmptyState title="Comptes CEIBA indisponibles" description={tableMessage || "Verifier la connexion API ou la configuration base de donnees CEIBA."} />}

            <div className="ceiba-filter-row">
              <label>
                <span>Recherche</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou login" />
              </label>
              <label>
                <span>Role</span>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | CeibaInventoryRole)}>
                  <option value="all">Tous</option>
                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label>
                <span>Statut</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "disabled") }>
                  <option value="all">Tous</option>
                  <option value="active">Actif</option>
                  <option value="disabled">Desactive</option>
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Login</th>
                    <th>Profil operationnel</th>
                    <th>Role</th>
                    <th>Statut</th>
                    <th>Derniere connexion</th>
                    <th>Date creation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.login}</td>
                      <td>{[account.employeeId, account.jobTitle, account.assignedRoom, account.phone].filter(Boolean).join(" · ") || "Non renseigne"}</td>
                      <td>{roleLabel(account.role)}</td>
                      <td><StatusBadge status={statusLabel(account.status)} /></td>
                      <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("fr-FR") : "Jamais"}</td>
                      <td>{new Date(account.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void patchUser("update", { id: account.id, status: account.status === "active" ? "disabled" : "active" })}
                          >
                            {account.status === "active" ? "Desactiver" : "Activer"}
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void patchUser("update", { id: account.id, role: account.role === "operator" ? "supervisor" : account.role === "supervisor" ? "admin" : "operator" })}
                          >
                            Changer role
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              const password = window.prompt("Nouveau mot de passe (8 caracteres min):", "");
                              if (password) {
                                void patchUser("reset-password", { id: account.id, password });
                              }
                            }}
                          >
                            Reinit. MDP
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredAccounts.length && tableReady && (
                <EmptyState title="Aucun utilisateur" description="Utilisez le bouton Ajouter un utilisateur pour creer le premier compte." />
              )}
            </div>

            <UserDrawer open={drawerOpen} title="Ajouter un utilisateur" onClose={() => setDrawerOpen(false)}>
              <form className="ceiba-drawer-form" onSubmit={createUser}>
                <label><span>Nom et prenoms</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label><span>Matricule</span><input value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} /></label>
                <label><span>Login</span><input required value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} /></label>
                <label><span>E-mail professionnel</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label><span>Telephone</span><input inputMode="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label><span>Fonction</span><input placeholder="Ex: Agent d'inventaire" value={form.jobTitle} onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))} /></label>
                <label><span>Salle ou zone affectee</span><input placeholder="Ex: Salle 1 - Marcory" value={form.assignedRoom} onChange={(event) => setForm((current) => ({ ...current, assignedRoom: event.target.value }))} /></label>
                <label><span>Role</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as CeibaInventoryRole }))}>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                <label><span>Mot de passe provisoire</span><input required minLength={8} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <div className="ceiba-drawer-actions">
                  <button type="button" className="ghost-button" onClick={() => setDrawerOpen(false)}>Annuler</button>
                  <button type="submit" className="primary-button">Creer</button>
                </div>
              </form>
            </UserDrawer>
          </section>
        )}

        {section === "roles" && (
          <section className="ceiba-panel">
            <div className="ceiba-filter-row">
              <label>
                <span>Role cible</span>
                <select value={roleEditorRole} onChange={(event) => setRoleEditorRole(event.target.value as InventoryAppRole)}>
                  <option value="AGENT">AGENT</option>
                  <option value="SUPERVISEUR">SUPERVISEUR</option>
                  <option value="RESPONSABLE_CEIBA">RESPONSABLE_CEIBA</option>
                  <option value="ADMIN_CEIBA">ADMIN_CEIBA</option>
                </select>
              </label>
            </div>
            <RolePermissionEditor
              role={roleEditorRole}
              permissions={[...inventoryPermissions]}
              enabled={customRolePermissions[roleEditorRole]}
              onToggle={togglePermission}
            />
            <p className="capture-helper">Configuration locale de reference RBAC. Pour une persistance base de donnees, ajouter une table roles_permissions dediee.</p>
          </section>
        )}

        {section === "audit" && (
          <section className="ceiba-panel">
            <AuditLogTable
              rows={dashboard.recentRecords.slice(0, 12).map((record) => ({
                at: record.createdAt,
                actor: record.createdBy || "system",
                action: "inventory.record.created",
                description: `${record.lastName} ${record.firstNames} - ${record.commune}`,
              }))}
            />
          </section>
        )}

        {section === "reporting" && (
          <section className="ceiba-panel">
            <div className="ceiba-panel-head">
              <div>
                <p className="panel-label">Supervision operationnelle</p>
                <h3>Suivi des envois de rapports</h3>
              </div>
            </div>

            <div className="ceiba-kpi-grid">
              <article className="ceiba-stat-card"><p>Rapports envoyes</p><strong>{reportDispatches.filter((item) => item.status === "sent").length}</strong></article>
              <article className="ceiba-stat-card"><p>En echecs</p><strong>{reportDispatches.filter((item) => item.status === "failed").length}</strong></article>
              <article className="ceiba-stat-card"><p>Dernier envoi</p><strong>{reportDispatches[0]?.sentAt ? new Date(reportDispatches[0].sentAt).toLocaleDateString("fr-FR") : "Aucun"}</strong></article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Période</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Destinataires</th>
                    <th>Erreur</th>
                    <th>Envoi</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportDispatches.map((item) => (
                    <tr key={`${item.reportDate}-${item.period}`}>
                      <td>{item.period === "day" ? "Journalier" : item.period === "week" ? "Hebdomadaire" : "Mensuel"}</td>
                      <td>{new Date(`${item.reportDate}T00:00:00`).toLocaleDateString("fr-FR")}</td>
                      <td><StatusBadge status={item.status === "sent" ? "Actif" : item.status === "failed" ? "Desactive" : "En attente"} /></td>
                      <td>{item.recipientsCount}</td>
                      <td>{item.errorMessage || "Aucune"}</td>
                      <td>{item.sentAt ? new Date(item.sentAt).toLocaleString("fr-FR") : "Jamais"}</td>
                      <td>
                        <button type="button" className="ghost-button" onClick={() => void resendReport(item.period)}>
                          Relancer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!reportDispatches.length && (
                <EmptyState title="Aucun envoi registre" description="Les rapports envoyes par Resend apparaissent ici lorsque l'administration les active pour la supervision." />
              )}
            </div>
          </section>
        )}

        {section === "settings" && (
          <section className="ceiba-panel">
            <EmptyState title="Parametres du module" description="Supervision technique, options de synchronisation et securite API." />
          </section>
        )}

      </main>
    </div>
  );
}
