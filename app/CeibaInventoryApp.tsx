"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, Clock3, FilePlus2, Gauge, UsersRound } from "lucide-react";
import type { CeibaInventoryRole, CeibaInventorySession, CeibaInventoryUserAccount, CeibaInventoryUserAccountsResponse } from "../lib/ceiba-inventory-auth-types";
import type { CeibaInventoryDashboard, CeibaInventoryInput, CeibaInventoryRecord, CeibaInventoryStatusLabel } from "../lib/ceiba-inventory-types";
import { AppSidebar, EmptyState, FormSection, FormStepper, PageHeader, StatCard, StatusBadge, StickyFormActions, TechnicalAlert, TopHeader, UserDrawer } from "./components/ceiba-ui";

const statusOptions: CeibaInventoryStatusLabel[] = ["Nouveau", "En revue", "Traité", "Bloqué"];
const ceibaRoleOptions: CeibaInventoryRole[] = ["operator", "supervisor", "admin"];

type CeibaInventoryViewer = Pick<CeibaInventorySession, "login" | "name" | "role"> | null;

type CeibaAdminFormState = {
  login: string;
  name: string;
  password: string;
  role: CeibaInventoryRole;
  status: "active" | "disabled";
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

const defaultAdminForm: CeibaAdminFormState = {
  login: "",
  name: "",
  password: "",
  role: "operator",
  status: "active",
};

const defaultDashboard: CeibaInventoryDashboard = {
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
  totalRecords: 0,
  uniqueCommunes: 0,
};

type ToastTone = "success" | "error" | "info";

type UiToast = {
  tone: ToastTone;
  message: string;
};

const formSections = [
  { id: "step-identification", label: "Identification du guichet", summary: "Reference guichet, DDU et classement." },
  { id: "step-references", label: "References foncieres", summary: "Informations ilot, lot, superficie et titre." },
  { id: "step-location", label: "Localisation", summary: "Commune, lotissement et adresse." },
  { id: "step-requester", label: "Informations demandeur", summary: "Identite et moyens de contact." },
  { id: "step-case", label: "Nature du dossier", summary: "Qualification du dossier et statut." },
  { id: "step-documents", label: "Documents et observations", summary: "Notes de suivi et remarques terrain." },
  { id: "step-validation", label: "Verification et validation", summary: "Controle final avant sauvegarde." },
] as const;

type CeibaFormSectionId = (typeof formSections)[number]["id"];

type CeibaInventoryAppMode = "portal" | "questionnaire";

function roleLabel(role: CeibaInventoryRole) {
  if (role === "admin") return "Administrateur CEIBA";
  if (role === "supervisor") return "Superviseur dashboard";
  return "Agent operateur";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body.trim()) {
    return { message: "Réponse API vide." } as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return { message: `Réponse API invalide (HTTP ${response.status}).` } as T;
  }
}

export default function CeibaInventoryApp({
  initialDashboard,
  mode = "portal",
  session,
}: {
  initialDashboard: CeibaInventoryDashboard;
  mode?: CeibaInventoryAppMode;
  session: CeibaInventoryViewer;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard ?? defaultDashboard);
  const [form, setForm] = useState<CeibaInventoryInput>(defaultForm);
  const [message, setMessage] = useState<string | null>(initialDashboard.message);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [accounts, setAccounts] = useState<CeibaInventoryUserAccount[]>([]);
  const [accountsTableReady, setAccountsTableReady] = useState(false);
  const [accountsMessage, setAccountsMessage] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adminForm, setAdminForm] = useState<CeibaAdminFormState>(defaultAdminForm);
  const [adminFormMessage, setAdminFormMessage] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [activeSection, setActiveSection] = useState(mode === "questionnaire" ? "new-record" : "overview");
  const [activeFormStep, setActiveFormStep] = useState<CeibaFormSectionId>(formSections[0].id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"7" | "30" | "90" | "all">("30");
  const [statusFilter, setStatusFilter] = useState<"all" | CeibaInventoryStatusLabel>("all");
  const [communeFilter, setCommuneFilter] = useState("all");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState<"all" | CeibaInventoryRole>("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [toast, setToast] = useState<UiToast | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);

  const draftStorageKey = "ceiba-inventory-draft";

  const isAdmin = session?.role === "admin";
  const canSubmitInventory = session?.role === "admin" || session?.role === "operator";
  const isQuestionnaireMode = mode === "questionnaire";

  const communeSuggestions = useMemo(() => {
    const values = new Set<string>();
    dashboard.activityByCommune.forEach((item) => values.add(item.commune));
    dashboard.recentRecords.forEach((item) => {
      if (item.commune) values.add(item.commune);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dashboard.activityByCommune, dashboard.recentRecords]);

  const caseNatureSuggestions = useMemo(() => {
    const values = new Set<string>();
    dashboard.recentRecords.forEach((item) => {
      if (item.caseNature) values.add(item.caseNature);
    });
    if (form.caseNature) values.add(form.caseNature);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dashboard.recentRecords, form.caseNature]);

  const filteredOverviewRecords = useMemo(() => {
    const now = Date.now();
    const periodDays = periodFilter === "all" ? null : Number(periodFilter);
    return dashboard.recentRecords.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (communeFilter !== "all" && record.commune !== communeFilter) return false;
      if (periodDays !== null) {
        const ageDays = (now - new Date(record.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > periodDays) return false;
      }
      if (globalSearch.trim()) {
        const haystack = `${record.lastName} ${record.firstNames} ${record.caseNature} ${record.commune} ${record.guichetNumber} ${record.dduNumber}`.toLowerCase();
        if (!haystack.includes(globalSearch.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [dashboard.recentRecords, periodFilter, statusFilter, communeFilter, globalSearch]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (accountRoleFilter !== "all" && account.role !== accountRoleFilter) return false;
      if (accountStatusFilter !== "all" && account.status !== accountStatusFilter) return false;
      if (accountSearch.trim()) {
        const needle = accountSearch.trim().toLowerCase();
        const source = `${account.name} ${account.login} ${account.email ?? ""}`.toLowerCase();
        if (!source.includes(needle)) return false;
      }
      return true;
    });
  }, [accounts, accountRoleFilter, accountSearch, accountStatusFilter]);

  const recordsByStatus = useMemo(() => {
    return statusOptions.map((status) => ({
      status,
      count: filteredOverviewRecords.filter((item) => item.status === status).length,
    }));
  }, [filteredOverviewRecords]);

  const activityByCommune = useMemo(() => {
    const counts = new Map<string, number>();
    filteredOverviewRecords.forEach((record) => {
      if (!record.commune) return;
      counts.set(record.commune, (counts.get(record.commune) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([commune, count]) => ({ commune, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredOverviewRecords]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(defaultForm).some((key) => {
      const typedKey = key as keyof CeibaInventoryInput;
      return form[typedKey] !== defaultForm[typedKey];
    });
  }, [form]);

  const isRemoteApiMode = useMemo(() => {
    return !dashboard.schemaReady && !!process.env.NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL;
  }, [dashboard.schemaReady]);

  useEffect(() => {
    setIsUnsaved(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!session) return;
    try {
      const saved = window.localStorage.getItem(draftStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<CeibaInventoryInput>;
      setForm((current) => ({ ...current, ...parsed }));
      setToast({ tone: "info", message: "Brouillon restaure localement." });
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [session]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const result = await readJsonResponse<{ session?: CeibaInventorySession; message?: string }>(response);
      if (!response.ok || !result.session) {
        throw new Error(result.message || "Connexion CEIBA impossible.");
      }

      const nextRoute = result.session.role === "operator" ? "/inventaire-ceiba/questionnaire" : "/inventaire-ceiba";
      window.location.href = nextRoute;
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : "Connexion CEIBA impossible.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/inventaire-ceiba/auth/logout", { method: "POST" }).catch(() => null);
    window.location.reload();
  }

  async function refreshAccounts() {
    setIsLoadingAccounts(true);
    try {
      const response = await fetch("/api/inventaire-ceiba/users", { headers: { accept: "application/json" } });
      const result = await readJsonResponse<CeibaInventoryUserAccountsResponse | { message?: string }>(response);
      if (!response.ok || !("accounts" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible de charger les comptes CEIBA.");
      }

      setAccounts(result.accounts);
      setAccountsTableReady(result.tableReady);
      setAccountsMessage(result.message);
    } catch (error) {
      setAccounts([]);
      setAccountsTableReady(false);
      setAccountsMessage(error instanceof Error ? error.message : "Impossible de charger les comptes CEIBA.");
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  async function refreshDashboard() {
    try {
      const response = await fetch("/api/inventaire-ceiba", { headers: { accept: "application/json" } });
      const result = await readJsonResponse<CeibaInventoryDashboard | { message?: string }>(response);
      if (!response.ok || !("recentRecords" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible de charger le dashboard CEIBA.");
      }

      setDashboard(result);
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur API sur le dashboard CEIBA." });
    }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingAccount(true);
    setAdminFormMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: adminForm.login,
          name: adminForm.name,
          password: adminForm.password,
          role: adminForm.role,
        }),
      });
      const result = await readJsonResponse<CeibaInventoryUserAccountsResponse | { message?: string }>(response);
      if (!response.ok || !("accounts" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible de créer le compte CEIBA.");
      }

      setAccounts(result.accounts);
      setAccountsTableReady(result.tableReady);
      setAccountsMessage(result.message);
      setAdminForm(defaultAdminForm);
      setAdminFormMessage("Compte CEIBA cree.");
      setShowUserDrawer(false);
      setToast({ tone: "success", message: "Utilisateur CEIBA cree." });
    } catch (error) {
      setAdminFormMessage(error instanceof Error ? error.message : "Impossible de créer le compte CEIBA.");
      setToast({ tone: "error", message: "La creation du compte a echoue." });
    } finally {
      setIsCreatingAccount(false);
    }
  }

  useEffect(() => {
    if (isAdmin && accounts.length === 0 && !isLoadingAccounts) {
      void refreshAccounts();
    }
  }, [isAdmin, accounts.length, isLoadingAccounts]);

  useEffect(() => {
    if (session) {
      void refreshDashboard();
    }
  }, [session]);

  useEffect(() => {
    setActiveSection(isQuestionnaireMode ? "new-record" : "overview");
  }, [isQuestionnaireMode]);

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-hero" aria-label="Connexion CEIBA">
          <div className="login-brand"><span>CI</span><div><p className="eyebrow">CEIBA Inventory</p><strong>Module dédié</strong></div></div>
          <div className="login-copy"><h1>Connexion CEIBA</h1><p>Accès réservé aux opérateurs et administrateurs du module Inventaire CEIBA. Après connexion, chaque profil est orienté vers son espace: questionnaire terrain ou portail d'administration.</p></div>
        </section>
        <form className="login-panel" onSubmit={handleLogin}>
          <div className="login-panel-head"><p className="panel-label">Accès CEIBA</p><h2>Se connecter</h2></div>
          <label><span>Identifiant</span><input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label><span>Mot de passe</span><input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {loginMessage && <p className="form-message login-error">{loginMessage}</p>}
          <button className="primary-button" disabled={isLoggingIn} type="submit">{isLoggingIn ? "Vérification..." : "Entrer"}</button>
        </form>
      </main>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await readJsonResponse<CeibaInventoryDashboard | { message?: string }>(response);
      if (!response.ok || !("recentRecords" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible d'enregistrer la fiche.");
      }

      setDashboard(result);
      setForm(defaultForm);
      window.localStorage.removeItem(draftStorageKey);
      setMessage("Fiche CEIBA enregistrée et visible dans le tableau de suivi.");
      setToast({ tone: "success", message: "Fiche enregistree avec succes." });
      setActiveSection("overview");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la fiche.");
      setToast({ tone: "error", message: "Erreur API: enregistrement impossible." });
    } finally {
      setIsSubmitting(false);
    }
  }

  function update<K extends keyof CeibaInventoryInput>(key: K, value: CeibaInventoryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleFormSection(sectionId: CeibaFormSectionId) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
    setActiveFormStep(sectionId);
  }

  function saveDraft() {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(form));
    setToast({ tone: "info", message: "Brouillon enregistre sur cet appareil." });
  }

  function clearForm() {
    setForm(defaultForm);
    setMessage(null);
    setIsUnsaved(false);
    window.localStorage.removeItem(draftStorageKey);
  }

  return (
    <div className="ceiba-app-shell">
      <AppSidebar
        activeSection={activeSection}
        canManageUsers={isAdmin && !isQuestionnaireMode}
        collapsed={sidebarCollapsed}
        onLogout={() => void handleLogout()}
        onNavigate={goToSection}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        questionnaireOnly={isQuestionnaireMode}
        user={{ login: session.login, name: session.name, role: session.role }}
      />

      <main className="ceiba-main">
        <TopHeader
          breadcrumb={isQuestionnaireMode ? "GeoArchives / CEIBA / Questionnaire" : "GeoArchives / CEIBA / Inventaire"}
          title={isQuestionnaireMode ? "Questionnaire inventaire CEIBA" : "Inventaire foncier CEIBA"}
          userName={session.name}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
          onCreateRecord={() => goToSection("new-record")}
        />

        {toast && <p className={`ceiba-toast ${toast.tone}`}>{toast.message}</p>}

        <PageHeader
          title="Formulaire MCLU / Guichet unique du foncier"
          description="Saisie du formulaire guichet foncier MCLU et suivi d'activite par commune, statut et date de creation."
          onCreateRecord={() => goToSection("new-record")}
        />

        {!isQuestionnaireMode && isAdmin && (
          <section className="ceiba-panel" id="settings">
            <div className="ceiba-panel-head">
              <div>
                <p className="panel-label">Pilotage des acces</p>
                <h3>Parcours admin metier CEIBA</h3>
              </div>
            </div>
            <div className="ceiba-access-model-grid">
              <article className="ceiba-access-model-card">
                <h4>Etape 1: creer les comptes</h4>
                <p>L'administrateur CEIBA cree les comptes des agents depuis la section Utilisateurs CEIBA.</p>
              </article>
              <article className="ceiba-access-model-card">
                <h4>Etape 2: attribuer le profil</h4>
                <p>Agent operateur pour la saisie terrain. Administrateur CEIBA pour supervision dashboard et gestion des acces.</p>
              </article>
              <article className="ceiba-access-model-card">
                <h4>Etape 3: connexion et exploitation</h4>
                <p>Les agents se connectent, saisissent le questionnaire d'inventaire et les profils de supervision suivent les indicateurs.</p>
              </article>
            </div>
          </section>
        )}

        {!isQuestionnaireMode && <section className="ceiba-panel" id="overview">
          <div className="ceiba-panel-head">
            <div>
              <p className="panel-label">Vue d'ensemble</p>
              <h3>Indicateurs et activite fonciere</h3>
            </div>
            <div className="ceiba-filter-row">
              <label>
                <span>Periode</span>
                <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as "7" | "30" | "90" | "all") }>
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="all">Tout</option>
                </select>
              </label>
              <label>
                <span>Commune</span>
                <select value={communeFilter} onChange={(event) => setCommuneFilter(event.target.value)}>
                  <option value="all">Toutes</option>
                  {communeSuggestions.map((commune) => (
                    <option key={commune} value={commune}>{commune}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Statut</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | CeibaInventoryStatusLabel)}>
                  <option value="all">Tous</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="ceiba-kpi-grid" aria-label="Indicateurs inventaire CEIBA">
            <StatCard icon={FilePlus2} label="Total des fiches" value={dashboard.totalRecords} detail="Registre CEIBA cumule" />
            <StatCard icon={Clock3} label="Fiches creees aujourd'hui" value={dashboard.todayRecords} detail="Production quotidienne" />
            <StatCard icon={Building2} label="Communes couvertes" value={dashboard.uniqueCommunes} detail="Territoires suivis" />
            <StatCard icon={Gauge} label="Dossiers a traiter" value={dashboard.newRecords + dashboard.reviewedRecords} detail="Nouveau + en revue" />
          </div>

          <div className="ceiba-analytics-grid">
            <article className="ceiba-panel-sub">
              <div className="ceiba-panel-sub-head">
                <h3>Repartition par statut</h3>
                <BarChart3 size={16} />
              </div>
              {recordsByStatus.some((item) => item.count > 0) ? (
                <div className="bar-list">
                  {recordsByStatus.map((item) => (
                    <div className="bar-row" key={item.status}>
                      <span>{item.status}</span>
                      <div className="bar-track">
                        <div style={{ width: `${Math.max(item.count > 0 ? 12 : 0, filteredOverviewRecords.length ? (item.count / filteredOverviewRecords.length) * 100 : 0)}%` }} />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune donnee filtree"
                  description="Elargissez la periode ou la commune pour afficher la repartition des statuts."
                />
              )}
            </article>

            <article className="ceiba-panel-sub" id="communes">
              <div className="ceiba-panel-sub-head">
                <h3>Communes les plus actives</h3>
                <UsersRound size={16} />
              </div>
              {activityByCommune.length ? (
                <div className="bar-list">
                  {activityByCommune.map((item) => (
                    <div className="bar-row" key={item.commune}>
                      <span>{item.commune}</span>
                      <div className="bar-track">
                        <div style={{ width: `${Math.max(12, (item.count / activityByCommune[0].count) * 100)}%` }} />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune commune active"
                  description="Les communes apparaitront apres les premieres saisies filtrees."
                  actionLabel="Nouvelle fiche"
                  onAction={() => goToSection("new-record")}
                />
              )}
            </article>

            <article className="ceiba-panel-sub" id="activities">
              <div className="ceiba-panel-sub-head">
                <h3>Dernieres fiches enregistrees</h3>
                <Clock3 size={16} />
              </div>
              {filteredOverviewRecords.length ? (
                <ul className="ceiba-activity-list">
                  {filteredOverviewRecords.slice(0, 6).map((record) => (
                    <li key={record.id}>
                      <div>
                        <strong>{record.lastName} {record.firstNames}</strong>
                        <small>{record.commune} · {record.caseNature}</small>
                      </div>
                      <StatusBadge status={record.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="Aucune fiche recente"
                  description="Aucune fiche ne correspond aux filtres en cours."
                />
              )}
            </article>
          </div>
        </section>}

        {!isQuestionnaireMode && isAdmin && (
          <section className="ceiba-panel" id="users">
            <div className="ceiba-panel-head">
              <div>
                <p className="panel-label">Utilisateurs CEIBA</p>
                <h3>Administration des acces dedies</h3>
              </div>
              <div className="ceiba-filter-row">
                <label>
                  <span>Recherche</span>
                  <input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Nom, login ou e-mail" />
                </label>
                <label>
                  <span>Role</span>
                  <select value={accountRoleFilter} onChange={(event) => setAccountRoleFilter(event.target.value as "all" | CeibaInventoryRole)}>
                    <option value="all">Tous</option>
                    {ceibaRoleOptions.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Statut</span>
                  <select value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value as "all" | "active" | "disabled") }>
                    <option value="all">Tous</option>
                    <option value="active">actif</option>
                    <option value="disabled">desactive</option>
                  </select>
                </label>
                <button className="primary-button" type="button" onClick={() => setShowUserDrawer(true)}>Ajouter un utilisateur</button>
                <button className="secondary-button" disabled={isLoadingAccounts} onClick={() => void refreshAccounts()} type="button">Actualiser</button>
              </div>
            </div>

            {!accountsTableReady && (
              <TechnicalAlert
                title="Configuration comptes CEIBA incomplete"
                description={accountsMessage ?? "La table ceiba_inventory_users est indisponible. Executez sql/005_create_ceiba_inventory.sql puis relancez l'actualisation."}
                actionLabel="Actualiser"
                onAction={() => void refreshAccounts()}
              />
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Role</th>
                    <th>Statut</th>
                    <th>Creation</th>
                    <th>Derniere activite</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.name}</strong>
                        <span>{account.login}</span>
                      </td>
                      <td>{roleLabel(account.role)}</td>
                      <td><StatusBadge status={account.status} /></td>
                      <td>
                        {new Date(account.createdAt).toLocaleDateString("fr-FR")}
                        <span>{account.createdBy ? `Par ${account.createdBy}` : "Bootstrap"}</span>
                      </td>
                      <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleDateString("fr-FR") : "Aucune"}</td>
                      <td>
                        <div className="table-actions">
                          <button className="ghost-button" type="button" onClick={() => setToast({ tone: "info", message: "Edition detaillee a connecter a l'API." })}>Modifier</button>
                          <button className="ghost-button" type="button" onClick={() => setToast({ tone: "info", message: "Activation/desactivation a connecter a l'API." })}>{account.status === "active" ? "Desactiver" : "Activer"}</button>
                          <button className="ghost-button" type="button" onClick={() => setToast({ tone: "info", message: "Reinitialisation a connecter a l'API." })}>Reinit. MDP</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredAccounts.length && (
                <EmptyState
                  title={isLoadingAccounts ? "Chargement des utilisateurs" : "Aucun utilisateur CEIBA"}
                  description="Aucun compte ne correspond aux filtres appliques."
                  actionLabel="Ajouter un utilisateur"
                  onAction={() => setShowUserDrawer(true)}
                />
              )}
            </div>

            <UserDrawer open={showUserDrawer} onClose={() => setShowUserDrawer(false)}>
              <form className="ceiba-drawer-form" onSubmit={createAccount}>
                <label><span>Nom complet</span><input required value={adminForm.name} onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label><span>Login ou e-mail</span><input required value={adminForm.login} onChange={(event) => setAdminForm((current) => ({ ...current, login: event.target.value }))} /></label>
                <label><span>Role CEIBA</span><select value={adminForm.role} onChange={(event) => setAdminForm((current) => ({ ...current, role: event.target.value as CeibaInventoryRole }))}>{ceibaRoleOptions.map((role) => <option key={role}>{role}</option>)}</select></label>
                <label><span>Mot de passe provisoire</span><input minLength={8} required type="password" value={adminForm.password} onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <label>
                  <span>Statut du compte</span>
                  <select value={adminForm.status} onChange={(event) => setAdminForm((current) => ({ ...current, status: event.target.value as "active" | "disabled" }))}>
                    <option value="active">Actif</option>
                    <option value="disabled">Desactive</option>
                  </select>
                </label>
                <p className="capture-helper">Le statut est prepare pour le workflow admin. La creation conserve la logique API actuelle.</p>
                <p className="capture-helper">Profil choisi: {adminForm.role === "admin" ? "peut gerer les comptes et suivre le dashboard" : adminForm.role === "supervisor" ? "peut consulter le dashboard sans saisir ni gerer les comptes" : "peut saisir les fiches et suivre l'activite"}.</p>
                {adminFormMessage && <p className="form-message">{adminFormMessage}</p>}
                <div className="ceiba-drawer-actions">
                  <button className="ghost-button" type="button" onClick={() => setShowUserDrawer(false)}>Annuler</button>
                  <button className="primary-button" disabled={isCreatingAccount || !accountsTableReady} type="submit">{isCreatingAccount ? "Creation..." : "Creer le compte"}</button>
                </div>
              </form>
            </UserDrawer>
          </section>
        )}

        {canSubmitInventory ? <section className="ceiba-panel" id="new-record">
          <div className="ceiba-panel-head">
            <div>
              <p className="panel-label">Nouvelle fiche</p>
              <h3>Saisie fonciere structuree</h3>
            </div>
            <p className="view-description">Les champs obligatoires utilisent un asterisque rouge. La sauvegarde conserve le schema SQL existant.</p>
          </div>

          <FormStepper
            activeId={activeFormStep}
            onSelect={(id) => {
              const nextId = id as CeibaFormSectionId;
              setActiveFormStep(nextId);
              document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "center" });
              setCollapsedSections((current) => ({ ...current, [nextId]: false }));
            }}
            sections={formSections.map((section) => ({ id: section.id, label: section.label }))}
          />

          <form className="ceiba-form-shell" onSubmit={submit}>
            <FormSection
              id="step-identification"
              title="1. Identification du guichet"
              description="Renseignez les references de base du guichet unique."
              open={!collapsedSections["step-identification"]}
              onToggle={() => toggleFormSection("step-identification")}
            >
              <div className="ceiba-form-grid">
                <label><span>N° guichet</span><input placeholder="Ex: GU-2026-001" value={form.guichetNumber} onChange={(event) => update("guichetNumber", event.target.value)} /></label>
                <label><span>N° DDU</span><input placeholder="Ex: DDU-ABJ-8991" value={form.dduNumber} onChange={(event) => update("dduNumber", event.target.value)} /></label>
                <label className="wide"><span>Reference de classement</span><input placeholder="Reference de classement MCLU" value={form.classificationReference} onChange={(event) => update("classificationReference", event.target.value)} /></label>
              </div>
            </FormSection>

            <FormSection
              id="step-references"
              title="2. References foncieres"
              description="Capture fonciere principale de la parcelle."
              open={!collapsedSections["step-references"]}
              onToggle={() => toggleFormSection("step-references")}
            >
              <div className="ceiba-form-grid">
                <label><span>Ilot n°</span><input placeholder="Ex: IL-17" value={form.ilotNumber} onChange={(event) => update("ilotNumber", event.target.value)} /></label>
                <label><span>Lot n°</span><input placeholder="Ex: LOT-03" value={form.lotNumber} onChange={(event) => update("lotNumber", event.target.value)} /></label>
                <label><span>Superficie</span><input placeholder="Ex: 450 m2" value={form.surfaceArea} onChange={(event) => update("surfaceArea", event.target.value)} /></label>
                <label><span>Titre foncier n°</span><input placeholder="Numero du titre foncier" value={form.landTitleNumber} onChange={(event) => update("landTitleNumber", event.target.value)} /></label>
                <label className="wide"><span>Lotissement</span><input placeholder="Nom du lotissement" value={form.housingEstate} onChange={(event) => update("housingEstate", event.target.value)} /></label>
              </div>
            </FormSection>

            <FormSection
              id="step-location"
              title="3. Localisation"
              description="Position administrative du dossier et adresse associee."
              open={!collapsedSections["step-location"]}
              onToggle={() => toggleFormSection("step-location")}
            >
              <div className="ceiba-form-grid">
                <label className="wide">
                  <span>Commune(s) <em>*</em></span>
                  <input
                    required
                    list="ceiba-communes"
                    placeholder="Saisir ou rechercher une commune"
                    value={form.commune}
                    onChange={(event) => update("commune", event.target.value)}
                  />
                </label>
                <label className="wide"><span>Adresse</span><input placeholder="Adresse detaillee" value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
              </div>
            </FormSection>

            <FormSection
              id="step-requester"
              title="4. Informations sur le demandeur"
              description="Identite du demandeur et contacts utilises pour le suivi."
              open={!collapsedSections["step-requester"]}
              onToggle={() => toggleFormSection("step-requester")}
            >
              <div className="ceiba-form-grid">
                <label><span>Nom <em>*</em></span><input required placeholder="Nom du demandeur" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
                <label><span>Prenoms <em>*</em></span><input required placeholder="Prenoms du demandeur" value={form.firstNames} onChange={(event) => update("firstNames", event.target.value)} /></label>
                <label><span>Telephone</span><input placeholder="Numero principal" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                <label><span>E-mail</span><input placeholder="adresse@example.ci" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
                <label><span>Personne a contacter</span><input placeholder="Nom du relais" value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} /></label>
                <label><span>Mobile contact</span><input placeholder="Numero du relais" value={form.contactMobile} onChange={(event) => update("contactMobile", event.target.value)} /></label>
              </div>
            </FormSection>

            <FormSection
              id="step-case"
              title="5. Nature du dossier"
              description="Classification metier du dossier et etat de traitement."
              open={!collapsedSections["step-case"]}
              onToggle={() => toggleFormSection("step-case")}
            >
              <div className="ceiba-form-grid">
                <label className="wide">
                  <span>Nature de dossier <em>*</em></span>
                  <input
                    required
                    list="ceiba-natures"
                    placeholder="Ex: Attribution, mutation, regularisation..."
                    value={form.caseNature}
                    onChange={(event) => update("caseNature", event.target.value)}
                  />
                </label>
                <label>
                  <span>Statut <em>*</em></span>
                  <select value={form.status} onChange={(event) => update("status", event.target.value as CeibaInventoryStatusLabel)}>
                    {statusOptions.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </div>
            </FormSection>

            <FormSection
              id="step-documents"
              title="6. Documents et observations"
              description="Notes de controle, annotations et informations utiles au traitement."
              open={!collapsedSections["step-documents"]}
              onToggle={() => toggleFormSection("step-documents")}
            >
              <div className="ceiba-form-grid">
                <label className="wide">
                  <span>Notes de suivi</span>
                  <textarea rows={5} placeholder="Informations complementaires pour l'equipe CEIBA" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
                </label>
              </div>
            </FormSection>

            <FormSection
              id="step-validation"
              title="7. Verification et validation"
              description="Controle final avant enregistrement dans le registre CEIBA."
              open={!collapsedSections["step-validation"]}
              onToggle={() => toggleFormSection("step-validation")}
            >
              <div className="ceiba-validation-grid">
                <article>
                  <h4>Controle de completude</h4>
                  <ul>
                    <li>{form.commune ? "Commune renseignee" : "Commune manquante"}</li>
                    <li>{form.caseNature ? "Nature de dossier renseignee" : "Nature de dossier manquante"}</li>
                    <li>{form.lastName && form.firstNames ? "Identite demandeur renseignee" : "Identite demandeur incomplete"}</li>
                  </ul>
                </article>
                <article>
                  <h4>Etat applicatif</h4>
                  <ul>
                    <li>{dashboard.schemaReady ? "Schema SQL disponible" : isRemoteApiMode ? "Mode API distante en synchronisation" : "Schema SQL indisponible"}</li>
                    <li>{isUnsaved ? "Formulaire non sauvegarde" : "Aucune modification en attente"}</li>
                    <li>{isSubmitting ? "Sauvegarde en cours" : "Pret pour enregistrement"}</li>
                  </ul>
                </article>
              </div>
            </FormSection>

            {message && <p className="form-message">{message}</p>}

            <StickyFormActions
              draftDisabled={!hasUnsavedChanges}
              draftLabel="Enregistrer comme brouillon"
              isSaving={isSubmitting}
              onCancel={clearForm}
              onDraft={saveDraft}
              saveDisabled={isSubmitting || !dashboard.schemaReady}
              savingLabel="Sauvegarde en cours..."
              submitLabel="Enregistrer la fiche"
            />
          </form>

          <datalist id="ceiba-communes">
            {communeSuggestions.map((commune) => <option key={commune} value={commune} />)}
          </datalist>
          <datalist id="ceiba-natures">
            {caseNatureSuggestions.map((nature) => <option key={nature} value={nature} />)}
          </datalist>
        </section> : (
          <section className="ceiba-panel" id="new-record">
            <EmptyState
              title="Profil supervision en lecture seule"
              description="Ce compte superviseur consulte les indicateurs et le suivi inventaire, sans saisie de questionnaire."
            />
          </section>
        )}

        <section className="ceiba-panel" id="inventory">
          <div className="ceiba-panel-head">
            <div>
              <p className="panel-label">Inventaire foncier</p>
              <h3>Tableau operationnel des fiches</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dossier</th>
                  <th>Localisation</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th>Creation</th>
                </tr>
              </thead>
              <tbody>
                {filteredOverviewRecords.map((record) => <CeibaInventoryRow key={record.id} record={record} />)}
              </tbody>
            </table>
            {!filteredOverviewRecords.length && (
              <EmptyState
                title="Aucune fiche a afficher"
                description="Modifiez les filtres ou creez une nouvelle fiche pour alimenter le registre."
                actionLabel="Creer une fiche"
                onAction={() => goToSection("new-record")}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function CeibaInventoryRow({ record }: { record: CeibaInventoryRecord }) {
  return (
    <tr>
      <td><strong>{record.lastName} {record.firstNames}</strong><span>{record.caseNature}</span><span>{record.guichetNumber || record.dduNumber || record.classificationReference || "Référence à compléter"}</span></td>
      <td>{record.commune}<span>{record.housingEstate || record.address || "Adresse non renseignée"}</span></td>
      <td>{record.contactPerson || `${record.lastName} ${record.firstNames}`}<span>{record.contactMobile || record.phone || record.email || "Contact non renseigné"}</span></td>
      <td>{record.status}</td>
      <td>{new Date(record.createdAt).toLocaleDateString("fr-FR")}<span>{record.createdBy ? `Par ${record.createdBy}` : "Création directe"}</span></td>
    </tr>
  );
}
