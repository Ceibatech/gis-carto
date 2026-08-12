"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CeibaInventoryDailyProduction, CeibaInventoryDashboard, CeibaInventoryOperatorPerformance, CeibaInventoryReportDispatch } from "../../lib/ceiba-inventory-types";
import type { CeibaInventoryRole, CeibaInventoryUserAccount } from "../../lib/ceiba-inventory-auth-types";
import { hasInventoryPermission, inventoryPermissions, rolePermissionMatrix, type InventoryActor, type InventoryAppRole, type InventoryPermission } from "../../lib/inventory-rbac";
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
  section: "dashboard" | "users";
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
  const canManageUsers = hasInventoryPermission(actor.permissions, "inventory.users.manage");
  const canManageRoles = hasInventoryPermission(actor.permissions, "inventory.roles.manage");
  const canViewAudit = hasInventoryPermission(actor.permissions, "inventory.audit.view");
  const canExportReports = hasInventoryPermission(actor.permissions, "inventory.record.export");
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
    { key: "dashboard", label: "Dashboard business", href: "/inventaire/admin?section=dashboard" },
    ...(canManageUsers ? [{ key: "users", label: "Comptes", href: "/inventaire/admin?section=users" }] : []),
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
            <h1>{section === "dashboard" ? "Dashboard business" : "Gestion des comptes"}</h1>
          </div>
          <div className="session-chip compact">
            <span>Connecte</span>
            <strong>{actor.name}</strong>
          </div>
        </header>

        {message && <div className="inventory-banner">{message}</div>}

        {section === "users" && (
          <section className="ceiba-panel">
            <div className="ceiba-panel-head">
              <div>
                <p className="panel-label">Acces et comptes</p>
                <h3>Gestion des comptes</h3>
              </div>
            </div>

            <div className="dashboard-double-column">
              <form className="inventory-form-grid" onSubmit={createUser}>
                <label>
                  <span>Nom complet</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Agent Abidjan"
                  />
                </label>
                <label>
                  <span>Login / email</span>
                  <input
                    value={form.login}
                    onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
                    placeholder="agent@ceiba-analytics.com"
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as CeibaInventoryRole }))}
                  >
                    {roleOptions.map((option) => (
                      <option key={option} value={option}>{option === "admin" ? "Admin" : option === "supervisor" ? "Superviseur" : "Agent"}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Mot de passe provisoire</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="8 caracteres minimum"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="nom@ceiba-analytics.com"
                  />
                </label>
                <label>
                  <span>Poste / fonction</span>
                  <input
                    value={form.jobTitle}
                    onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
                    placeholder="Agent terrain"
                  />
                </label>
                <label>
                  <span>Piece / identifiant</span>
                  <input
                    value={form.employeeId}
                    onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                    placeholder="EMP-001"
                  />
                </label>
                <label>
                  <span>Telephone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+225 ..."
                  />
                </label>
                <label>
                  <span>Chambre / site</span>
                  <input
                    value={form.assignedRoom}
                    onChange={(event) => setForm((current) => ({ ...current, assignedRoom: event.target.value }))}
                    placeholder="Abidjan"
                  />
                </label>

                <div className="table-actions">
                  <button type="submit" className="primary-button">Creer le compte</button>
                </div>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Role</th>
                      <th>Statut</th>
                      <th>Creation</th>
                      <th>Derniere connexion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.login}>
                        <td>
                          <strong>{account.name}</strong>
                          <span>{account.login}</span>
                        </td>
                        <td>{account.role}</td>
                        <td>{account.status === "active" ? "Actif" : "Desactive"}</td>
                        <td>{new Date(account.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleDateString("fr-FR") : "Jamais"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredAccounts.length && <p className="empty-text">Aucun compte correspondant a ce filtre.</p>}
              </div>
            </div>
          </section>
        )}

        {section === "dashboard" && (
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
              <div className="ceiba-panel-head">
                <div>
                  <p className="panel-label">Synthèse</p>
                  <h3>Production globale</h3>
                </div>
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


      </main>
    </div>
  );
}
