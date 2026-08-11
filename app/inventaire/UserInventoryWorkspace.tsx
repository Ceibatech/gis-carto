"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  barcode: "",
  boxLabel: "",
  cartonDamaged: false,
  cartonDamageType: "",
  cartonId: "",
  cartonState: "Bon",
  caseNature: "",
  classificationReference: "",
  commune: "",
  contactMobile: "",
  contactPerson: "",
  dduNumber: "",
  dossierDamaged: false,
  dossierDamageType: "",
  dossierState: "Bon",
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
  status: "Traité",
  surfaceArea: "",
};

const stepDefs = [
  { id: "carton", label: "Carton et references" },
  { id: "dossier", label: "Foncier et dossier" },
  { id: "coordonnees", label: "Titulaire et contacts" },
  { id: "validation", label: "Statut et validation" },
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
    if (canCreate) items.push({ key: "new", label: "Fiche inventaire opérateurs", href: "/inventaire" });
    if (canCreate) items.push({ key: "daily", label: "Remontee journaliere", href: "/inventaire/remontee" });
    if (canCreate) items.push({ key: "drafts", label: "Mes brouillons", href: "/inventaire" });
    if (canReadOwn || canReadAll) items.push({ key: "records", label: "Mes fiches", href: "/inventaire/registre" });
    if (has(actor.permissions, "inventory.dashboard.view")) items.push({ key: "overview", label: "Vue d'ensemble", href: "/inventaire?tab=overview" });
    if (canReadAll) items.push({ key: "production", label: "Pilotage production", href: "/inventaire/production" });
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

  // syncPending lit la file via une ref: la version precedente capturait le
  // `queue` du rendu, donc les brouillons restaures depuis localStorage
  // n'etaient jamais repris au chargement, et le bilan final etait calcule
  // sur l'etat d'avant la boucle.
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const syncPending = useCallback(async () => {
    const pending = queueRef.current.filter((item) => item.status === "queued" || item.status === "failed");
    if (!pending.length) return;

    setSyncState("syncing");
    setQueue((current) => current.map((item) => (item.status === "queued" || item.status === "failed") ? { ...item, status: "syncing" } : item));

    let hasFailure = false;

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
        hasFailure = true;
        setQueue((current) => current.map((entry) => entry.localId === item.localId ? { ...entry, status: "failed", updatedAt: new Date().toISOString() } : entry));
      }
    }

    setSyncState(hasFailure ? "failed" : "synced");
    setBanner(hasFailure ? "Certaines fiches n'ont pas pu etre synchronisees." : "Synchronisation terminee.");
  }, []);

  // Se declenche aussi quand la file passe de vide a non vide, ce qui couvre
  // les brouillons restaures apres le premier rendu. On n'observe que les
  // elements "queued": relancer sur "failed" boucherait en boucle de retry.
  const hasQueuedDrafts = queue.some((item) => item.status === "queued");

  useEffect(() => {
    if (online && hasQueuedDrafts) {
      void syncPending();
    }
  }, [hasQueuedDrafts, online, syncPending]);

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
            <p className="panel-label">Registre terrain</p>
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
            <section className="inventory-draft-summary">
              <div>
                <p>Saisie terrain en cours</p>
                <strong>{form.guichetNumber || form.dduNumber || form.classificationReference || "Nouvelle fiche CEIBA"}</strong>
              </div>
              <span>{online ? "Sauvegarde locale active" : "Mode hors connexion"}</span>
            </section>

            <section className="ceiba-panel inventory-entry-workspace">
              <FormStepper steps={stepDefs.map((step) => ({ id: step.id, label: step.label }))} active={activeStep} onSelect={(id) => setActiveStep(id as StepId)} />

              {activeStep === "carton" && (
                <FormSection title="1. Identification du carton">
                  <label><span>ID unique du carton</span><input value={form.cartonId} onChange={(event) => update("cartonId", event.target.value)} placeholder="CART-0001" /></label>
                  <label><span>Libelle du carton</span><input value={form.boxLabel} onChange={(event) => update("boxLabel", event.target.value)} /></label>
                  <label><span>Code barre</span><input value={form.barcode} onChange={(event) => update("barcode", event.target.value)} /></label>
                  <label><span>N° guichet</span><input value={form.guichetNumber} onChange={(event) => update("guichetNumber", event.target.value)} /></label>
                  <label><span>N° DDU</span><input value={form.dduNumber} onChange={(event) => update("dduNumber", event.target.value)} /></label>
                  <label><span>État du carton</span><select value={form.cartonState} onChange={(event) => update("cartonState", event.target.value as CeibaInventoryInput["cartonState"])}><option value="Bon">Bon</option><option value="À vérifier">À vérifier</option><option value="Dégradé">Dégradé</option><option value="Mauvais état">Mauvais état</option></select></label>
                  <label><span>Carton endommagé ?</span><select value={String(form.cartonDamaged)} onChange={(event) => update("cartonDamaged", event.target.value === "true")}><option value="false">Non</option><option value="true">Oui</option></select></label>
                  <label><span>Type de dégradation</span><input value={form.cartonDamageType} onChange={(event) => update("cartonDamageType", event.target.value)} placeholder="Fissure, humide, déchirure..." /></label>
                  <label className="wide"><span>Reference de classement</span><input value={form.classificationReference} onChange={(event) => update("classificationReference", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "dossier" && (
                <FormSection title="2. References foncieres et dossier">
                  <label><span>N° ilot</span><input value={form.ilotNumber} onChange={(event) => update("ilotNumber", event.target.value)} /></label>
                  <label><span>N° lot</span><input value={form.lotNumber} onChange={(event) => update("lotNumber", event.target.value)} /></label>
                  <label><span>Superficie</span><input value={form.surfaceArea} onChange={(event) => update("surfaceArea", event.target.value)} /></label>
                  <label><span>N° titre foncier</span><input value={form.landTitleNumber} onChange={(event) => update("landTitleNumber", event.target.value)} /></label>
                  <label><span>Lotissement</span><input value={form.housingEstate} onChange={(event) => update("housingEstate", event.target.value)} /></label>
                  <label>
                    <span>Commune(s)</span>
                    <select value={form.commune} onChange={(event) => update("commune", event.target.value)}>
                      <option value="">Choisir une commune</option>
                      {communes.length ? communes.map((commune) => (
                        <option key={commune} value={commune}>{commune}</option>
                      )) : (form.commune ? <option value={form.commune}>{form.commune}</option> : null)}
                    </select>
                  </label>
                  <label><span>État du dossier</span><select value={form.dossierState} onChange={(event) => update("dossierState", event.target.value as CeibaInventoryInput["dossierState"])}><option value="Bon">Bon</option><option value="À vérifier">À vérifier</option><option value="Dégradé">Dégradé</option><option value="Mauvais état">Mauvais état</option></select></label>
                  <label><span>Dossier endommagé ?</span><select value={String(form.dossierDamaged)} onChange={(event) => update("dossierDamaged", event.target.value === "true")}><option value="false">Non</option><option value="true">Oui</option></select></label>
                  <label><span>Type de dégradation dossier</span><input value={form.dossierDamageType} onChange={(event) => update("dossierDamageType", event.target.value)} placeholder="Humidité, pagination, déchirure..." /></label>
                  <label className="wide"><span>Nature de dossier</span><input value={form.caseNature} onChange={(event) => update("caseNature", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "coordonnees" && (
                <FormSection title="3. Titulaire et coordonnees">
                  <label><span>Nom</span><input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
                  <label><span>Prenoms</span><input value={form.firstNames} onChange={(event) => update("firstNames", event.target.value)} /></label>
                  <label className="wide"><span>Adresse</span><input value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
                  <label><span>Telephone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                  <label><span>Email</span><input value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
                  <label><span>Personne a contacter</span><input value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} /></label>
                  <label><span>Mobile de la personne a contacter</span><input value={form.contactMobile} onChange={(event) => update("contactMobile", event.target.value)} /></label>
                </FormSection>
              )}

              {activeStep === "validation" && (
                <FormSection title="4. Observations et validation" className="inventory-validation-section">
                  <label className="wide"><span>Notes</span><textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
                  <article className="inventory-check-card">
                    <div>
                      <p>Controle avant soumission</p>
                      <span>Verifiez les informations essentielles de la fiche.</span>
                    </div>
                    <button type="button" className={`inventory-validation-item ${form.commune ? "complete" : "missing"}`} onClick={() => setActiveStep("dossier")}>
                      <span>{form.commune ? "OK" : "!"}</span>
                      <strong>Commune<small>{form.commune ? "Renseignee" : "A completer"}</small></strong>
                      <em>Foncier et dossier</em>
                    </button>
                    <button type="button" className={`inventory-validation-item ${form.caseNature ? "complete" : "missing"}`} onClick={() => setActiveStep("dossier")}>
                      <span>{form.caseNature ? "OK" : "!"}</span>
                      <strong>Nature du dossier<small>{form.caseNature ? "Renseignee" : "A completer"}</small></strong>
                      <em>Dossier</em>
                    </button>
                    <button type="button" className={`inventory-validation-item ${form.lastName && form.firstNames ? "complete" : "missing"}`} onClick={() => setActiveStep("coordonnees")}>
                      <span>{form.lastName && form.firstNames ? "OK" : "!"}</span>
                      <strong>Demandeur<small>{form.lastName && form.firstNames ? "Renseigne" : "A completer"}</small></strong>
                      <em>Titulaire</em>
                    </button>
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
