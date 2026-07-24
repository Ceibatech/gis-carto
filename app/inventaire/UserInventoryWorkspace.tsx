"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CeibaInventoryDashboard, CeibaInventoryInput, CeibaInventoryRecord, CeibaInventoryStatusLabel } from "../../lib/ceiba-inventory-types";
import type { InventoryActor, InventoryPermission } from "../../lib/inventory-rbac";
import {
  ConnectionStatus,
  EmptyState,
  FormSection,
  FormStepper,
  InventoryTable,
  PermissionGuard,
  StickyActions,
  SyncStatus,
  UserSidebar,
} from "../components/inventory-workspace-ui";

const statusOptions: CeibaInventoryStatusLabel[] = ["Nouveau", "En revue", "Traité", "Bloqué"];

type DraftQueueItem = {
  localId: string;
  payload: CeibaInventoryInput;
  status: "queued" | "syncing" | "synced" | "failed";
  createdAt: string;
  updatedAt: string;
  serverCreatedAt?: string;
};

const defaultForm: CeibaInventoryInput = {
  address: "",
  caseNature: "",
  classificationReference: "",
  commune: "",
  contactMobile: "",
  contactPerson: "",
  dduNumber: "",
  email: "",
  firstNames: "",
  guichetNumber: "",
  housingEstate: "",
  ilotNumber: "",
  landTitleNumber: "",
  lastName: "",
  lotNumber: "",
  notes: "",
  phone: "",
  status: "Nouveau",
  surfaceArea: "",
};

const stepDefs = [
  { id: "identification", label: "Identification du guichet" },
  { id: "references", label: "References foncieres" },
  { id: "localisation", label: "Localisation" },
  { id: "demandeur", label: "Informations du demandeur" },
  { id: "dossier", label: "Nature du dossier" },
  { id: "documents", label: "Documents et observations" },
  { id: "validation", label: "Verification et validation" },
] as const;

type StepId = (typeof stepDefs)[number]["id"];

type Props = {
  actor: InventoryActor;
  dashboard: CeibaInventoryDashboard;
  view: "dashboard" | "registre";
};

function has(permissions: InventoryPermission[], permission: InventoryPermission) {
  return permissions.includes(permission);
}

export default function UserInventoryWorkspace({ actor, dashboard, view }: Props) {
  const searchParams = useSearchParams();
  const [online, setOnline] = useState(true);
  const [syncState, setSyncState] = useState<"idle" | "queued" | "syncing" | "synced" | "failed">("idle");
  const [banner, setBanner] = useState<string | null>(null);
  const [form, setForm] = useState<CeibaInventoryInput>(defaultForm);
  const [activeStep, setActiveStep] = useState<StepId>(stepDefs[0].id);
  const [queue, setQueue] = useState<DraftQueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CeibaInventoryStatusLabel>("all");
  const [communeFilter, setCommuneFilter] = useState("all");
  const [page, setPage] = useState(1);

  const canCreate = has(actor.permissions, "inventory.record.create");
  const canReadAll = has(actor.permissions, "inventory.record.read_all");
  const canReadOwn = has(actor.permissions, "inventory.record.read_own");
  const canEditOwn = has(actor.permissions, "inventory.record.update_own");
  const canEditAll = has(actor.permissions, "inventory.record.update_all");
  const canReview = has(actor.permissions, "inventory.record.review");
  const canSubmit = has(actor.permissions, "inventory.record.submit");
  const isOverviewTab = searchParams.get("tab") === "overview";

  const queueKey = `inventory-ceiba-queue-${actor.login}`;
  const draftKey = `inventory-ceiba-draft-${actor.login}`;

  const sidebarItems = useMemo(() => {
    const items: Array<{ key: string; label: string; href: string }> = [];
    if (canCreate) items.push({ key: "new", label: "Nouvelle fiche", href: "/inventaire" });
    if (canCreate) items.push({ key: "drafts", label: "Mes brouillons", href: "/inventaire" });
    if (canReadOwn || canReadAll) items.push({ key: "records", label: "Mes fiches", href: "/inventaire/registre" });
    if (has(actor.permissions, "inventory.dashboard.view")) items.push({ key: "overview", label: "Vue d'ensemble", href: "/inventaire?tab=overview" });
    if (has(actor.permissions, "inventory.record.export")) items.push({ key: "export", label: "Export", href: "/inventaire/registre" });
    return items;
  }, [actor.permissions, canCreate, canReadAll, canReadOwn]);

  const filteredRecords = useMemo(() => {
    return dashboard.recentRecords.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (communeFilter !== "all" && record.commune !== communeFilter) return false;
      if (!canReadAll && canReadOwn && record.createdBy?.toLowerCase() !== actor.login.toLowerCase()) return false;
      if (!canReadAll && !canReadOwn) return false;
      if (search.trim()) {
        const haystack = `${record.guichetNumber} ${record.dduNumber} ${record.lastName} ${record.firstNames} ${record.commune} ${record.classificationReference}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [actor.login, canReadAll, canReadOwn, communeFilter, dashboard.recentRecords, search, statusFilter]);

  const communes = useMemo(() => {
    return Array.from(new Set(dashboard.recentRecords.map((item) => item.commune).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dashboard.recentRecords]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRows = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        setForm({ ...defaultForm, ...(JSON.parse(rawDraft) as Partial<CeibaInventoryInput>) });
        setBanner("Brouillon restaure sur cet appareil.");
      }
      const rawQueue = localStorage.getItem(queueKey);
      if (rawQueue) {
        const restored = JSON.parse(rawQueue) as DraftQueueItem[];
        setQueue(restored);
        if (restored.some((item) => item.status === "queued" || item.status === "failed")) {
          setSyncState("queued");
        }
      }
    } catch {
      setBanner("Impossible de restaurer certaines donnees locales.");
    }
  }, [draftKey, queueKey]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [draftKey, form]);

  useEffect(() => {
    localStorage.setItem(queueKey, JSON.stringify(queue));
  }, [queue, queueKey]);

  useEffect(() => {
    if (online) {
      void syncPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function syncPending() {
    const pending = queue.filter((item) => item.status === "queued" || item.status === "failed");
    if (!pending.length) return;

    setSyncState("syncing");
    setQueue((current) => current.map((item) => (item.status === "queued" || item.status === "failed") ? { ...item, status: "syncing" } : item));

    for (const item of pending) {
      try {
        const response = await fetch("/api/inventaire-ceiba", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (!response.ok) throw new Error("Echec synchronisation");
        setQueue((current) => current.map((entry) => entry.localId === item.localId ? { ...entry, status: "synced", serverCreatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : entry));
      } catch {
        setQueue((current) => current.map((entry) => entry.localId === item.localId ? { ...entry, status: "failed", updatedAt: new Date().toISOString() } : entry));
      }
    }

    const hasFailure = queue.some((item) => item.status === "failed");
    setSyncState(hasFailure ? "failed" : "synced");
    setBanner(hasFailure ? "Certaines fiches n'ont pas pu etre synchronisees." : "Synchronisation terminee.");
  }

  function queueCurrentDraft() {
    const timestamp = new Date().toISOString();
    const next: DraftQueueItem = {
      localId: crypto.randomUUID(),
      payload: form,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setQueue((current) => {
      const duplicate = current.find((item) => JSON.stringify(item.payload) === JSON.stringify(next.payload) && item.status !== "synced");
      if (duplicate) return current;
      return [...current, next];
    });
    setSyncState("queued");
    setBanner("Fiche enregistree sur cet appareil.");
  }

  async function submitCurrentDraft() {
    if (!canSubmit) {
      setBanner("Permission de soumission manquante.");
      return;
    }

    if (!online) {
      queueCurrentDraft();
      return;
    }

    try {
      const response = await fetch("/api/inventaire-ceiba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Erreur API");
      setBanner("Fiche soumise et synchronisee.");
      setSyncState("synced");
      setForm(defaultForm);
      localStorage.removeItem(draftKey);
    } catch {
      queueCurrentDraft();
      setSyncState("failed");
      setBanner("Echec de synchronisation, fiche gardee localement.");
    }
  }

  function update<K extends keyof CeibaInventoryInput>(key: K, value: CeibaInventoryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    const index = stepDefs.findIndex((step) => step.id === activeStep);
    if (index >= stepDefs.length - 1) {
      void submitCurrentDraft();
      return;
    }
    setActiveStep(stepDefs[index + 1].id);
  }

  function prevStep() {
    const index = stepDefs.findIndex((step) => step.id === activeStep);
    if (index <= 0) return;
    setActiveStep(stepDefs[index - 1].id);
  }

  const activeKey = view === "registre" ? "records" : (isOverviewTab ? "overview" : "new");

  return (
    <div className="inventory-layout">
      <UserSidebar items={sidebarItems} activeKey={activeKey} />

      <main className="inventory-main">
        <header className="inventory-header-card">
          <div>
            <p className="panel-label">Inventaire CEIBA</p>
            <h1>{view === "registre" ? "Registre des fiches" : "Nouvelle fiche"}</h1>
          </div>
          <div className="inventory-status-row">
            <ConnectionStatus online={online} />
            <SyncStatus status={syncState} />
          </div>
        </header>

        {banner && <div className="inventory-banner">{banner}</div>}

        {view === "dashboard" && isOverviewTab && has(actor.permissions, "inventory.dashboard.view") && (
          <section className="ceiba-panel">
            <div className="ceiba-kpi-grid">
              <article className="ceiba-stat-card"><p>Total des fiches</p><strong>{dashboard.totalRecords}</strong></article>
              <article className="ceiba-stat-card"><p>En attente</p><strong>{dashboard.newRecords + dashboard.reviewedRecords}</strong></article>
              <article className="ceiba-stat-card"><p>Validees</p><strong>{dashboard.processedRecords}</strong></article>
              <article className="ceiba-stat-card"><p>Rejetees</p><strong>{dashboard.blockedRecords}</strong></article>
              <article className="ceiba-stat-card"><p>En attente sync</p><strong>{queue.filter((item) => item.status === "queued" || item.status === "failed").length}</strong></article>
            </div>
            <div className="ceiba-analytics-grid">
              <article className="ceiba-panel-sub">
                <h3>Activite recente</h3>
                <InventoryTable rows={dashboard.recentRecords.slice(0, 6)} canEdit={canEditAll || canEditOwn} canReview={canReview} />
              </article>
            </div>
          </section>
        )}

        {view === "registre" && (
          <section className="ceiba-panel">
            <div className="ceiba-filter-row">
              <label>
                <span>Recherche</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Numero, nom, commune, reference" />
              </label>
              <label>
                <span>Statut</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | CeibaInventoryStatusLabel)}>
                  <option value="all">Tous</option>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span>Commune</span>
                <select value={communeFilter} onChange={(event) => setCommuneFilter(event.target.value)}>
                  <option value="all">Toutes</option>
                  {communes.map((commune) => <option key={commune} value={commune}>{commune}</option>)}
                </select>
              </label>
            </div>

            <InventoryTable rows={pageRows} canEdit={canEditAll || canEditOwn} canReview={canReview} />
            <div className="inventory-pagination">
              <button type="button" className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Precedent</button>
              <span>Page {page}/{totalPages}</span>
              <button type="button" className="ghost-button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Suivant</button>
            </div>
          </section>
        )}

        {view === "dashboard" && (
          <PermissionGuard allowed={canCreate} fallback={<EmptyState title="Formulaire indisponible" description="Votre role ne permet pas la creation de fiche." />}>
            <section className="ceiba-panel">
              <FormStepper steps={stepDefs.map((step) => ({ id: step.id, label: step.label }))} active={activeStep} onSelect={(id) => setActiveStep(id as StepId)} />

              {activeStep === "identification" && (
                <FormSection title="Identification du guichet">
                  <label><span>N guichet</span><input value={form.guichetNumber} onChange={(event) => update("guichetNumber", event.target.value)} /></label>
                  <label><span>N DDU</span><input value={form.dduNumber} onChange={(event) => update("dduNumber", event.target.value)} /></label>
                  <label className="wide"><span>Reference de classement</span><input value={form.classificationReference} onChange={(event) => update("classificationReference", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "references" && (
                <FormSection title="References foncieres">
                  <label><span>Ilot</span><input value={form.ilotNumber} onChange={(event) => update("ilotNumber", event.target.value)} /></label>
                  <label><span>Lot</span><input value={form.lotNumber} onChange={(event) => update("lotNumber", event.target.value)} /></label>
                  <label><span>Superficie</span><input value={form.surfaceArea} onChange={(event) => update("surfaceArea", event.target.value)} /></label>
                  <label><span>Titre foncier</span><input value={form.landTitleNumber} onChange={(event) => update("landTitleNumber", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "localisation" && (
                <FormSection title="Localisation">
                  <label><span>Commune</span><input value={form.commune} onChange={(event) => update("commune", event.target.value)} /></label>
                  <label className="wide"><span>Adresse</span><input value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
                  <label className="wide"><span>Lotissement</span><input value={form.housingEstate} onChange={(event) => update("housingEstate", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "demandeur" && (
                <FormSection title="Informations du demandeur">
                  <label><span>Nom</span><input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
                  <label><span>Prenoms</span><input value={form.firstNames} onChange={(event) => update("firstNames", event.target.value)} /></label>
                  <label><span>Telephone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                  <label><span>Email</span><input value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
                  <label><span>Contact</span><input value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} /></label>
                  <label><span>Mobile contact</span><input value={form.contactMobile} onChange={(event) => update("contactMobile", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "dossier" && (
                <FormSection title="Nature du dossier">
                  <label className="wide"><span>Nature du dossier</span><input value={form.caseNature} onChange={(event) => update("caseNature", event.target.value)} /></label>
                  <label><span>Statut</span><select value={form.status} onChange={(event) => update("status", event.target.value as CeibaInventoryStatusLabel)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                </FormSection>
              )}

              {activeStep === "documents" && (
                <FormSection title="Documents et observations">
                  <label className="wide"><span>Notes</span><textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "validation" && (
                <FormSection title="Verification et validation">
                  <article className="inventory-check-card">
                    <p>{form.commune ? "Commune renseignee" : "Commune manquante"}</p>
                    <p>{form.caseNature ? "Nature du dossier renseignee" : "Nature du dossier manquante"}</p>
                    <p>{form.lastName && form.firstNames ? "Demandeur renseigne" : "Demandeur incomplet"}</p>
                  </article>
                </FormSection>
              )}

              <StickyActions
                onBack={prevStep}
                onDraft={queueCurrentDraft}
                onNext={nextStep}
                submitMode={activeStep === "validation"}
              />
            </section>
          </PermissionGuard>
        )}

        <footer className="inventory-footer-links">
          <Link href="/inventaire/registre">Registre</Link>
          <Link href="/inventaire/admin">Administration</Link>
          <Link href="/">Retour GeoArchives</Link>
        </footer>
      </main>
    </div>
  );
}
