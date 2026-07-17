"use client";

import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";
import type {
  CaptureSiteInput,
  DashboardSite,
  GeoArchivesDashboard,
  SiteStatusLabel,
} from "../lib/geoarchives-types";

type Assessment = {
  physical: number;
  humidity: number;
  security: number;
  inventory: number;
  sensitivity: number;
  access: number;
};

type AssessmentKey = keyof Assessment;

type CaptureFormState = Omit<
  CaptureSiteInput,
  "meters" | "boxes" | "pages" | "risk" | "priority" | "progress" | "latitude" | "longitude"
> & {
  meters: string;
  boxes: string;
  pages: string;
  risk: string;
  priority: string;
  progress: string;
  latitude: string;
  longitude: string;
};

const statuses: SiteStatusLabel[] = [
  "Non évalué",
  "Évaluation planifiée",
  "Évaluation réalisée",
  "Mobilisation en cours",
  "Traitement en cours",
  "Numérisation en cours",
  "Contrôle qualité",
  "Traitement terminé",
  "Risque élevé",
  "Inaccessible",
];

const siteTypes = [
  "Direction centrale",
  "Direction régionale",
  "Direction départementale",
  "Agence rattachée",
  "Dépôt d'archives",
  "Local d'archives",
  "Centre temporaire",
  "Site CEIBA",
  "Unité mobile",
];

const confidentialityLevels: DashboardSite["confidentiality"][] = [
  "Faible",
  "Interne",
  "Confidentiel",
  "Critique",
];

const assessmentFields: { key: AssessmentKey; label: string }[] = [
  { key: "physical", label: "État physique des documents" },
  { key: "humidity", label: "Humidité, moisissures et inondation" },
  { key: "security", label: "Sécurité et contrôle des accès" },
  { key: "inventory", label: "Absence d'inventaire ou de classement" },
  { key: "sensitivity", label: "Sensibilité documentaire" },
  { key: "access", label: "Difficulté d'accès et logistique" },
];

const defaultCapture: CaptureFormState = {
  code: "",
  name: "",
  organization: "",
  region: "",
  district: "",
  department: "",
  city: "",
  type: "Dépôt d'archives",
  status: "Évaluation planifiée",
  meters: "0",
  boxes: "0",
  pages: "0",
  risk: "50",
  priority: "50",
  progress: "0",
  confidentiality: "Interne",
  latitude: "",
  longitude: "",
  lead: "",
  phone: "",
  nextStep: "Évaluation archivistique à planifier",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function riskLabel(value: number) {
  if (value >= 80) return "Critique";
  if (value >= 60) return "Élevé";
  if (value >= 40) return "Modéré";
  return "Maîtrisé";
}

function statusClass(status: SiteStatusLabel) {
  if (status === "Risque élevé" || status === "Inaccessible") return "status-risk";
  if (status === "Traitement terminé") return "status-complete";
  if (status === "Évaluation planifiée" || status === "Non évalué") return "status-planned";
  return "status-active";
}

export default function GeoArchivesApp({ initialData }: { initialData: GeoArchivesDashboard }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("Carte nationale");
  const [region, setRegion] = useState("Toutes");
  const [status, setStatus] = useState("Tous");
  const [risk, setRisk] = useState("Tous");
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState(initialData.sites[0]?.code ?? "");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [capture, setCapture] = useState<CaptureFormState>(defaultCapture);
  const [assessment, setAssessment] = useState<Assessment>({
    physical: 4,
    humidity: 5,
    security: 3,
    inventory: 4,
    sensitivity: 5,
    access: 2,
  });

  const sites = data.sites;
  const databaseUsable = data.databaseReady && data.schemaReady;
  const regions = useMemo(() => Array.from(new Set(sites.map((site) => site.region))).sort(), [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesRegion = region === "Toutes" || site.region === region;
      const matchesStatus = status === "Tous" || site.status === status;
      const matchesRisk =
        risk === "Tous" ||
        (risk === "Critique" && site.risk >= 80) ||
        (risk === "Élevé" && site.risk >= 60 && site.risk < 80) ||
        (risk === "Modéré" && site.risk >= 40 && site.risk < 60) ||
        (risk === "Maîtrisé" && site.risk < 40);
      const haystack = `${site.code} ${site.name} ${site.organization} ${site.city} ${site.region}`.toLowerCase();
      return matchesRegion && matchesStatus && matchesRisk && haystack.includes(query.toLowerCase());
    });
  }, [query, region, risk, sites, status]);

  const selectedSite = sites.find((site) => site.code === selectedCode) ?? filteredSites[0] ?? sites[0] ?? null;

  const totals = useMemo(() => {
    const source = filteredSites.length ? filteredSites : sites;
    const meters = source.reduce((sum, site) => sum + site.meters, 0);
    const pages = source.reduce((sum, site) => sum + site.pages, 0);
    const progress = source.length
      ? Math.round(source.reduce((sum, site) => sum + site.progress, 0) / source.length)
      : 0;
    return {
      sites: source.length,
      meters,
      pages,
      progress,
      evaluated: source.filter((site) => site.status !== "Évaluation planifiée" && site.status !== "Non évalué").length,
      critical: source.filter((site) => site.risk >= 80).length,
    };
  }, [filteredSites, sites]);

  const computedRisk = Math.min(
    100,
    Math.round(
      assessment.physical * 14 +
        assessment.humidity * 13 +
        assessment.security * 12 +
        assessment.inventory * 10 +
        assessment.sensitivity * 11 +
        assessment.access * 5,
    ),
  );
  const computedPriority = Math.min(
    100,
    Math.round(computedRisk * 0.58 + assessment.sensitivity * 7 + assessment.inventory * 5),
  );

  const regionalVolumes = regions
    .map((item) => ({
      region: item,
      meters: sites.filter((site) => site.region === item).reduce((sum, site) => sum + site.meters, 0),
    }))
    .sort((a, b) => b.meters - a.meters)
    .slice(0, 6);

  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    const payload: CaptureSiteInput = {
      ...capture,
      meters: toNumber(capture.meters),
      boxes: toNumber(capture.boxes),
      pages: toNumber(capture.pages),
      risk: toNumber(capture.risk),
      priority: toNumber(capture.priority),
      progress: toNumber(capture.progress),
      latitude: capture.latitude.trim() ? toNumber(capture.latitude) : null,
      longitude: capture.longitude.trim() ? toNumber(capture.longitude) : null,
    };

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = await response.json();
      if (!response.ok) {
        throw new Error(next.message ?? "Enregistrement impossible");
      }
      setData(next as GeoArchivesDashboard);
      setSelectedCode(payload.code.toUpperCase());
      setCapture(defaultCapture);
      setFormMessage("Fiche enregistrée dans la base et tableau de bord actualisé.");
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">GA</div>
          <div>
            <p className="eyebrow">MULCV</p>
            <h1>GeoArchives</h1>
          </div>
        </div>
        <nav className="nav-list" aria-label="Modules">
          {["Carte nationale", "Registre des sites", "Évaluation", "Mobilisation", "Documents"].map((item) => (
            <button className={activeView === item ? "nav-item active" : "nav-item"} key={item} onClick={() => setActiveView(item)} type="button">
              <span className="nav-dot" aria-hidden="true" />
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-panel">
          <p className="panel-label">Source de vérité</p>
          <strong>{databaseUsable ? "PostgreSQL connecté" : "Base à initialiser"}</strong>
          <span>{databaseUsable ? "Les indicateurs viennent des tables métier." : "Ajoute DATABASE_URL puis lance migrations et seed."}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme nationale de gouvernance archivistique</p>
            <h2>{activeView}</h2>
          </div>
          <div className="topbar-actions">
            <span className={databaseUsable ? "sync-pill" : "sync-pill warning"}>{databaseUsable ? "Données DB actives" : "Configuration requise"}</span>
          </div>
        </header>

        {data.message && <SetupPanel message={data.message} />}

        <section className="filters" aria-label="Filtres de recherche">
          <label>Région<select value={region} onChange={(event) => setRegion(event.target.value)}><option>Toutes</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Statut<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tous</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Risque<select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Tous</option><option>Critique</option><option>Élevé</option><option>Modéré</option><option>Maîtrisé</option></select></label>
          <label>Recherche<input onChange={(event) => setQuery(event.target.value)} placeholder="Code, ville, direction..." type="search" value={query} /></label>
        </section>

        <section className="metric-grid" aria-label="Indicateurs nationaux">
          <Metric label="Sites recensés" value={formatNumber(totals.sites)} detail={`${totals.evaluated} évalués`} />
          <Metric label="Volume estimé" value={`${formatNumber(totals.meters)} ml`} detail={`${formatNumber(totals.pages)} pages`} />
          <Metric label="Avancement moyen" value={`${totals.progress}%`} detail="Mobilisation, traitement, GED/SAE" />
          <Metric label="Sites critiques" value={formatNumber(totals.critical)} detail="Sauvegarde ou accès urgent" />
        </section>

        {activeView === "Carte nationale" && (
          <section className="dashboard-grid">
            <div className="map-panel">
              <div className="map-head">
                <div><p className="panel-label">Carte SIG nationale</p><h3>Sites d'archives en Côte d'Ivoire</h3></div>
                <div className="legend"><span><i className="legend-risk" />Risque élevé</span><span><i className="legend-active" />En cours</span><span><i className="legend-complete" />Terminé</span></div>
              </div>
              <div className="country-map" role="img" aria-label="Carte opérationnelle des sites d'archives">
                <div className="country-shape" />
                <span className="map-label label-north">Savanes</span><span className="map-label label-west">Montagnes</span><span className="map-label label-east">Zanzan</span><span className="map-label label-south">Littoral</span>
                {filteredSites.map((site) => (
                  <button aria-label={`${site.name}, risque ${site.risk}`} className={`map-marker ${site.risk >= 80 ? "marker-risk" : site.progress === 100 ? "marker-complete" : "marker-active"}`} key={site.code} onClick={() => setSelectedCode(site.code)} style={{ left: `${site.x}%`, top: `${site.y}%` }} title={site.name} type="button"><span>{site.risk}</span></button>
                ))}
                {!filteredSites.length && <div className="map-empty">Aucun site ne correspond aux filtres actifs.</div>}
              </div>
            </div>
            {selectedSite ? <SiteDetail site={selectedSite} /> : <EmptyCard title="Aucun site" text="Crée une première fiche dans le registre ou lance le seed initial." />}
            <div className="chart-panel"><p className="panel-label">Volumes par région</p><h3>Charge de traitement</h3>{regionalVolumes.length ? <div className="bar-list">{regionalVolumes.map((item) => <div className="bar-row" key={item.region}><span>{item.region}</span><div className="bar-track"><div style={{ width: `${Math.max(12, (item.meters / regionalVolumes[0].meters) * 100)}%` }} /></div><strong>{item.meters} ml</strong></div>)}</div> : <p className="empty-text">Aucun volume à afficher.</p>}</div>
            <div className="chart-panel"><p className="panel-label">Risque et priorité</p><h3>Sites à traiter en premier</h3>{sites.length ? <div className="priority-list">{[...sites].sort((a, b) => b.priority - a.priority).slice(0, 5).map((site, index) => <button className="priority-row" key={site.code} onClick={() => setSelectedCode(site.code)} type="button"><span>{index + 1}</span><div><strong>{site.region}</strong><small>{site.name}</small></div><b>{site.priority}</b></button>)}</div> : <p className="empty-text">Aucun score disponible.</p>}</div>
          </section>
        )}

        {activeView === "Registre des sites" && (
          <section className="registry-layout">
            <div className="registry-panel">
              <div className="section-head"><div><p className="panel-label">Registre national unique</p><h3>Fiches structurées des sites</h3></div></div>
              <div className="table-wrap"><table><thead><tr><th>Code</th><th>Site</th><th>Localisation</th><th>Type</th><th>Risque</th><th>Priorité</th><th>Avancement</th></tr></thead><tbody>{filteredSites.map((site) => <tr key={site.code} onClick={() => setSelectedCode(site.code)}><td>{site.code}</td><td><strong>{site.name}</strong><span>{site.organization}</span></td><td>{site.city}, {site.region}</td><td>{site.type}</td><td><RiskBadge value={site.risk} /></td><td>{site.priority}/100</td><td><div className="mini-progress"><div style={{ width: `${site.progress}%` }} /></div></td></tr>)}</tbody></table>{!filteredSites.length && <p className="empty-text">Aucune fiche enregistrée pour ces filtres.</p>}</div>
            </div>
            <CapturePanel capture={capture} databaseUsable={databaseUsable} formMessage={formMessage} isSaving={isSaving} onChange={setCapture} onSubmit={submitCapture} />
          </section>
        )}

        {activeView === "Évaluation" && (
          <section className="assessment-grid">
            <div className="assessment-panel"><p className="panel-label">Questionnaire archivistique</p><h3>Diagnostic rapide d'un site</h3>{assessmentFields.map(({ key, label }) => <label className="range-field" key={key}><span>{label}</span><input max="5" min="1" onChange={(event) => setAssessment((current) => ({ ...current, [key]: Number(event.target.value) }))} type="range" value={assessment[key]} /><b>{assessment[key]}/5</b></label>)}</div>
            <div className="score-panel"><p className="panel-label">Calcul automatique</p><div className="score-dial" style={{ "--score": computedRisk } as CSSProperties}><span>{computedRisk}</span><small>Score de risque</small></div><div className="score-stack"><Metric label="Priorité de numérisation" value={`${computedPriority}/100`} detail="Risque, sensibilité, état et urgence" /><Metric label="Charge indicative" value={`${assessment.inventory + assessment.physical} équipes`} detail="Tri, préparation, numérisation" /></div><div className="decision-box"><strong>Décision recommandée</strong><p>{computedRisk >= 80 ? "Sauvegarde urgente, transfert sécurisé et traitement préalable avant numérisation." : computedRisk >= 60 ? "Traitement archivistique prioritaire avec numérisation centralisée." : "Numérisation sur site possible après contrôle documentaire."}</p></div></div>
          </section>
        )}

        {activeView === "Mobilisation" && (
          <section className="operations-grid">
            <div className="section-head full"><div><p className="panel-label">Planification opérationnelle</p><h3>Vagues nationales de déploiement</h3></div></div>
            {data.missions.map((mission) => <article className="mission-card" key={mission.id}><div><p className="panel-label">{mission.wave}</p><h4>{mission.region}</h4></div><span>{mission.dates}</span><p>{mission.team}</p><strong>{mission.focus}</strong></article>)}
            {!data.missions.length && <EmptyCard title="Aucune mission" text="Les missions apparaîtront ici après seed ou création en base." />}
            {selectedSite && <div className="timeline-panel"><p className="panel-label">Chronologie du site sélectionné</p><h3>{selectedSite.name}</h3>{["Capture GPS et fiche initiale", "Évaluation archivistique", "Plan de mobilisation", selectedSite.nextStep].map((item, index) => <div className="timeline-item" key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div>}
          </section>
        )}

        {activeView === "Documents" && (
          <section className="documents-grid">
            <div className="section-head full"><div><p className="panel-label">Pièces justificatives</p><h3>Espace documentaire sécurisé</h3></div></div>
            {data.documents.map((document) => <article className="document-card" key={document.label}><span className="document-icon" aria-hidden="true">{document.label.slice(0, 2)}</span><div><strong>{document.label}</strong><p>{document.trend}</p></div><b>{document.count}</b></article>)}
            {!data.documents.length && <EmptyCard title="Aucune pièce" text="Les rapports, photos et inventaires apparaîtront après dépôt en base." />}
            <div className="audit-panel"><p className="panel-label">Journal d'audit</p><h3>Traçabilité récente</h3>{data.auditEntries.map((entry) => <p key={entry.id}>{entry.description}<small>{entry.actor}</small></p>)}{!data.auditEntries.length && <p>Aucune action auditée pour le moment.</p>}</div>
          </section>
        )}
      </section>
    </main>
  );
}

function SetupPanel({ message }: { message: string }) {
  return <section className="setup-panel"><strong>Base de données</strong><p>{message}</p><code>DATABASE_URL=... npm run db:migrate && npm run db:seed && npm run dev</code></section>;
}

function CapturePanel({ capture, databaseUsable, formMessage, isSaving, onChange, onSubmit }: { capture: CaptureFormState; databaseUsable: boolean; formMessage: string | null; isSaving: boolean; onChange: (next: CaptureFormState) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  function update<K extends keyof CaptureFormState>(key: K, value: CaptureFormState[K]) {
    onChange({ ...capture, [key]: value });
  }

  return (
    <form className="capture-panel" onSubmit={onSubmit}>
      <div><p className="panel-label">Capture terrain</p><h3>Nouvelle fiche site</h3></div>
      <div className="form-grid">
        <label>Code site<input required value={capture.code} onChange={(event) => update("code", event.target.value)} placeholder="MULCV-REG-001" /></label>
        <label>Nom du site<input required value={capture.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Organisation<input required value={capture.organization} onChange={(event) => update("organization", event.target.value)} /></label>
        <label>Type<select value={capture.type} onChange={(event) => update("type", event.target.value)}>{siteTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>District<input required value={capture.district} onChange={(event) => update("district", event.target.value)} /></label>
        <label>Région<input required value={capture.region} onChange={(event) => update("region", event.target.value)} /></label>
        <label>Département<input required value={capture.department} onChange={(event) => update("department", event.target.value)} /></label>
        <label>Ville<input required value={capture.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label>Latitude<input value={capture.latitude} onChange={(event) => update("latitude", event.target.value)} inputMode="decimal" /></label>
        <label>Longitude<input value={capture.longitude} onChange={(event) => update("longitude", event.target.value)} inputMode="decimal" /></label>
        <label>Mètres linéaires<input value={capture.meters} onChange={(event) => update("meters", event.target.value)} inputMode="decimal" /></label>
        <label>Boîtes<input value={capture.boxes} onChange={(event) => update("boxes", event.target.value)} inputMode="numeric" /></label>
        <label>Pages<input value={capture.pages} onChange={(event) => update("pages", event.target.value)} inputMode="numeric" /></label>
        <label>Risque<input min="0" max="100" value={capture.risk} onChange={(event) => update("risk", event.target.value)} type="number" /></label>
        <label>Priorité<input min="0" max="100" value={capture.priority} onChange={(event) => update("priority", event.target.value)} type="number" /></label>
        <label>Avancement<input min="0" max="100" value={capture.progress} onChange={(event) => update("progress", event.target.value)} type="number" /></label>
        <label>Confidentialité<select value={capture.confidentiality} onChange={(event) => update("confidentiality", event.target.value as DashboardSite["confidentiality"])}>{confidentialityLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Statut<select value={capture.status} onChange={(event) => update("status", event.target.value as SiteStatusLabel)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Point focal<input required value={capture.lead} onChange={(event) => update("lead", event.target.value)} /></label>
        <label>Téléphone<input value={capture.phone} onChange={(event) => update("phone", event.target.value)} /></label>
        <label className="wide">Prochaine action<input value={capture.nextStep} onChange={(event) => update("nextStep", event.target.value)} /></label>
      </div>
      {formMessage && <p className="form-message">{formMessage}</p>}
      <button className="primary-button" disabled={!databaseUsable || isSaving} type="submit">{isSaving ? "Enregistrement..." : "Enregistrer dans les tables"}</button>
    </form>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return <article className="chart-panel"><p className="panel-label">Données</p><h3>{title}</h3><p className="empty-text">{text}</p></article>;
}

function RiskBadge({ value }: { value: number }) {
  return <span className={`risk-badge ${value >= 80 ? "risk-critical" : value >= 60 ? "risk-high" : value >= 40 ? "risk-medium" : "risk-low"}`}>{riskLabel(value)} {value}</span>;
}

function SiteDetail({ site }: { site: DashboardSite }) {
  return (
    <aside className="detail-panel">
      <div className="detail-head"><div><p className="panel-label">{site.code}</p><h3>{site.name}</h3></div><RiskBadge value={site.risk} /></div>
      <span className={`status-pill ${statusClass(site.status)}`}>{site.status}</span>
      <dl className="detail-list">
        <div><dt>Organisation</dt><dd>{site.organization}</dd></div>
        <div><dt>Localisation</dt><dd>{site.city}, {site.department} - {site.region}</dd></div>
        <div><dt>GPS</dt><dd>{site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : "Coordonnées à capturer"}</dd></div>
        <div><dt>Responsable</dt><dd>{site.lead} · {site.phone}</dd></div>
        <div><dt>Volume</dt><dd>{site.meters} ml · {formatNumber(site.boxes)} boîtes · {formatNumber(site.pages)} pages</dd></div>
        <div><dt>Confidentialité</dt><dd>{site.confidentiality}</dd></div>
      </dl>
      <div className="progress-block"><div><span>Avancement global</span><strong>{site.progress}%</strong></div><div className="progress-track"><div style={{ width: `${site.progress}%` }} /></div></div>
      <div className="next-step"><span>Prochaine action</span><p>{site.nextStep}</p></div>
    </aside>
  );
}

function toNumber(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
