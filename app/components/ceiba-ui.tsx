"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  LogOut,
  Map,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { CeibaInventoryRole } from "../../lib/ceiba-inventory-auth-types";

type SidebarItem = {
  id: string;
  label: string;
  caption: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Vue d'ensemble", caption: "Indicateurs CEIBA", icon: LayoutDashboard },
  { id: "new-record", label: "Nouvelle fiche", caption: "Saisie fonciere", icon: Plus },
  { id: "inventory", label: "Inventaire foncier", caption: "Registre operationnel", icon: Landmark },
  { id: "communes", label: "Communes", caption: "Activite territoriale", icon: Map },
  { id: "activities", label: "Activites", caption: "Suivi par statut", icon: Gauge },
  { id: "users", label: "Utilisateurs CEIBA", caption: "Comptes dedies", icon: Users },
  { id: "settings", label: "Parametres", caption: "Config module", icon: Settings },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onNavigate: (id: string) => void;
  user: { name: string; login: string; role: CeibaInventoryRole };
  onLogout: () => void;
  canManageUsers: boolean;
  questionnaireOnly?: boolean;
};

export function AppSidebar({ collapsed, onToggle, activeSection, onNavigate, user, onLogout, canManageUsers, questionnaireOnly = false }: AppSidebarProps) {
  const visibleItems = questionnaireOnly
    ? sidebarItems.filter((item) => item.id === "new-record" || item.id === "inventory")
    : user.role === "supervisor"
      ? sidebarItems.filter((item) => item.id === "overview" || item.id === "inventory" || item.id === "communes" || item.id === "activities")
    : canManageUsers
      ? sidebarItems
      : sidebarItems.filter((item) => item.id !== "users" && item.id !== "settings");

  return (
    <aside className={`ceiba-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Navigation CEIBA">
      <div className="ceiba-sidebar-brand">
        <div className="brand-mark">CI</div>
        {!collapsed && (
          <div>
            <p className="eyebrow">CEIBA Inventory</p>
            <strong>Plateforme fonciere</strong>
          </div>
        )}
      </div>

      <button type="button" className="ceiba-sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Ouvrir la sidebar" : "Replier la sidebar"}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="ceiba-nav" aria-label="Menu principal">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`ceiba-nav-item ${active ? "active" : ""}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <span className="ceiba-nav-icon"><Icon size={15} /></span>
              {!collapsed && (
                <span className="ceiba-nav-copy">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ceiba-sidebar-footer">
        {!collapsed && (
          <>
            <div className="session-chip">
              <span>{user.role}</span>
              <strong>{user.name}</strong>
              <small>{user.login}</small>
            </div>
            <div className="ceiba-sidebar-footer-actions">
              <button className="secondary-button" type="button" onClick={onLogout}>
                <LogOut size={15} />
                Se deconnecter
              </button>
              <Link className="secondary-button" href="/">
                <ShieldCheck size={15} />
                Retour GeoArchives
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

type TopHeaderProps = {
  title: string;
  breadcrumb: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreateRecord: () => void;
  userName: string;
  showCreateAction?: boolean;
};

export function TopHeader({ title, breadcrumb, searchValue, onSearchChange, onCreateRecord, userName, showCreateAction = true }: TopHeaderProps) {
  return (
    <header className="ceiba-topbar">
      <div>
        <p className="eyebrow">{breadcrumb}</p>
        <h1>{title}</h1>
      </div>
      <div className="ceiba-topbar-actions">
        <label className="ceiba-searchbox">
          <Search size={16} />
          <input
            aria-label="Recherche globale"
            placeholder="Rechercher une fiche, commune, contact..."
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        {showCreateAction && (
          <button type="button" className="primary-button" onClick={onCreateRecord}>
            <Plus size={16} />
            Nouvelle fiche
          </button>
        )}
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={16} />
        </button>
        <div className="session-chip compact">
          <span>Connecte</span>
          <strong>{userName}</strong>
        </div>
      </div>
    </header>
  );
}

type PageHeaderProps = {
  title: string;
  description: string;
  onCreateRecord: () => void;
  showCreateAction?: boolean;
};

export function PageHeader({ title, description, onCreateRecord, showCreateAction = true }: PageHeaderProps) {
  return (
    <section className="ceiba-page-hero">
      <div>
        <p className="eyebrow">Source de collecte</p>
        <h2>{title}</h2>
        <p className="view-description">{description}</p>
      </div>
      <div className="ceiba-page-hero-actions">
        {showCreateAction && (
          <button type="button" className="primary-button" onClick={onCreateRecord}>
            <Plus size={16} />
            Creer une fiche
          </button>
        )}
        <button type="button" className="secondary-button">
          <FileText size={16} />
          Exporter
        </button>
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  loading?: boolean;
};

export function StatCard({ label, value, detail, icon: Icon, loading }: StatCardProps) {
  return (
    <article className="ceiba-stat-card" aria-busy={loading ? "true" : "false"}>
      <div className="ceiba-stat-head">
        <span className="ceiba-stat-icon"><Icon size={16} /></span>
        <p>{label}</p>
      </div>
      {loading ? <div className="ceiba-skeleton ceiba-skeleton-lg" /> : <strong>{value}</strong>}
      <small>{detail}</small>
    </article>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase();
  const className = tone.includes("blo") || tone.includes("disabled")
    ? "danger"
    : tone.includes("rev") || tone.includes("nou")
      ? "warning"
      : "success";
  return <span className={`ceiba-status-badge ${className}`}>{status}</span>;
}

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="ceiba-empty-state" role="status">
      <CircleHelp size={20} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionLabel && onAction && (
        <button type="button" className="secondary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

type TechnicalAlertProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function TechnicalAlert({ title, description, actionLabel, onAction }: TechnicalAlertProps) {
  return (
    <div className="ceiba-technical-alert" role="alert">
      <div className="ceiba-technical-icon"><AlertTriangle size={18} /></div>
      <div className="ceiba-technical-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionLabel && onAction && (
        <button type="button" className="secondary-button" onClick={onAction}>
          <Database size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

type FormSectionProps = {
  id: string;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function FormSection({ id, title, description, open, onToggle, children }: FormSectionProps) {
  return (
    <section id={id} className="ceiba-form-section">
      <button className="ceiba-form-section-head" type="button" onClick={onToggle} aria-expanded={open}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={`chevron ${open ? "open" : ""}`}>⌄</span>
      </button>
      {open && <div className="ceiba-form-section-body">{children}</div>}
    </section>
  );
}

type FormStepperProps = {
  sections: Array<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
};

export function FormStepper({ sections, activeId, onSelect }: FormStepperProps) {
  return (
    <nav className="ceiba-stepper" aria-label="Etapes de formulaire">
      {sections.map((section, index) => (
        <button key={section.id} className={`ceiba-step ${activeId === section.id ? "active" : ""}`} type="button" onClick={() => onSelect(section.id)}>
          <span>{index + 1}</span>
          <strong>{section.label}</strong>
        </button>
      ))}
    </nav>
  );
}

type StickyFormActionsProps = {
  saveDisabled?: boolean;
  draftDisabled?: boolean;
  onDraft: () => void;
  onCancel: () => void;
  submitLabel: string;
  draftLabel: string;
  savingLabel: string;
  isSaving: boolean;
};

export function StickyFormActions({
  saveDisabled,
  draftDisabled,
  onDraft,
  onCancel,
  submitLabel,
  draftLabel,
  savingLabel,
  isSaving,
}: StickyFormActionsProps) {
  return (
    <div className="ceiba-sticky-actions">
      <button type="button" className="secondary-button" onClick={onDraft} disabled={draftDisabled}>
        {draftLabel}
      </button>
      <button type="button" className="ghost-button" onClick={onCancel}>
        Annuler
      </button>
      <button type="submit" className="primary-button" disabled={saveDisabled}>
        {isSaving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

type UserDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function UserDrawer({ open, onClose, children }: UserDrawerProps) {
  return (
    <div className={`ceiba-drawer-backdrop ${open ? "open" : ""}`} aria-hidden={open ? "false" : "true"}>
      <aside className="ceiba-drawer" role="dialog" aria-modal="true" aria-label="Ajouter un utilisateur CEIBA">
        <div className="ceiba-drawer-head">
          <h3>Ajouter un utilisateur</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
