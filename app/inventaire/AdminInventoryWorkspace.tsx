"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CeibaInventoryDashboard } from "../../lib/ceiba-inventory-types";
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
  initialAccounts: CeibaInventoryUserAccount[];
  tableReady: boolean;
  tableMessage: string | null;
  section: "overview" | "users" | "roles" | "audit" | "settings";
};

const roleOptions: CeibaInventoryRole[] = ["admin", "supervisor", "operator"];

export default function AdminInventoryWorkspace({
  actor,
  dashboard,
  initialAccounts,
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
  const [form, setForm] = useState({ login: "", name: "", password: "", role: "operator" as CeibaInventoryRole });
  const [roleEditorRole, setRoleEditorRole] = useState<InventoryAppRole>("ADMIN_CEIBA");
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

  const nav = [
    { key: "overview", label: "Vue d'ensemble", href: "/inventaire/admin" },
    { key: "users", label: "Utilisateurs", href: "/inventaire/admin?section=users" },
    { key: "roles", label: "Roles et acces", href: "/inventaire/admin?section=roles" },
    { key: "audit", label: "Journal d'activite", href: "/inventaire/admin?section=audit" },
    { key: "settings", label: "Parametres", href: "/inventaire/admin?section=settings" },
    { key: "back", label: "Retour GeoArchives", href: "/" },
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
      setForm({ login: "", name: "", password: "", role: "operator" });
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
          <section className="ceiba-panel">
            <div className="ceiba-kpi-grid">
              <article className="ceiba-stat-card"><p>Total comptes</p><strong>{accounts.length}</strong></article>
              <article className="ceiba-stat-card"><p>Comptes actifs</p><strong>{accounts.filter((account) => account.status === "active").length}</strong></article>
              <article className="ceiba-stat-card"><p>Fiches total</p><strong>{dashboard.totalRecords}</strong></article>
              <article className="ceiba-stat-card"><p>Fiches en attente</p><strong>{dashboard.newRecords + dashboard.reviewedRecords}</strong></article>
            </div>
          </section>
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

            {!tableReady && <EmptyState title="Table utilisateurs indisponible" description={tableMessage || "Initialiser la table CEIBA utilisateurs."} />}

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
            </div>

            <UserDrawer open={drawerOpen} title="Ajouter un utilisateur" onClose={() => setDrawerOpen(false)}>
              <form className="ceiba-drawer-form" onSubmit={createUser}>
                <label><span>Utilisateur</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label><span>Login</span><input required value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} /></label>
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

        {section === "settings" && (
          <section className="ceiba-panel">
            <EmptyState title="Parametres du module" description="Supervision technique, options de synchronisation et securite API." />
          </section>
        )}

        <footer className="inventory-footer-links">
          <Link href="/inventaire">Espace metier</Link>
          <Link href="/inventaire/registre">Registre</Link>
          <Link href="/">Retour GeoArchives</Link>
        </footer>
      </main>
    </div>
  );
}
