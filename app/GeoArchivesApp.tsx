"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type Status =
  | "Évaluation planifiée"
  | "Évaluation réalisée"
  | "Mobilisation en cours"
  | "Traitement en cours"
  | "Numérisation en cours"
  | "Contrôle qualité"
  | "Traitement terminé"
  | "Risque élevé"
  | "Inaccessible";

type Site = {
  code: string;
  name: string;
  organization: string;
  region: string;
  district: string;
  department: string;
  city: string;
  type: string;
  status: Status;
  risk: number;
  priority: number;
  meters: number;
  boxes: number;
  pages: number;
  progress: number;
  confidentiality: "Faible" | "Interne" | "Confidentiel" | "Critique";
  x: number;
  y: number;
  lead: string;
  phone: string;
  nextStep: string;
};

type Assessment = {
  physical: number;
  humidity: number;
  security: number;
  inventory: number;
  sensitivity: number;
  access: number;
};

type AssessmentKey = keyof Assessment;

const sites: Site[] = [
  {
    code: "MULCV-ABJ-001",
    name: "Archives Direction centrale",
    organization: "Direction des archives et de la documentation",
    region: "Abidjan",
    district: "District autonome d'Abidjan",
    department: "Abidjan",
    city: "Plateau",
    type: "Direction centrale",
    status: "Numérisation en cours",
    risk: 72,
    priority: 88,
    meters: 420,
    boxes: 1840,
    pages: 1240000,
    progress: 54,
    confidentiality: "Critique",
    x: 42,
    y: 82,
    lead: "Koffi Yao",
    phone: "+225 07 00 00 11 24",
    nextStep: "Contrôle qualité sur les lots fonciers prioritaires",
  },
  {
    code: "MULCV-GBK-014",
    name: "Dépôt régional de Gbêkê",
    organization: "Direction régionale du Centre",
    region: "Gbêkê",
    district: "Vallée du Bandama",
    department: "Bouaké",
    city: "Bouaké",
    type: "Dépôt d'archives",
    status: "Risque élevé",
    risk: 91,
    priority: 93,
    meters: 680,
    boxes: 2620,
    pages: 1820000,
    progress: 18,
    confidentiality: "Confidentiel",
    x: 50,
    y: 44,
    lead: "Aminata Coulibaly",
    phone: "+225 05 00 00 48 16",
    nextStep: "Sauvegarde urgente et reconditionnement avant transfert",
  },
  {
    code: "MULCV-SAS-022",
    name: "Centre temporaire de San-Pédro",
    organization: "Antenne de traitement CEIBA",
    region: "San-Pédro",
    district: "Bas-Sassandra",
    department: "San-Pédro",
    city: "San-Pédro",
    type: "Centre temporaire",
    status: "Mobilisation en cours",
    risk: 58,
    priority: 71,
    meters: 310,
    boxes: 1170,
    pages: 810000,
    progress: 33,
    confidentiality: "Interne",
    x: 25,
    y: 76,
    lead: "Serge Dago",
    phone: "+225 01 00 00 39 92",
    nextStep: "Installer deux scanners et valider la zone de préparation",
  },
  {
    code: "MULCV-POR-006",
    name: "Direction régionale du Poro",
    organization: "Direction régionale Nord",
    region: "Poro",
    district: "Savanes",
    department: "Korhogo",
    city: "Korhogo",
    type: "Direction régionale",
    status: "Évaluation réalisée",
    risk: 44,
    priority: 62,
    meters: 180,
    boxes: 690,
    pages: 412000,
    progress: 22,
    confidentiality: "Interne",
    x: 47,
    y: 17,
    lead: "Mamadou Soro",
    phone: "+225 07 00 00 27 43",
    nextStep: "Planifier la mission de numérisation sur site",
  },
  {
    code: "MULCV-TON-031",
    name: "Agence départementale de Tonkpi",
    organization: "Service départemental Ouest",
    region: "Tonkpi",
    district: "Montagnes",
    department: "Man",
    city: "Man",
    type: "Agence rattachée",
    status: "Évaluation planifiée",
    risk: 63,
    priority: 67,
    meters: 260,
    boxes: 940,
    pages: 590000,
    progress: 8,
    confidentiality: "Confidentiel",
    x: 19,
    y: 47,
    lead: "Nadine Guei",
    phone: "+225 05 00 00 15 68",
    nextStep: "Visite terrain et capture GPS confirmée",
  },
  {
    code: "MULCV-COM-019",
    name: "Local d'archives communal",
    organization: "Direction départementale du Sud-Comoé",
    region: "Sud-Comoé",
    district: "Comoé",
    department: "Aboisso",
    city: "Aboisso",
    type: "Local d'archives",
    status: "Contrôle qualité",
    risk: 35,
    priority: 58,
    meters: 145,
    boxes: 510,
    pages: 260000,
    progress: 77,
    confidentiality: "Faible",
    x: 62,
    y: 83,
    lead: "Jean Kouadio",
    phone: "+225 01 00 00 22 08",
    nextStep: "Clôturer les reprises de lots rejetés",
  },
  {
    code: "MULCV-GOH-010",
    name: "Dépôt de Gôh",
    organization: "Direction régionale Centre-Ouest",
    region: "Gôh",
    district: "Gôh-Djiboua",
    department: "Gagnoa",
    city: "Gagnoa",
    type: "Dépôt d'archives",
    status: "Traitement en cours",
    risk: 66,
    priority: 76,
    meters: 390,
    boxes: 1390,
    pages: 930000,
    progress: 41,
    confidentiality: "Confidentiel",
    x: 34,
    y: 63,
    lead: "Florence Bédi",
    phone: "+225 07 00 00 63 41",
    nextStep: "Finaliser le tri des dossiers sans référence",
  },
  {
    code: "MULCV-ZAN-027",
    name: "Unité mobile Est",
    organization: "Équipe mobile de numérisation",
    region: "Zanzan",
    district: "Zanzan",
    department: "Bondoukou",
    city: "Bondoukou",
    type: "Unité mobile",
    status: "Traitement terminé",
    risk: 29,
    priority: 45,
    meters: 95,
    boxes: 320,
    pages: 180000,
    progress: 100,
    confidentiality: "Interne",
    x: 77,
    y: 37,
    lead: "Issa Koné",
    phone: "+225 05 00 00 74 19",
    nextStep: "Transférer les originaux vers le stockage sécurisé",
  },
  {
    code: "MULCV-KAB-044",
    name: "Local inaccessible de Kabadougou",
    organization: "Direction départementale Nord-Ouest",
    region: "Kabadougou",
    district: "Denguélé",
    department: "Odienné",
    city: "Odienné",
    type: "Local d'archives",
    status: "Inaccessible",
    risk: 84,
    priority: 81,
    meters: 230,
    boxes: 850,
    pages: 470000,
    progress: 0,
    confidentiality: "Confidentiel",
    x: 22,
    y: 20,
    lead: "Fatou Traoré",
    phone: "+225 01 00 00 51 77",
    nextStep: "Lever la contrainte d'accès avec la logistique",
  },
];

const statuses: Status[] = [
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

const assessmentFields: { key: AssessmentKey; label: string }[] = [
  { key: "physical", label: "État physique des documents" },
  { key: "humidity", label: "Humidité, moisissures et inondation" },
  { key: "security", label: "Sécurité et contrôle des accès" },
  { key: "inventory", label: "Absence d'inventaire ou de classement" },
  { key: "sensitivity", label: "Sensibilité documentaire" },
  { key: "access", label: "Difficulté d'accès et logistique" },
];

const missionPlan = [
  {
    wave: "Vague 1",
    region: "Gbêkê, Abidjan",
    dates: "22 juil. - 02 août",
    team: "2 équipes SDA, 1 équipe CEIBA",
    focus: "Sites critiques, volumes supérieurs à 400 ml",
  },
  {
    wave: "Vague 2",
    region: "Gôh, San-Pédro",
    dates: "05 août - 16 août",
    team: "Archivage, numérisation, logistique",
    focus: "Préparation et transfert vers centre temporaire",
  },
  {
    wave: "Vague 3",
    region: "Poro, Zanzan",
    dates: "19 août - 30 août",
    team: "Unités mobiles et support IT/SIG",
    focus: "Numérisation sur site et validation documentaire",
  },
];

const documents = [
  { label: "Rapports de visite", count: 18, trend: "+6 cette semaine" },
  { label: "Photographies géolocalisées", count: 426, trend: "+84 cette semaine" },
  { label: "Inventaires importés", count: 31, trend: "+5 validés" },
  { label: "Procès-verbaux signés", count: 12, trend: "4 en attente" },
];

const regions = Array.from(new Set(sites.map((site) => site.region))).sort();

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function riskLabel(value: number) {
  if (value >= 80) return "Critique";
  if (value >= 60) return "Élevé";
  if (value >= 40) return "Modéré";
  return "Maîtrisé";
}

function statusClass(status: Status) {
  if (status === "Risque élevé" || status === "Inaccessible") return "status-risk";
  if (status === "Traitement terminé") return "status-complete";
  if (status === "Évaluation planifiée") return "status-planned";
  return "status-active";
}

export default function GeoArchivesApp() {
  const [activeView, setActiveView] = useState("Carte nationale");
  const [region, setRegion] = useState("Toutes");
  const [status, setStatus] = useState("Tous");
  const [risk, setRisk] = useState("Tous");
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState(sites[0].code);
  const [assessment, setAssessment] = useState<Assessment>({
    physical: 4,
    humidity: 5,
    security: 3,
    inventory: 4,
    sensitivity: 5,
    access: 2,
  });

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
  }, [query, region, risk, status]);

  const selectedSite = sites.find((site) => site.code === selectedCode) ?? filteredSites[0] ?? sites[0];

  const totals = useMemo(() => {
    const source = filteredSites.length ? filteredSites : sites;
    const meters = source.reduce((sum, site) => sum + site.meters, 0);
    const pages = source.reduce((sum, site) => sum + site.pages, 0);
    const progress = Math.round(source.reduce((sum, site) => sum + site.progress, 0) / source.length);
    return {
      sites: source.length,
      meters,
      pages,
      progress,
      evaluated: source.filter((site) => site.status !== "Évaluation planifiée").length,
      critical: source.filter((site) => site.risk >= 80).length,
    };
  }, [filteredSites]);

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
  const computedPriority = Math.min(100, Math.round(computedRisk * 0.58 + assessment.sensitivity * 7 + assessment.inventory * 5));

  const regionalVolumes = regions
    .map((item) => ({
      region: item,
      meters: sites.filter((site) => site.region === item).reduce((sum, site) => sum + site.meters, 0),
    }))
    .sort((a, b) => b.meters - a.meters)
    .slice(0, 6);

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
          <p className="panel-label">Profil actif</p>
          <strong>PMO MULCV</strong>
          <span>Suivi national, planification et arbitrage des priorités.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme nationale de gouvernance archivistique</p>
            <h2>{activeView}</h2>
          </div>
          <div className="topbar-actions">
            <span className="sync-pill">Mode hors connexion prêt</span>
            <button className="icon-button" title="Exporter les données" type="button">XLS</button>
            <button className="icon-button" title="Générer un rapport PDF" type="button">PDF</button>
          </div>
        </header>

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
              </div>
            </div>
            <SiteDetail site={selectedSite} />
            <div className="chart-panel"><p className="panel-label">Volumes par région</p><h3>Charge de traitement</h3><div className="bar-list">{regionalVolumes.map((item) => <div className="bar-row" key={item.region}><span>{item.region}</span><div className="bar-track"><div style={{ width: `${Math.max(12, (item.meters / regionalVolumes[0].meters) * 100)}%` }} /></div><strong>{item.meters} ml</strong></div>)}</div></div>
            <div className="chart-panel"><p className="panel-label">Risque et priorité</p><h3>Sites à traiter en premier</h3><div className="priority-list">{[...sites].sort((a, b) => b.priority - a.priority).slice(0, 5).map((site, index) => <button className="priority-row" key={site.code} onClick={() => setSelectedCode(site.code)} type="button"><span>{index + 1}</span><div><strong>{site.region}</strong><small>{site.name}</small></div><b>{site.priority}</b></button>)}</div></div>
          </section>
        )}

        {activeView === "Registre des sites" && (
          <section className="registry-panel">
            <div className="section-head"><div><p className="panel-label">Registre national unique</p><h3>Fiches structurées des sites</h3></div><button className="primary-button" type="button">Nouveau site</button></div>
            <div className="table-wrap"><table><thead><tr><th>Code</th><th>Site</th><th>Localisation</th><th>Type</th><th>Risque</th><th>Priorité</th><th>Avancement</th></tr></thead><tbody>{filteredSites.map((site) => <tr key={site.code} onClick={() => setSelectedCode(site.code)}><td>{site.code}</td><td><strong>{site.name}</strong><span>{site.organization}</span></td><td>{site.city}, {site.region}</td><td>{site.type}</td><td><RiskBadge value={site.risk} /></td><td>{site.priority}/100</td><td><div className="mini-progress"><div style={{ width: `${site.progress}%` }} /></div></td></tr>)}</tbody></table></div>
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
            <div className="section-head full"><div><p className="panel-label">Planification opérationnelle</p><h3>Vagues nationales de déploiement</h3></div><button className="primary-button" type="button">Créer une mission</button></div>
            {missionPlan.map((mission) => <article className="mission-card" key={mission.wave}><div><p className="panel-label">{mission.wave}</p><h4>{mission.region}</h4></div><span>{mission.dates}</span><p>{mission.team}</p><strong>{mission.focus}</strong></article>)}
            <div className="timeline-panel"><p className="panel-label">Chronologie du site sélectionné</p><h3>{selectedSite.name}</h3>{["Capture GPS et fiche initiale", "Évaluation archivistique validée", "Plan de mobilisation généré", selectedSite.nextStep].map((item, index) => <div className="timeline-item" key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div>
          </section>
        )}

        {activeView === "Documents" && (
          <section className="documents-grid">
            <div className="section-head full"><div><p className="panel-label">Pièces justificatives</p><h3>Espace documentaire sécurisé</h3></div><button className="primary-button" type="button">Joindre un fichier</button></div>
            {documents.map((document) => <article className="document-card" key={document.label}><span className="document-icon" aria-hidden="true">{document.label.slice(0, 2)}</span><div><strong>{document.label}</strong><p>{document.trend}</p></div><b>{document.count}</b></article>)}
            <div className="audit-panel"><p className="panel-label">Journal d'audit</p><h3>Traçabilité récente</h3>{["SDA a validé l'évaluation MULCV-GBK-014", "CEIBA a importé 84 photographies géolocalisées", "PMO a priorisé la vague Gbêkê - Abidjan", "Auditeur a consulté les pièces du site Abidjan"].map((entry) => <p key={entry}>{entry}</p>)}</div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function RiskBadge({ value }: { value: number }) {
  return <span className={`risk-badge ${value >= 80 ? "risk-critical" : value >= 60 ? "risk-high" : value >= 40 ? "risk-medium" : "risk-low"}`}>{riskLabel(value)} {value}</span>;
}

function SiteDetail({ site }: { site: Site }) {
  return (
    <aside className="detail-panel">
      <div className="detail-head"><div><p className="panel-label">{site.code}</p><h3>{site.name}</h3></div><RiskBadge value={site.risk} /></div>
      <span className={`status-pill ${statusClass(site.status)}`}>{site.status}</span>
      <dl className="detail-list">
        <div><dt>Organisation</dt><dd>{site.organization}</dd></div>
        <div><dt>Localisation</dt><dd>{site.city}, {site.department} - {site.region}</dd></div>
        <div><dt>Responsable</dt><dd>{site.lead} · {site.phone}</dd></div>
        <div><dt>Volume</dt><dd>{site.meters} ml · {formatNumber(site.boxes)} boîtes · {formatNumber(site.pages)} pages</dd></div>
        <div><dt>Confidentialité</dt><dd>{site.confidentiality}</dd></div>
      </dl>
      <div className="progress-block"><div><span>Avancement global</span><strong>{site.progress}%</strong></div><div className="progress-track"><div style={{ width: `${site.progress}%` }} /></div></div>
      <div className="next-step"><span>Prochaine action</span><p>{site.nextStep}</p></div>
    </aside>
  );
}
