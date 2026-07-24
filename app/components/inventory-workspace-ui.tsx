"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { InventoryPermission } from "../../lib/inventory-rbac";
import type { CeibaInventoryRecord } from "../../lib/ceiba-inventory-types";
import type { CeibaInventoryRole, CeibaInventoryUserAccount } from "../../lib/ceiba-inventory-auth-types";

type SidebarItem = {
  key: string;
  label: string;
  href: string;
};

export function AdminSidebar({ items, activeKey }: { items: SidebarItem[]; activeKey: string }) {
  return (
    <aside className="inventory-sidebar" aria-label="Navigation administrateur">
      <div className="inventory-brand">
        <strong>CEIBA Admin</strong>
        <small>Acces et gouvernance</small>
      </div>
      <nav>
        {items.map((item) => (
          <Link key={item.key} href={item.href} className={`inventory-nav-item ${item.key === activeKey ? "active" : ""}`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function UserSidebar({ items, activeKey }: { items: SidebarItem[]; activeKey: string }) {
  return (
    <aside className="inventory-sidebar" aria-label="Navigation metier">
      <div className="inventory-brand">
        <strong>Inventaire CEIBA</strong>
        <small>Operations terrain</small>
      </div>
      <nav>
        {items.map((item) => (
          <Link key={item.key} href={item.href} className={`inventory-nav-item ${item.key === activeKey ? "active" : ""}`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function PermissionGuard({
  allowed,
  fallback,
  children,
}: {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  if (!allowed) return <>{fallback ?? <EmptyState title="Acces refuse" description="Permission manquante." />}</>;
  return <>{children}</>;
}

export function RouteGuard({
  allowed,
  children,
}: {
  allowed: boolean;
  children: ReactNode;
}) {
  if (!allowed) {
    return <EmptyState title="Acces refuse" description="Vous n'avez pas les droits pour consulter cette page." />;
  }
  return <>{children}</>;
}

export function ConnectionStatus({ online }: { online: boolean }) {
  return <span className={`inventory-chip ${online ? "ok" : "warn"}`}>{online ? "Connexion disponible" : "Hors connexion"}</span>;
}

export function SyncStatus({
  status,
}: {
  status: "idle" | "queued" | "syncing" | "synced" | "failed";
}) {
  const labels: Record<typeof status, string> = {
    failed: "Echec de synchronisation",
    idle: "Aucune synchronisation",
    queued: "Fiche en attente d'envoi",
    synced: "Synchronise",
    syncing: "Synchronisation en cours",
  };
  const tone = status === "failed" ? "warn" : status === "synced" ? "ok" : "neutral";
  return <span className={`inventory-chip ${tone}`}>{labels[status]}</span>;
}

export function FormStepper({
  steps,
  active,
  onSelect,
}: {
  steps: Array<{ id: string; label: string }>;
  active: string;
  onSelect: (id: string) => void;
}) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === active));
  const percent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <div className="inventory-stepper-wrap">
      <div className="inventory-progress-line">
        <strong>Etape {currentIndex + 1}/{steps.length}</strong>
        <span>{percent}%</span>
      </div>
      <div className="inventory-stepper">
        {steps.map((step, index) => (
          <button type="button" key={step.id} className={`inventory-step ${step.id === active ? "active" : ""}`} onClick={() => onSelect(step.id)}>
            <span>{index + 1}</span>
            <b>{step.label}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inventory-form-section">
      <h3>{title}</h3>
      <div className="inventory-form-grid">{children}</div>
    </section>
  );
}

export function StickyActions({
  onBack,
  onDraft,
  onNext,
  submitMode,
  disabled,
}: {
  onBack: () => void;
  onDraft: () => void;
  onNext: () => void;
  submitMode: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="inventory-sticky-actions">
      <button type="button" className="ghost-button" onClick={onBack}>Retour</button>
      <button type="button" className="secondary-button" onClick={onDraft}>Enregistrer comme brouillon</button>
      <button type="button" className="primary-button" onClick={onNext} disabled={disabled}>
        {submitMode ? "Soumettre la fiche" : "Continuer"}
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("rej") || normalized.includes("ech") ? "danger" : normalized.includes("att") || normalized.includes("rev") ? "warning" : "success";
  return <span className={`inventory-status ${tone}`}>{status}</span>;
}

export function InventoryTable({
  rows,
  canEdit,
  canReview,
}: {
  rows: CeibaInventoryRecord[];
  canEdit: boolean;
  canReview: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dossier</th>
            <th>Commune</th>
            <th>Auteur</th>
            <th>Creation</th>
            <th>Derniere modification</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={record.id}>
              <td>
                <strong>{record.guichetNumber || record.dduNumber || record.classificationReference || "Sans reference"}</strong>
                <span>{record.lastName} {record.firstNames}</span>
              </td>
              <td>{record.commune}</td>
              <td>{record.createdBy || "N/A"}</td>
              <td>{new Date(record.createdAt).toLocaleDateString("fr-FR")}</td>
              <td>{new Date(record.createdAt).toLocaleDateString("fr-FR")}</td>
              <td><StatusBadge status={record.status} /></td>
              <td>
                <div className="table-actions">
                  {canEdit && <button className="ghost-button" type="button">Modifier</button>}
                  {canReview && <button className="ghost-button" type="button">Verifier</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <EmptyState title="Aucune donnee" description="Aucune fiche ne correspond aux filtres." />}
    </div>
  );
}

export function UserDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="ceiba-drawer-backdrop open" onClick={onClose}>
      <aside className="ceiba-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="ceiba-drawer-head">
          <h3>{title}</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function RolePermissionEditor({
  role,
  permissions,
  enabled,
  onToggle,
}: {
  role: string;
  permissions: InventoryPermission[];
  enabled: InventoryPermission[];
  onToggle: (permission: InventoryPermission) => void;
}) {
  return (
    <section className="ceiba-panel">
      <div className="ceiba-panel-head">
        <div>
          <p className="panel-label">Role et acces</p>
          <h3>{role}</h3>
        </div>
      </div>
      <div className="inventory-permission-grid">
        {permissions.map((permission) => (
          <label key={permission} className="inventory-permission-item">
            <input
              type="checkbox"
              checked={enabled.includes(permission)}
              onChange={() => onToggle(permission)}
            />
            <span>{permission}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="ceiba-empty-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function AuditLogTable({
  rows,
}: {
  rows: Array<{ at: string; actor: string; action: string; description: string }>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Acteur</th>
            <th>Action</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={`${item.at}-${item.actor}-${item.action}`}>
              <td>{new Date(item.at).toLocaleString("fr-FR")}</td>
              <td>{item.actor}</td>
              <td>{item.action}</td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <EmptyState title="Aucune activite" />}
    </div>
  );
}

export function roleLabel(role: CeibaInventoryRole) {
  if (role === "admin") return "ADMIN_CEIBA";
  if (role === "supervisor") return "SUPERVISEUR";
  return "AGENT";
}

export function statusLabel(status: CeibaInventoryUserAccount["status"]) {
  return status === "active" ? "Actif" : "Desactive";
}
