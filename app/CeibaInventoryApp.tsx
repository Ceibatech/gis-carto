"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CeibaInventoryRole, CeibaInventorySession, CeibaInventoryUserAccount, CeibaInventoryUserAccountsResponse } from "../lib/ceiba-inventory-auth-types";
import type { CeibaInventoryDashboard, CeibaInventoryInput, CeibaInventoryRecord, CeibaInventoryStatusLabel } from "../lib/ceiba-inventory-types";

const statusOptions: CeibaInventoryStatusLabel[] = ["Nouveau", "En revue", "Traité", "Bloqué"];
const ceibaRoleOptions: CeibaInventoryRole[] = ["operator", "admin"];

type CeibaInventoryViewer = Pick<CeibaInventorySession, "login" | "name" | "role"> | null;

type CeibaAdminFormState = {
  login: string;
  name: string;
  password: string;
  role: CeibaInventoryRole;
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
};

export default function CeibaInventoryApp({ initialDashboard, session }: { initialDashboard: CeibaInventoryDashboard; session: CeibaInventoryViewer }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [form, setForm] = useState<CeibaInventoryInput>(defaultForm);
  const [message, setMessage] = useState<string | null>(dashboard.message);
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

  const isAdmin = session?.role === "admin";

  const recentStatusCounts = useMemo(() => {
    return statusOptions.map((status) => ({ status, count: dashboard.recentRecords.filter((item) => item.status === status).length }));
  }, [dashboard.recentRecords]);

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
      const result = (await response.json()) as { session?: CeibaInventorySession; message?: string };
      if (!response.ok || !result.session) {
        throw new Error(result.message || "Connexion CEIBA impossible.");
      }

      window.location.reload();
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
      const result = (await response.json()) as CeibaInventoryUserAccountsResponse | { message?: string };
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

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingAccount(true);
    setAdminFormMessage(null);

    try {
      const response = await fetch("/api/inventaire-ceiba/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });
      const result = (await response.json()) as CeibaInventoryUserAccountsResponse | { message?: string };
      if (!response.ok || !("accounts" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible de créer le compte CEIBA.");
      }

      setAccounts(result.accounts);
      setAccountsTableReady(result.tableReady);
      setAccountsMessage(result.message);
      setAdminForm(defaultAdminForm);
      setAdminFormMessage("Compte CEIBA créé.");
    } catch (error) {
      setAdminFormMessage(error instanceof Error ? error.message : "Impossible de créer le compte CEIBA.");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  useEffect(() => {
    if (isAdmin && accounts.length === 0 && !isLoadingAccounts) {
      void refreshAccounts();
    }
  }, [isAdmin, accounts.length, isLoadingAccounts]);

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-hero" aria-label="Connexion CEIBA">
          <div className="login-brand"><span>CI</span><div><p className="eyebrow">CEIBA Inventory</p><strong>Module dédié</strong></div></div>
          <div className="login-copy"><h1>Connexion CEIBA</h1><p>Accès réservé aux opérateurs et administrateurs du module Inventaire CEIBA.</p></div>
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
      const result = (await response.json()) as CeibaInventoryDashboard | { message?: string };
      if (!response.ok || !("recentRecords" in result)) {
        throw new Error(("message" in result ? result.message : "") || "Impossible d'enregistrer la fiche.");
      }

      setDashboard(result);
      setForm(defaultForm);
      setMessage("Fiche CEIBA enregistrée et visible dans le tableau de suivi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la fiche.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function update<K extends keyof CeibaInventoryInput>(key: K, value: CeibaInventoryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">CEIBA Inventory</p>
          <h2>Inventaire CEIBA</h2>
          <p className="view-description">Saisie du formulaire guichet foncier MCLU et suivi d'activité par commune, statut et date de création.</p>
        </div>
        <div className="topbar-actions">
          <div className="session-chip"><span>{session.role}</span><strong>{session.name}</strong></div>
          <button className="secondary-button" onClick={() => void handleLogout()} type="button">Se déconnecter</button>
          <Link className="secondary-button" href="/">Retour GeoArchives</Link>
        </div>
      </header>

      <section className="module-hub">
        <div>
          <p className="panel-label">Source de collecte</p>
          <h3>Formulaire MCLU / Guichet unique du foncier</h3>
          <p className="view-description">Le script SQL à exécuter est sql/005_create_ceiba_inventory.sql. Une fois la table créée dans MySQL, chaque saisie alimente automatiquement ce tableau de bord.</p>
        </div>
      </section>

      {isAdmin && (
        <section className="registry-layout">
          <form className="capture-panel" onSubmit={createAccount}>
            <div className="section-head"><div><p className="panel-label">Administration CEIBA</p><h3>Créer un compte CEIBA</h3></div></div>
            <div className="form-grid">
              <label><span>Nom complet</span><input required value={adminForm.name} onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span>Login ou email</span><input required value={adminForm.login} onChange={(event) => setAdminForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label><span>Rôle CEIBA</span><select value={adminForm.role} onChange={(event) => setAdminForm((current) => ({ ...current, role: event.target.value as CeibaInventoryRole }))}>{ceibaRoleOptions.map((role) => <option key={role}>{role}</option>)}</select></label>
              <label><span>Mot de passe provisoire</span><input minLength={8} required type="password" value={adminForm.password} onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))} /></label>
            </div>
            {adminFormMessage && <p className="form-message">{adminFormMessage}</p>}
            <div className="capture-actions"><span className="capture-helper">Ces comptes donnent accès uniquement au module /inventaire-ceiba.</span><button className="primary-button" disabled={isCreatingAccount || !accountsTableReady} type="submit">{isCreatingAccount ? "Création..." : "Créer le compte"}</button></div>
          </form>

          <div className="registry-panel">
            <div className="section-head"><div><p className="panel-label">Comptes CEIBA</p><h3>Accès dédiés au module</h3></div><button className="secondary-button" disabled={isLoadingAccounts} onClick={() => void refreshAccounts()} type="button">Actualiser</button></div>
            {!accountsTableReady && <p className="form-message">{accountsMessage ?? "Exécutez sql/005_create_ceiba_inventory.sql pour créer la table ceiba_inventory_users."}</p>}
            <div className="table-wrap"><table><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Création</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span>{account.login}</span></td><td>{account.role}</td><td>{account.status}</td><td>{new Date(account.createdAt).toLocaleDateString("fr-FR")}<span>{account.createdBy ? `Par ${account.createdBy}` : "Bootstrap"}</span></td></tr>)}</tbody></table>{!accounts.length && <p className="empty-text">{isLoadingAccounts ? "Chargement des comptes CEIBA..." : "Aucun compte CEIBA enregistré."}</p>}</div>
          </div>
        </section>
      )}

      <section className="metric-grid" aria-label="Indicateurs inventaire CEIBA">
        <article className="metric-card"><span>Total fiches</span><strong>{dashboard.totalRecords}</strong><p>Registre CEIBA cumulé</p></article>
        <article className="metric-card"><span>Aujourd'hui</span><strong>{dashboard.todayRecords}</strong><p>Fiches créées ce jour</p></article>
        <article className="metric-card"><span>Communes</span><strong>{dashboard.uniqueCommunes}</strong><p>Communes distinctes suivies</p></article>
        <article className="metric-card"><span>À traiter</span><strong>{dashboard.newRecords + dashboard.reviewedRecords}</strong><p>Nouveau + en revue</p></article>
      </section>

      <section className="registry-layout">
        <form className="capture-panel" onSubmit={submit}>
          <div className="section-head"><div><p className="panel-label">Nouvelle fiche</p><h3>Saisie guichet foncier</h3></div></div>
          <div className="form-grid">
            <label><span>N° guichet</span><input value={form.guichetNumber} onChange={(event) => update("guichetNumber", event.target.value)} /></label>
            <label><span>N° DDU</span><input value={form.dduNumber} onChange={(event) => update("dduNumber", event.target.value)} /></label>
            <label className="wide"><span>Référence de classement</span><input value={form.classificationReference} onChange={(event) => update("classificationReference", event.target.value)} /></label>
            <label><span>Îlot n°</span><input value={form.ilotNumber} onChange={(event) => update("ilotNumber", event.target.value)} /></label>
            <label><span>Lot n°</span><input value={form.lotNumber} onChange={(event) => update("lotNumber", event.target.value)} /></label>
            <label><span>Superficie</span><input value={form.surfaceArea} onChange={(event) => update("surfaceArea", event.target.value)} /></label>
            <label><span>Titre foncier n°</span><input value={form.landTitleNumber} onChange={(event) => update("landTitleNumber", event.target.value)} /></label>
            <label className="wide"><span>Lotissement</span><input value={form.housingEstate} onChange={(event) => update("housingEstate", event.target.value)} /></label>
            <label className="wide"><span>Commune(s) *</span><input required value={form.commune} onChange={(event) => update("commune", event.target.value)} /></label>
            <label className="wide"><span>Nature de dossier *</span><input required value={form.caseNature} onChange={(event) => update("caseNature", event.target.value)} /></label>
            <label><span>Nom *</span><input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
            <label><span>Prénoms *</span><input required value={form.firstNames} onChange={(event) => update("firstNames", event.target.value)} /></label>
            <label className="wide"><span>Adresse</span><input value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
            <label><span>Téléphone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
            <label><span>E-mail</span><input value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
            <label><span>Personne à contacter</span><input value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} /></label>
            <label><span>Mobile contact</span><input value={form.contactMobile} onChange={(event) => update("contactMobile", event.target.value)} /></label>
            <label><span>Statut *</span><select value={form.status} onChange={(event) => update("status", event.target.value as CeibaInventoryStatusLabel)}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="wide"><span>Notes de suivi</span><textarea rows={5} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
          </div>
          {message && <p className="form-message">{message}</p>}
          <div className="capture-actions">
            <span className="capture-helper">Le formulaire reprend les champs essentiels de la fiche papier MCLU pour suivre les traitements dans un dashboard CEIBA.</span>
            <button className="primary-button" disabled={isSubmitting || !dashboard.schemaReady} type="submit">{isSubmitting ? "Enregistrement..." : "Enregistrer la fiche"}</button>
          </div>
        </form>

        <div className="detail-panel">
          <div className="section-head"><div><p className="panel-label">Activité</p><h3>Lecture rapide</h3></div></div>
          <div className="bar-list">
            {recentStatusCounts.map((item) => (
              <div className="bar-row" key={item.status}><span>{item.status}</span><div className="bar-track"><div style={{ width: `${Math.max(item.count ? 12 : 0, dashboard.recentRecords.length ? (item.count / dashboard.recentRecords.length) * 100 : 0)}%` }} /></div><strong>{item.count}</strong></div>
            ))}
          </div>
          <div className="chart-panel">
            <p className="panel-label">Communes les plus actives</p>
            <h3>Répartition des saisies</h3>
            {dashboard.activityByCommune.length ? <div className="bar-list">{dashboard.activityByCommune.map((item) => <div className="bar-row" key={item.commune}><span>{item.commune}</span><div className="bar-track"><div style={{ width: `${Math.max(12, (item.count / dashboard.activityByCommune[0].count) * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</div> : <p className="empty-text">Les communes apparaîtront après les premières saisies.</p>}
          </div>
        </div>
      </section>

      <section className="registry-panel">
        <div className="section-head"><div><p className="panel-label">Fiches récentes</p><h3>Suivi opérationnel CEIBA</h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Dossier</th><th>Localisation</th><th>Contact</th><th>Statut</th><th>Création</th></tr></thead>
            <tbody>
              {dashboard.recentRecords.map((record) => <CeibaInventoryRow key={record.id} record={record} />)}
            </tbody>
          </table>
          {!dashboard.recentRecords.length && <p className="empty-text">Aucune fiche CEIBA pour le moment.</p>}
        </div>
      </section>
    </main>
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
