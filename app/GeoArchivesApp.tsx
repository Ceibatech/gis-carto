"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CaptureSiteInput,
  DashboardSite,
  GeoArchivesDashboard,
  MissionPlanItem,
  SiteStatusLabel,
} from "../lib/geoarchives-types";
import { geoArchivesApiUrl } from "../lib/api-url";
import { rgphDistricts } from "../lib/rgph-territories";

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
  | "meters"
  | "storageCapacityMl"
  | "boxes"
  | "files"
  | "pages"
  | "risk"
  | "priority"
  | "progress"
  | "latitude"
  | "longitude"
  | "totalAgents"
  | "archiveRoomsCount"
  | "dateRangeStart"
  | "dateRangeEnd"
  | "documentCategories"
  | "travelTimeMinutes"
  | "photoReferences"
  | "gpsAccuracyMeters"
  | "gpsCapturedAt"
> & {
  meters: string;
  storageCapacityMl: string;
  boxes: string;
  files: string;
  pages: string;
  latitude: string;
  longitude: string;
  totalAgents: string;
  archiveRoomsCount: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  documentCategoriesText: string;
  travelTimeMinutes: string;
  photoReferencesText: string;
  gpsAccuracyMeters: string;
  gpsCapturedAt: string;
};

const captureDraftStorageKey = "geoarchives-capture-draft-v2";
const captureQueueStorageKey = "geoarchives-capture-queue-v2";
const compactModeStorageKey = "geoarchives-compact-mode-v1";

const accessibilityOptions = [
  "Accessible",
  "Accès limité",
  "Accès difficile",
  "Site isolé",
  "Accès restreint",
];

const roadConditionOptions = ["Bonne", "Dégradée", "Très dégradée", "Saisonnière", "Piste rurale"];
const networkQualityOptions = ["Bonne", "Moyenne", "Faible", "Très faible", "Aucune couverture"];
const buildingConditionOptions = ["Bon état", "État moyen", "Fragile", "Très dégradé"];
const storageConditionOptions = ["Adapté", "Acceptable", "Saturé", "Inadapté"];
const riskLevelOptions = ["Faible", "Modéré", "Élevé", "Critique"];

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

const statusProgress: Record<SiteStatusLabel, number> = {
  "Non \u00e9valu\u00e9": 0,
  "\u00c9valuation planifi\u00e9e": 10,
  "\u00c9valuation r\u00e9alis\u00e9e": 30,
  "Mobilisation en cours": 45,
  "Traitement en cours": 62,
  "Num\u00e9risation en cours": 76,
  "Contr\u00f4le qualit\u00e9": 88,
  "Traitement termin\u00e9": 100,
  "Risque \u00e9lev\u00e9": 20,
  Inaccessible: 5,
};

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

type NavigationItem = {
  view: string;
  label: string;
  helper: string;
};

const navigationItems: { section: string; items: NavigationItem[] }[] = [
  {
    section: "Pilotage national",
    items: [
      { view: "Vue executive", label: "Vue executive", helper: "Arbitrages et alertes" },
      { view: "Carte nationale", label: "Carte nationale", helper: "Lecture territoriale" },
    ],
  },
  {
    section: "Conduite terrain",
    items: [
      { view: "Registre des sites", label: "Registre", helper: "Fiches et collecte" },
      { view: "Evaluation", label: "Evaluation", helper: "Scores de priorité" },
      { view: "Mobilisation", label: "Mobilisation", helper: "Vagues et équipes" },
      { view: "Documents", label: "Documents", helper: "Pièces et audit" },
    ],
  },
];

const viewNarratives: Record<string, string> = {
  "Vue executive": "Synthèse nationale pour arbitrer les priorités de conservation et de numérisation.",
  "Carte nationale": "Vision territoriale des sites, risques et progression des opérations.",
  "Registre des sites": "Fiches terrain structurées et capture métier centralisée.",
  Evaluation: "Diagnostic archivistique et calcul automatisé des niveaux de risque.",
  Mobilisation: "Programmation des vagues terrain, équipes et chronologie d'intervention.",
  Documents: "Traçabilité documentaire et audit continu des pièces justificatives.",
};

const viewIconMap: Record<string, string> = {
  "Vue executive": "◆",
  "Carte nationale": "◎",
  "Registre des sites": "▦",
  Evaluation: "△",
  Mobilisation: "◈",
  Documents: "▤",
};

const InteractiveNationalMap = dynamic(() => import("./SiteOperationsMap"), {
  loading: () => <div className="map-fallback">Chargement de la carte interactive...</div>,
  ssr: false,
});

function viewThemeClass(view: string) {
  switch (view) {
    case "Vue executive":
      return "view-executive";
    case "Carte nationale":
      return "view-map";
    case "Registre des sites":
      return "view-registry";
    case "Evaluation":
      return "view-assessment";
    case "Mobilisation":
      return "view-operations";
    case "Documents":
      return "view-documents";
    default:
      return "view-executive";
  }
}

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
  region: rgphDistricts[0]?.regions[0] ?? "",
  district: rgphDistricts[0]?.district ?? "",
  department: "",
  subPrefecture: "",
  commune: "",
  city: "",
  address: "",
  accessLandmarks: "",
  accessibility: accessibilityOptions[0],
  roadCondition: roadConditionOptions[0],
  lastMileCondition: roadConditionOptions[0],
  travelTimeMinutes: "0",
  networkQuality: networkQualityOptions[1],
  buildingCondition: buildingConditionOptions[1],
  storageCondition: storageConditionOptions[1],
  waterRiskLevel: riskLevelOptions[1],
  securityRiskLevel: riskLevelOptions[1],
  seasonalConstraints: "",
  surveyNotes: "",
  photoReferencesText: "",
  type: "Dépôt d'archives",
  status: "Évaluation planifiée",
  meters: "0",
  storageCapacityMl: "0",
  boxes: "0",
  files: "0",
  pages: "0",
  totalAgents: "0",
  archiveRoomsCount: "0",
  documentCategoriesText: "Archives administratives, dossiers courants",
  dateRangeStart: "",
  dateRangeEnd: "",
  hasInventory: false,
  hasElectricity: false,
  hasInternet: false,
  hasAccessControl: false,
  hasFireDetection: false,
  checklistVehicleAccess: false,
  checklistLoadingArea: false,
  checklistSiteSignage: false,
  checklistArchivesSeparated: false,
  checklistShelvingAvailable: false,
  checklistHumidityObserved: false,
  checklistPestObserved: false,
  checklistFireExtinguisher: false,
  checklistBackupPower: false,
  checklistImmediateRiskReported: false,
  confidentiality: "Interne",
  latitude: "",
  longitude: "",
  gpsAccuracyMeters: "",
  gpsCapturedAt: "",
  lead: "",
  respondentRole: "Responsable du site",
  respondentEmail: "",
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

function scoreOf(value: string, scores: Record<string, number>) {
  return scores[value] ?? 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveCaptureScores(capture: CaptureFormState) {
  const waterRisk = scoreOf(capture.waterRiskLevel, { Faible: 4, "Mod\u00e9r\u00e9": 16, "\u00c9lev\u00e9": 31, Critique: 45 });
  const securityRisk = scoreOf(capture.securityRiskLevel, { Faible: 3, "Mod\u00e9r\u00e9": 12, "\u00c9lev\u00e9": 24, Critique: 36 });
  const buildingRisk = scoreOf(capture.buildingCondition, { "Bon \u00e9tat": 0, "\u00c9tat moyen": 8, Fragile: 18, "Tr\u00e8s d\u00e9grad\u00e9": 28 });
  const storageRisk = scoreOf(capture.storageCondition, { "Adapt\u00e9": 0, Acceptable: 6, "Satur\u00e9": 16, "Inadapt\u00e9": 26 });
  const operationalRisk =
    (capture.checklistHumidityObserved ? 10 : 0) +
    (capture.checklistPestObserved ? 8 : 0) +
    (capture.checklistImmediateRiskReported ? 12 : 0) +
    (!capture.hasFireDetection ? 6 : 0) +
    (!capture.hasAccessControl ? 5 : 0) +
    (!capture.hasInventory ? 6 : 0);
  const risk = clampScore(waterRisk + securityRisk + buildingRisk + storageRisk + operationalRisk);

  const meters = toNumber(capture.meters);
  const boxes = toNumber(capture.boxes);
  const pages = toNumber(capture.pages);
  const travelTime = toNumber(capture.travelTimeMinutes);
  const volumePressure = Math.min(18, meters / 20 + boxes / 180 + pages / 50000);
  const logisticsPressure =
    scoreOf(capture.accessibility, { Accessible: 0, "Acc\u00e8s limit\u00e9": 4, "Acc\u00e8s difficile": 8, "Site isol\u00e9": 12, "Acc\u00e8s restreint": 10 }) +
    scoreOf(capture.roadCondition, { Bonne: 0, "D\u00e9grad\u00e9e": 4, "Tr\u00e8s d\u00e9grad\u00e9e": 8, "Saisonni\u00e8re": 7, "Piste rurale": 8 }) +
    scoreOf(capture.lastMileCondition, { Bonne: 0, "D\u00e9grad\u00e9e": 3, "Tr\u00e8s d\u00e9grad\u00e9e": 7, "Saisonni\u00e8re": 7, "Piste rurale": 8 }) +
    scoreOf(capture.networkQuality, { Bonne: 0, Moyenne: 2, Faible: 5, "Tr\u00e8s faible": 8, "Aucune couverture": 10 }) +
    Math.min(8, travelTime / 25);
  const sensitivity = scoreOf(capture.confidentiality, { Faible: 0, Interne: 3, Confidentiel: 9, Critique: 14 });
  const priority = clampScore(risk * 0.62 + volumePressure + logisticsPressure + sensitivity);

  return {
    priority,
    progress: clampScore(statusProgress[capture.status] ?? 0),
    risk,
  };
}

function statusClass(status: SiteStatusLabel) {
  if (status === "Risque élevé" || status === "Inaccessible") return "status-risk";
  if (status === "Traitement terminé") return "status-complete";
  if (status === "Évaluation planifiée" || status === "Non évalué") return "status-planned";
  return "status-active";
}

function siteTerritoryMeta(site: DashboardSite) {
  if (site.type === "Direction centrale") {
    return { label: "National", tone: "territory-national" };
  }
  if (site.type === "Direction régionale") {
    return { label: "Régional", tone: "territory-regional" };
  }
  if (site.type === "Direction départementale") {
    return { label: "Départemental", tone: "territory-departmental" };
  }
  return { label: "Terrain", tone: "territory-local" };
}

function missionStatusMeta(mission: MissionPlanItem) {
  const now = Date.now();
  const start = new Date(mission.startDate).getTime();
  const end = new Date(mission.endDate).getTime();
  const rawStatus = mission.status.toLowerCase();
  const isCompleted = rawStatus.includes("complete") || rawStatus.includes("done") || rawStatus.includes("closed");
  const isPlanned = rawStatus.includes("plan") || rawStatus.includes("draft") || rawStatus.includes("schedule");

  if (isCompleted || end < now) {
    return {
      label: "Terminée",
      phase: "completed",
      tone: "complete",
      timeline: `Clôturée le ${formatLongDate(mission.endDate)}`,
    } as const;
  }

  if (!isPlanned && start <= now && end >= now) {
    return {
      label: "En cours",
      phase: "active",
      tone: "active",
      timeline: `En cours jusqu'au ${formatLongDate(mission.endDate)}`,
    } as const;
  }

  const daysUntilStart = Math.max(0, Math.ceil((start - now) / 86400000));
  return {
    label: daysUntilStart <= 7 ? "Imminente" : "Planifiée",
    phase: "upcoming",
    tone: daysUntilStart <= 7 ? "watch" : "planned",
    timeline: daysUntilStart === 0 ? "Démarrage aujourd'hui" : `Démarrage dans ${daysUntilStart} jour(s)`,
  } as const;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function readStoredCaptureDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(captureDraftStorageKey);
    return raw ? ({ ...defaultCapture, ...(JSON.parse(raw) as Partial<CaptureFormState>) }) : null;
  } catch {
    return null;
  }
}

function readStoredCaptureQueue() {
  if (typeof window === "undefined") return [] as CaptureSiteInput[];

  try {
    const raw = window.localStorage.getItem(captureQueueStorageKey);
    return raw ? (JSON.parse(raw) as CaptureSiteInput[]) : [];
  } catch {
    return [];
  }
}

export default function GeoArchivesApp({ initialData }: { initialData: GeoArchivesDashboard }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("Vue executive");
  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = window.localStorage.getItem(compactModeStorageKey);
    if (stored === "1" || stored === "0") {
      return stored === "1";
    }

    return window.matchMedia("(max-width: 1024px)").matches;
  });
  const [region, setRegion] = useState("Toutes");
  const [status, setStatus] = useState("Tous");
  const [risk, setRisk] = useState("Tous");
  const [territoryLevel, setTerritoryLevel] = useState("Tous");
  const [missionPhase, setMissionPhase] = useState("Tous");
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState(initialData.sites[0]?.code ?? "");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [capture, setCapture] = useState<CaptureFormState>(() => readStoredCaptureDraft() ?? defaultCapture);
  const [pendingCaptures, setPendingCaptures] = useState<CaptureSiteInput[]>(() => readStoredCaptureQueue());
  const [isOnline, setIsOnline] = useState(() => (typeof window === "undefined" ? true : window.navigator.onLine));
  const [draftRestored, setDraftRestored] = useState(() => Boolean(readStoredCaptureDraft()));
  const [assessment, setAssessment] = useState<Assessment>({
    physical: 4,
    humidity: 5,
    security: 3,
    inventory: 4,
    sensitivity: 5,
    access: 2,
  });

  const sites = data.sites;
  const missions = data.missions;
  const databaseUsable = data.databaseReady && data.schemaReady;
  const sourceState = databaseUsable
    ? {
        title: "Dispositif opérationnel",
        detail: "Les remontées terrain et les indicateurs nationaux sont disponibles.",
        badge: "Service actif",
        badgeClass: "sync-pill",
      }
    : data.databaseReady
      ? {
          title: "Ouverture en préparation",
          detail: "Le registre national finalise sa mise en service avant ouverture complète.",
          badge: "Mise en service",
          badgeClass: "sync-pill warning",
        }
      : {
          title: "Démarrage de campagne",
          detail: "La plateforme se prépare à recevoir les premières remontées terrain.",
          badge: "Ouverture prochaine",
          badgeClass: "sync-pill warning",
        };
    const rgphRegionsForCapture = useMemo(() => {
      const selectedDistrict = rgphDistricts.find((item) => item.district === capture.district);
      return selectedDistrict?.regions ?? [];
    }, [capture.district]);
  const regions = useMemo(() => Array.from(new Set(sites.map((site) => site.region))).sort(), [sites]);
    const missionsBySiteCode = useMemo(() => {
      const ranking = { active: 3, upcoming: 2, completed: 1 } as const;
      const map = new Map<string, ReturnType<typeof missionStatusMeta>>();

      for (const mission of missions) {
        const snapshot = missionStatusMeta(mission);
        const relatedSites = mission.assignedSiteCodes.length
          ? sites.filter((site) => mission.assignedSiteCodes.includes(site.code))
          : sites.filter((site) => site.region === mission.region);

        for (const site of relatedSites) {
          const previous = map.get(site.code);
          if (!previous || ranking[snapshot.phase] > ranking[previous.phase]) {
            map.set(site.code, snapshot);
          }
        }
      }

      return map;
    }, [missions, sites]);

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
      const territory = siteTerritoryMeta(site);
      const siteMission = missionsBySiteCode.get(site.code);
      const matchesTerritory = territoryLevel === "Tous" || territory.label === territoryLevel;
      const matchesMissionPhase = missionPhase === "Tous" || siteMission?.label === missionPhase;
      const haystack = `${site.code} ${site.name} ${site.organization} ${site.city} ${site.region}`.toLowerCase();
      return matchesRegion && matchesStatus && matchesRisk && matchesTerritory && matchesMissionPhase && haystack.includes(query.toLowerCase());
    });
  }, [missionPhase, missionsBySiteCode, query, region, risk, sites, status, territoryLevel]);

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
  const missionSnapshots = useMemo(
    () => missions.map((mission) => ({ ...mission, ...missionStatusMeta(mission) })),
    [missions],
  );
  const activeMissionCount = missionSnapshots.filter((mission) => mission.phase === "active").length;
  const upcomingMission = missionSnapshots.find((mission) => mission.phase === "upcoming");
  const geolocatedFilteredSites = filteredSites.filter((site) => site.latitude !== null && site.longitude !== null);
  const missionStatusFilter = useMemo(
    () => Array.from(new Set(missionSnapshots.map((mission) => mission.label))).sort(),
    [missionSnapshots],
  );
  const navigationTabItems = useMemo(() => navigationItems.flatMap((group) => group.items), []);
  const viewBadgeMap = useMemo<Record<string, string>>(
    () => ({
      "Vue executive": `${formatNumber(totals.critical)} critiques`,
      "Carte nationale": `${formatNumber(geolocatedFilteredSites.length)} GPS`,
      "Registre des sites": `${formatNumber(filteredSites.length)} fiches`,
      Evaluation: `${computedRisk}/100`,
      Mobilisation: `${formatNumber(activeMissionCount)} actives`,
      Documents: `${formatNumber(data.documents.length)} pieces`,
    }),
    [activeMissionCount, computedRisk, data.documents.length, filteredSites.length, geolocatedFilteredSites.length, totals.critical],
  );
  const contextualShortcuts = useMemo(() => {
    switch (activeView) {
      case "Vue executive":
        return [
          { label: "Ouvrir la carte live", target: "Carte nationale" },
          { label: "Lancer une nouvelle fiche", target: "Registre des sites" },
        ];
      case "Carte nationale":
        return [
          { label: "Examiner le registre", target: "Registre des sites" },
          { label: "Voir les vagues de mobilisation", target: "Mobilisation" },
        ];
      case "Registre des sites":
        return [
          { label: "Retour vue executive", target: "Vue executive" },
          { label: "Préparer l'evaluation", target: "Evaluation" },
        ];
      case "Evaluation":
        return [
          { label: "Passer en mobilisation", target: "Mobilisation" },
          { label: "Revenir au registre", target: "Registre des sites" },
        ];
      case "Mobilisation":
        return [
          { label: "Suivre la carte live", target: "Carte nationale" },
          { label: "Consulter les documents", target: "Documents" },
        ];
      case "Documents":
        return [
          { label: "Retour vue executive", target: "Vue executive" },
          { label: "Revenir à la mobilisation", target: "Mobilisation" },
        ];
      default:
        return [
          { label: "Nouvelle fiche terrain", target: "Registre des sites" },
          { label: "Carte nationale", target: "Carte nationale" },
        ];
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(captureDraftStorageKey, JSON.stringify(capture));
  }, [capture]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(captureQueueStorageKey, JSON.stringify(pendingCaptures));
  }, [pendingCaptures]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(compactModeStorageKey, compactMode ? "1" : "0");
  }, [compactMode]);

  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    const derivedScores = deriveCaptureScores(capture);
    const payload: CaptureSiteInput = {
      ...capture,
      meters: toNumber(capture.meters),
      storageCapacityMl: toNumber(capture.storageCapacityMl),
      boxes: toNumber(capture.boxes),
      files: toNumber(capture.files),
      pages: toNumber(capture.pages),
      risk: derivedScores.risk,
      priority: derivedScores.priority,
      progress: derivedScores.progress,
      totalAgents: toNumber(capture.totalAgents),
      archiveRoomsCount: toNumber(capture.archiveRoomsCount),
      dateRangeStart: capture.dateRangeStart.trim() ? toNumber(capture.dateRangeStart) : null,
      dateRangeEnd: capture.dateRangeEnd.trim() ? toNumber(capture.dateRangeEnd) : null,
      documentCategories: capture.documentCategoriesText.split(",").map((item) => item.trim()).filter(Boolean),
      travelTimeMinutes: toNumber(capture.travelTimeMinutes),
      photoReferences: capture.photoReferencesText.split(",").map((item) => item.trim()).filter(Boolean),
      gpsAccuracyMeters: capture.gpsAccuracyMeters.trim() ? toNumber(capture.gpsAccuracyMeters) : null,
      gpsCapturedAt: capture.gpsCapturedAt || null,
      latitude: capture.latitude.trim() ? toNumber(capture.latitude) : null,
      longitude: capture.longitude.trim() ? toNumber(capture.longitude) : null,
    };

    try {
      if (!isOnline || !databaseUsable) {
        queueCapture(payload);
        setCapture(defaultCapture);
        setFormMessage("Les saisies sont conservées sur l'appareil en cas de coupure. La publication reprendra dès que la connexion sera disponible.");
        return;
      }

      const next = await publishCapture(payload);
      setData(next);
      setSelectedCode(payload.code.toUpperCase());
      setCapture(defaultCapture);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(captureDraftStorageKey);
      }
      setDraftRestored(false);
      setFormMessage("Fiche enregistrée et vue nationale mise à jour.");
    } catch (error) {
      if (!isOnline || error instanceof TypeError) {
        queueCapture(payload);
        setCapture(defaultCapture);
        setFormMessage("Connexion instable: les saisies restent enregistrées sur l'appareil en attente de publication.");
      } else {
        setFormMessage(error instanceof Error ? error.message : "Enregistrement impossible");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function queueCapture(payload: CaptureSiteInput) {
    setPendingCaptures((current) => [...current, payload]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(captureDraftStorageKey);
    }
    setDraftRestored(false);
  }

  const publishCapture = useCallback(async (payload: CaptureSiteInput) => {
    const response = await fetch(geoArchivesApiUrl("/api/sites", process.env.NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const next = (await response.json()) as GeoArchivesDashboard | { message?: string };

    if (!response.ok) {
      throw new Error("message" in next ? (next.message ?? "Publication impossible") : "Publication impossible");
    }

    return next as GeoArchivesDashboard;
  }, []);

  const flushPendingCaptures = useCallback(async () => {
    if (!pendingCaptures.length || !isOnline || isSaving || !databaseUsable) return;

    setIsSaving(true);
    const remaining: CaptureSiteInput[] = [];
    let lastDashboard: GeoArchivesDashboard | null = null;

    for (const payload of pendingCaptures) {
      try {
        lastDashboard = await publishCapture(payload);
      } catch {
        remaining.push(payload);
      }
    }

    setPendingCaptures(remaining);
    if (lastDashboard) {
      setData(lastDashboard);
      setFormMessage(
        remaining.length
          ? `${pendingCaptures.length - remaining.length} fiche(s) publiées. ${remaining.length} restent en attente.`
          : "Toutes les fiches en attente ont été publiées.",
      );
    }
    setIsSaving(false);
  }, [databaseUsable, isOnline, isSaving, pendingCaptures, publishCapture]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      if (pendingCaptures.length && databaseUsable && !isSaving) {
        void flushPendingCaptures();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [databaseUsable, flushPendingCaptures, isSaving, pendingCaptures]);

  return (
    <main className={`app-shell ${viewThemeClass(activeView)} ${compactMode ? "compact-mode" : ""}`}>
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">GA</div>
          <div>
            <p className="eyebrow">MULCV</p>
            <h1>GeoArchives</h1>
          </div>
        </div>
        <div className="nav-stack" aria-label="Modules">
          {navigationItems.map((group) => (
            <div className="nav-group" key={group.section}>
              <p className="nav-section-title">{group.section}</p>
              <nav className="nav-list" aria-label={group.section}>
                {group.items.map((item, index) => (
                  <button
                    className={activeView === item.view ? "nav-item active" : "nav-item"}
                    key={item.view}
                    onClick={() => setActiveView(item.view)}
                    style={{ "--stagger": `${index * 55}ms` } as CSSProperties}
                    type="button"
                  >
                    <span className="nav-icon" aria-hidden="true">{viewIconMap[item.view]}</span>
                    <span className="nav-dot" aria-hidden="true" />
                    <span className="nav-copy">
                      <strong>{item.label}</strong>
                      <small>{item.helper}</small>
                    </span>
                    <small className="nav-badge">{viewBadgeMap[item.view]}</small>
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="sidebar-panel">
          <p className="panel-label">Situation de service</p>
          <strong>{sourceState.title}</strong>
          <span>{sourceState.detail}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme nationale de gouvernance archivistique</p>
            <h2>{activeView}</h2>
            <p className="view-description">{viewNarratives[activeView]}</p>
          </div>
          <div className="topbar-actions">
            <button
              aria-pressed={compactMode}
              className={compactMode ? "secondary-button compact-toggle active" : "secondary-button compact-toggle"}
              onClick={() => setCompactMode((current) => !current)}
              type="button"
            >
              {compactMode ? "Mode compact actif" : "Activer mode compact"}
            </button>
            <span className={sourceState.badgeClass}>{sourceState.badge}</span>
          </div>
        </header>

        <section className="module-hub" aria-label="Navigation fonctionnelle">
          <div className="module-tabs" role="tablist" aria-label="Modules principaux">
            {navigationTabItems.map((item, index) => (
              <button
                aria-selected={activeView === item.view}
                className={activeView === item.view ? "module-tab active" : "module-tab"}
                key={item.view}
                onClick={() => setActiveView(item.view)}
                role="tab"
                style={{ "--stagger": `${index * 65}ms` } as CSSProperties}
                type="button"
              >
                <span className="module-tab-head"><i className="module-icon" aria-hidden="true">{viewIconMap[item.view]}</i>{item.label}</span>
                <small>{viewBadgeMap[item.view]}</small>
              </button>
            ))}
          </div>
          <div className="module-shortcuts">
            {contextualShortcuts.map((shortcut) => (
              <button className="shortcut-button" key={shortcut.label} onClick={() => setActiveView(shortcut.target)} type="button">{shortcut.label}</button>
            ))}
          </div>
        </section>

        <section className="filters" aria-label="Filtres de recherche">
          <label>Région<select value={region} onChange={(event) => setRegion(event.target.value)}><option>Toutes</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Statut<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tous</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Risque<select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Tous</option><option>Critique</option><option>Élevé</option><option>Modéré</option><option>Maîtrisé</option></select></label>
          <label>Niveau<select value={territoryLevel} onChange={(event) => setTerritoryLevel(event.target.value)}><option>Tous</option><option>National</option><option>Régional</option><option>Départemental</option><option>Terrain</option></select></label>
          <label>Mission<select value={missionPhase} onChange={(event) => setMissionPhase(event.target.value)}><option>Tous</option>{missionStatusFilter.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Recherche<input onChange={(event) => setQuery(event.target.value)} placeholder="Code, ville, direction..." type="search" value={query} /></label>
        </section>

        {activeView === "Vue executive" && (
          <ExecutiveView
            databaseUsable={databaseUsable}
            missions={missions}
            onSelectSite={setSelectedCode}
            regions={regions}
            selectedSite={selectedSite}
            sites={sites}
            totals={totals}
          />
        )}

        {activeView !== "Vue executive" && (
          <section className="metric-grid" aria-label="Indicateurs nationaux">
            <Metric label="Sites recensés" value={formatNumber(totals.sites)} detail={`${totals.evaluated} évalués`} />
            <Metric label="Volume déclaré" value={`${formatNumber(totals.meters)} ml`} detail={`${totals.pages} pages`} />
            <Metric label="Avancement moyen" value={`${totals.progress}%`} detail="Mobilisation, traitement, GED/SAE" />
            <Metric label="Sites critiques" value={formatNumber(totals.critical)} detail="Sauvegarde ou accès urgent" />
          </section>
        )}

        {activeView === "Carte nationale" && (
          <section className="dashboard-grid">
            <div className="map-panel">
              <div className="map-head">
                <div><p className="panel-label">Carte SIG nationale</p><h3>Sites d'archives en Côte d'Ivoire</h3></div>
                <div className="legend"><span><i className="legend-risk" />Risque élevé</span><span><i className="legend-active" />En cours</span><span><i className="legend-complete" />Terminé</span></div>
              </div>
              <div className="map-live-grid">
                <InteractiveNationalMap onSelectSite={setSelectedCode} selectedCode={selectedCode} sites={filteredSites} />
                <div className="map-intelligence-panel">
                  <div className="map-intelligence-card">
                    <span>Sites affichés</span>
                    <strong>{formatNumber(filteredSites.length)}</strong>
                    <small>{formatNumber(geolocatedFilteredSites.length)} localisés</small>
                  </div>
                  <div className="map-intelligence-card">
                    <span>Missions actives</span>
                    <strong>{formatNumber(activeMissionCount)}</strong>
                    <small>{upcomingMission ? upcomingMission.timeline : "Aucune mission imminente"}</small>
                  </div>
                  <div className="map-intelligence-card">
                    <span>Sites sans GPS</span>
                    <strong>{formatNumber(filteredSites.length - geolocatedFilteredSites.length)}</strong>
                    <small>Priorité de localisation terrain</small>
                  </div>
                  <div className="map-intelligence-card">
                    <span>Statuts mission</span>
                    <strong>{formatNumber(missionStatusFilter.length)}</strong>
                    <small>{missionStatusFilter.join(" · ") || "Aucune phase active"}</small>
                  </div>
                </div>
                {!filteredSites.length && <div className="map-empty">Aucun site ne correspond aux critères retenus.</div>}
              </div>
            </div>
            {selectedSite ? <SiteDetail site={selectedSite} /> : <EmptyCard title="Aucun site sélectionné" text="Le premier site retenu apparaîtra ici dès qu&apos;une fiche sera disponible." />}
            <div className="chart-panel"><p className="panel-label">Volumes par région</p><h3>Charge de traitement</h3>{regionalVolumes.length ? <div className="bar-list">{regionalVolumes.map((item) => <div className="bar-row" key={item.region}><span>{item.region}</span><div className="bar-track"><div style={{ width: `${Math.max(12, (item.meters / regionalVolumes[0].meters) * 100)}%` }} /></div><strong>{item.meters} ml</strong></div>)}</div> : <p className="empty-text">Aucun volume à afficher.</p>}</div>
            <div className="chart-panel"><p className="panel-label">Risque et priorité</p><h3>Sites à traiter en premier</h3>{sites.length ? <div className="priority-list">{[...sites].sort((a, b) => b.priority - a.priority).slice(0, 5).map((site, index) => <button className="priority-row" key={site.code} onClick={() => setSelectedCode(site.code)} type="button"><span>{index + 1}</span><div><strong>{site.region}</strong><small>{site.name}</small></div><b>{site.priority}</b></button>)}</div> : <p className="empty-text">Aucune priorité disponible.</p>}</div>
          </section>
        )}

        {activeView === "Registre des sites" && (
          <section className="registry-layout">
            <div className="registry-panel">
              <div className="section-head"><div><p className="panel-label">Registre national unique</p><h3>Fiches structurées des sites</h3></div></div>
              <div className="table-wrap"><table><thead><tr><th>Code</th><th>Site</th><th>Localisation</th><th>Niveau</th><th>Risque</th><th>Priorité</th><th>Avancement</th></tr></thead><tbody>{filteredSites.map((site) => { const territory = siteTerritoryMeta(site); return <tr key={site.code} onClick={() => setSelectedCode(site.code)}><td>{site.code}</td><td><strong>{site.name}</strong><span>{site.organization}</span></td><td>{site.city}, {site.region}</td><td><span className={`territory-chip ${territory.tone}`}>{territory.label}</span><small className="type-caption">{site.type}</small></td><td><RiskBadge value={site.risk} /></td><td>{site.priority}/100</td><td><div className="mini-progress"><div style={{ width: `${site.progress}%` }} /></div></td></tr>; })}</tbody></table>{!filteredSites.length && <p className="empty-text">Aucune fiche ne correspond aux critères retenus.</p>}</div>
            </div>
            <CapturePanel capture={capture} databaseUsable={databaseUsable} draftRestored={draftRestored} formMessage={formMessage} isOnline={isOnline} isSaving={isSaving} onChange={setCapture} onFlushPending={flushPendingCaptures} onSubmit={submitCapture} pendingCount={pendingCaptures.length} rgphRegions={rgphRegionsForCapture} />
          </section>
        )}

        {activeView === "Évaluation" && (
          <section className="assessment-grid">
            <div className="assessment-panel"><p className="panel-label">Questionnaire archivistique</p><h3>Diagnostic rapide d&apos;un site</h3>{assessmentFields.map(({ key, label }) => <label className="range-field" key={key}><span>{label}</span><input max="5" min="1" onChange={(event) => setAssessment((current) => ({ ...current, [key]: Number(event.target.value) }))} type="range" value={assessment[key]} /><b>{assessment[key]}/5</b></label>)}</div>
            <div className="score-panel"><p className="panel-label">Calcul automatique</p><div className="score-dial" style={{ "--score": computedRisk } as CSSProperties}><span>{computedRisk}</span><small>Score de risque</small></div><div className="score-stack"><Metric label="Priorité de numérisation" value={`${computedPriority}/100`} detail="Risque, sensibilité, état et urgence" /><Metric label="Charge indicative" value={`${assessment.inventory + assessment.physical} équipes`} detail="Tri, préparation, numérisation" /></div><div className="decision-box"><strong>Décision recommandée</strong><p>{computedRisk >= 80 ? "Sauvegarde urgente, transfert sécurisé et traitement préalable avant numérisation." : computedRisk >= 60 ? "Traitement archivistique prioritaire avec numérisation centralisée." : "Numérisation sur site possible après contrôle documentaire."}</p></div></div>
          </section>
        )}

        {activeView === "Mobilisation" && (
          <section className="operations-grid">
            <div className="section-head full"><div><p className="panel-label">Planification opérationnelle</p><h3>Vagues nationales de déploiement</h3></div></div>
            {missionSnapshots.map((mission) => <article className={`mission-card mission-${mission.tone}`} key={mission.id}><div className="mission-card-head"><div><p className="panel-label">{mission.wave}</p><h4>{mission.region}</h4></div><span className={`mission-status mission-${mission.tone}`}>{mission.label}</span></div><span>{mission.dates}</span><p>{mission.timeline}</p><strong>{mission.team}</strong><small>{mission.focus}</small><div className="mission-site-summary"><span>{mission.siteCount} site(s) affecté(s)</span><p>{mission.assignedSiteCodes.length ? mission.assignedSiteCodes.join(" · ") : "Aucun site affecté pour le moment"}</p></div></article>)}
            {!data.missions.length && <EmptyCard title="Aucune mission" text="Les prochaines mobilisations apparaîtront ici dès validation du calendrier." />}
            {selectedSite && <div className="timeline-panel"><p className="panel-label">Chronologie du site sélectionné</p><h3>{selectedSite.name}</h3>{["Capture GPS et fiche initiale", "Évaluation archivistique", missionSnapshots.find((mission) => mission.assignedSiteCodes.includes(selectedSite.code))?.timeline ?? missionSnapshots.find((mission) => mission.region === selectedSite.region)?.timeline ?? "Mission régionale à caler", selectedSite.nextStep].map((item, index) => <div className="timeline-item" key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div>}
          </section>
        )}

        {activeView === "Documents" && (
          <section className="documents-grid">
            <div className="section-head full"><div><p className="panel-label">Pièces justificatives</p><h3>Espace documentaire sécurisé</h3></div></div>
            {data.documents.map((document) => <article className="document-card" key={document.label}><span className="document-icon" aria-hidden="true">{document.label.slice(0, 2)}</span><div><strong>{document.label}</strong><p>{document.trend}</p></div><b>{document.count}</b></article>)}
            {!data.documents.length && <EmptyCard title="Aucune pièce" text="Les rapports, photos et inventaires apparaîtront après les premiers versements." />}
            <div className="audit-panel"><p className="panel-label">Journal d'audit</p><h3>Traçabilité récente</h3>{data.auditEntries.map((entry) => <p key={entry.id}>{entry.description}<small>{entry.actor}</small></p>)}{!data.auditEntries.length && <p>Aucune action auditée pour le moment.</p>}</div>
          </section>
        )}
      </section>
    </main>
  );
}

function ExecutiveView({ databaseUsable, missions, onSelectSite, regions, selectedSite, sites, totals }: { databaseUsable: boolean; missions: MissionPlanItem[]; onSelectSite: (code: string) => void; regions: string[]; selectedSite: DashboardSite | null; sites: DashboardSite[]; totals: { sites: number; meters: number; pages: number; progress: number; evaluated: number; critical: number } }) {
  const gpsCaptured = sites.filter((site) => site.latitude !== null && site.longitude !== null).length;
  const gpsCoverage = sites.length ? Math.round((gpsCaptured / sites.length) * 100) : 0;
  const highRisk = sites.filter((site) => site.risk >= 60).length;
  const confidential = sites.filter((site) => site.confidentiality === "Confidentiel" || site.confidentiality === "Critique").length;
  const activeProcessing = sites.filter((site) => site.progress > 0 && site.progress < 100).length;
  const missionSnapshots = missions.map((mission) => ({ ...mission, ...missionStatusMeta(mission) }));
  const activeMissions = missionSnapshots.filter((mission) => mission.phase === "active");
  const nextMission = missionSnapshots.find((mission) => mission.phase === "upcoming");
  const executiveStatus = databaseUsable ? "Pilotage disponible" : "Ouverture en préparation";
  const nationalPosture = sites.length
    ? highRisk > 0
      ? "Arbitrage prioritaire sur les sites à risque élevé."
      : "Portefeuille sous contrôle, collecte et qualification à poursuivre."
    : "Aucune fiche consolidée pour le moment. La campagne terrain peut démarrer.";
  const topRegions = regions
    .map((item) => ({
      region: item,
      sites: sites.filter((site) => site.region === item).length,
      meters: sites.filter((site) => site.region === item).reduce((sum, site) => sum + site.meters, 0),
    }))
    .sort((a, b) => b.sites - a.sites || b.meters - a.meters)
    .slice(0, 5);
  const decisionItems = [
    { label: "Dispositif national", value: databaseUsable ? "Ouvert" : "En préparation", tone: databaseUsable ? "good" : "watch" },
    { label: "Collecte terrain", value: sites.length ? "En cours" : "À lancer", tone: sites.length ? "good" : "watch" },
    { label: "Localisation", value: sites.length ? `${gpsCoverage}%` : "0%", tone: gpsCoverage >= 80 ? "good" : "watch" },
    { label: "Qualification", value: totals.evaluated ? "Disponible" : "En attente", tone: totals.evaluated ? "good" : "watch" },
  ];
  const executiveHighlights = [
    { label: "Sites actifs", value: formatNumber(totals.sites) },
    { label: "Risque consolidé", value: `${formatNumber(highRisk)} en surveillance` },
    { label: "Traitement en cours", value: `${formatNumber(activeProcessing)} dossiers` },
  ];
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        totals.progress * 0.45 +
          gpsCoverage * 0.35 +
          ((totals.evaluated / Math.max(1, sites.length)) * 100) * 0.2,
      ),
    ),
  );
  const executiveAlerts = [
    {
      label: "Sauvegarde urgente",
      value: formatNumber(totals.critical),
      detail: totals.critical ? "Sites à isoler sous 72h" : "Aucun site en criticité immédiate",
      tone: totals.critical ? "critical" : "ok",
    },
    {
      label: "Régions non couvertes",
      value: formatNumber(Math.max(0, 14 - regions.length)),
      detail: regions.length >= 14 ? "Couverture nationale complète" : "Collecte terrain à accélérer",
      tone: regions.length >= 10 ? "watch" : "critical",
    },
    {
      label: "Sites sans GPS",
      value: formatNumber(Math.max(0, sites.length - gpsCaptured)),
      detail: gpsCoverage >= 80 ? "Géolocalisation maîtrisée" : "Campagne GPS prioritaire",
      tone: gpsCoverage >= 80 ? "ok" : "watch",
    },
  ];
  const topPrioritySites = [...sites]
    .sort((left, right) => right.priority - left.priority || right.risk - left.risk)
    .slice(0, 5);
  const weeklyRegionalPlan = regions
    .map((item) => {
      const regionSites = sites.filter((site) => site.region === item);
      const regionMissions = missionSnapshots.filter((mission) => mission.region === item);
      const averageRisk = regionSites.length
        ? Math.round(regionSites.reduce((sum, site) => sum + site.risk, 0) / regionSites.length)
        : 0;
      const withoutGps = regionSites.filter((site) => site.latitude === null || site.longitude === null).length;
      const inProgress = regionSites.filter((site) => site.progress > 0 && site.progress < 100).length;

      return {
        region: item,
        averageRisk,
        sites: regionSites.length,
        withoutGps,
        inProgress,
        nextWindow: regionMissions[0]?.timeline ?? "Mission à programmer",
        missionCount: regionMissions.length,
      };
    })
    .sort((left, right) => right.averageRisk - left.averageRisk || right.withoutGps - left.withoutGps)
    .slice(0, 4);
  const emergencyMessage = totals.critical
    ? `${formatNumber(totals.critical)} site(s) critique(s) à sécuriser avant la prochaine vague de numérisation.`
    : highRisk
      ? `${formatNumber(highRisk)} site(s) sous surveillance rapprochée avant arbitrage ministériel.`
      : activeMissions.length
        ? `${formatNumber(activeMissions.length)} mission(s) terrain active(s) en ce moment.`
        : "Aucune alerte bloquante: le portefeuille peut basculer sur l'accélération terrain.";

  return (
    <section className="executive-grid" aria-label="Vue executive nationale">
      <article className="executive-war-room">
        <div>
          <p className="panel-label">Cellule de pilotage</p>
          <h3>Point de situation immédiat</h3>
          <p>{emergencyMessage}</p>
        </div>
        <div className="war-room-metrics">
          <span>
            <b>{formatNumber(totals.critical)}</b>
            <small>Urgences</small>
          </span>
          <span>
            <b>{formatNumber(topPrioritySites.length)}</b>
            <small>Dossiers du jour</small>
          </span>
          <span>
            <b>{formatNumber(activeMissions.length || weeklyRegionalPlan.length)}</b>
            <small>Régions suivies</small>
          </span>
        </div>
      </article>

      <article className="executive-brief">
        <div>
          <p className="panel-label">Pilotage national</p>
          <h3>Portefeuille archivistique MULCV</h3>
          <p>{nationalPosture}</p>
          <div className="executive-highlights">
            {executiveHighlights.map((item) => (
              <span key={item.label}>
                <b>{item.value}</b>
                <small>{item.label}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="executive-status-bar">
          <span>{executiveStatus}</span>
          <strong>{sites.length ? `${formatNumber(sites.length)} fiches suivies` : "Lancement de campagne"}</strong>
        </div>
      </article>

      <section className="executive-kpis" aria-label="Indicateurs exécutifs">
        <ExecutiveMetric label="Sites validés" value={formatNumber(totals.sites)} detail={`${formatNumber(regions.length)} régions couvertes`} />
        <ExecutiveMetric label="Volume déclaré" value={`${formatNumber(totals.meters)} ml`} detail={`${formatNumber(totals.pages)} pages estimées`} />
        <ExecutiveMetric label="Couverture GPS" value={`${gpsCoverage}%`} detail={`${formatNumber(gpsCaptured)} sites géolocalisés`} />
        <ExecutiveMetric label="Risque élevé" value={formatNumber(highRisk)} detail={`${formatNumber(confidential)} sites sensibles`} />
        <ExecutiveMetric label="Missions actives" value={formatNumber(activeMissions.length)} detail={nextMission ? nextMission.timeline : "Aucune mobilisation imminente"} />
      </section>

      <article className="executive-panel decision-panel">
        <p className="panel-label">Maturité opérationnelle</p>
        <h3>Conditions de décision</h3>
        <div className="decision-list">
          {decisionItems.map((item) => (
            <div className="decision-row" key={item.label}>
              <span className={`decision-dot ${item.tone}`} aria-hidden="true" />
              <div><strong>{item.label}</strong><small>{item.value}</small></div>
            </div>
          ))}
        </div>
      </article>

      <article className="executive-panel">
        <p className="panel-label">Couverture territoriale</p>
        <h3>Régions alimentées</h3>
        {topRegions.length ? (
          <div className="executive-bars">
            {topRegions.map((item) => (
              <div className="executive-bar-row" key={item.region}>
                <span>{item.region}</span>
                <div className="bar-track"><div style={{ width: `${Math.max(8, (item.sites / topRegions[0].sites) * 100)}%` }} /></div>
                <strong>{item.sites}</strong>
              </div>
            ))}
          </div>
        ) : <p className="empty-text">Aucune région alimentée pour le moment.</p>}
      </article>

      <article className="executive-panel">
        <p className="panel-label">Risque consolidé</p>
        <h3>Qualification du portefeuille</h3>
        <div className="risk-summary">
          <div><span>Critique</span><strong>{formatNumber(totals.critical)}</strong></div>
          <div><span>En traitement</span><strong>{formatNumber(activeProcessing)}</strong></div>
          <div><span>À évaluer</span><strong>{formatNumber(Math.max(0, sites.length - totals.evaluated))}</strong></div>
        </div>
      </article>

      <article className="executive-panel alert-panel">
        <p className="panel-label">Alerte nationale</p>
        <h3>Priorites des 30 prochains jours</h3>
        <div className="alert-list">
          {executiveAlerts.map((item) => (
            <div className={`alert-row ${item.tone}`} key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
              <b>{item.value}</b>
            </div>
          ))}
        </div>
      </article>

      <article className="executive-panel readiness-panel">
        <p className="panel-label">Indice national</p>
        <h3>Préparation opérationnelle</h3>
        <div className="readiness-dial" style={{ "--score": readinessScore } as CSSProperties}>
          <span>{readinessScore}%</span>
          <small>Préparation</small>
        </div>
        <p className="empty-text">
          {readinessScore >= 75
            ? "Portefeuille stabilisé, passage en phase d'industrialisation possible."
            : readinessScore >= 50
              ? "Le dispositif est exploitable, avec un renforcement recommandé sur la couverture terrain."
              : "Le dispositif reste en phase initiale: priorité à la collecte et à la qualification."}
        </p>
      </article>

      <article className="executive-panel today-panel">
        <p className="panel-label">Traitement du jour</p>
        <h3>5 dossiers à engager maintenant</h3>
        <div className="today-list">
          {topPrioritySites.length ? (
            topPrioritySites.map((site, index) => (
              (() => { const assignedMission = missionSnapshots.find((mission) => mission.assignedSiteCodes.includes(site.code)); return (
              <button className="today-row" key={site.code} onClick={() => onSelectSite(site.code)} type="button">
                <span>{index + 1}</span>
                <div>
                  <strong>{site.name}</strong>
                  <small>{site.region} · {site.city} · {site.priority}/100</small>
                  <small>{assignedMission ? `${assignedMission.wave} · ${assignedMission.label}` : "Aucune mobilisation affectée"}</small>
                </div>
                <RiskBadge value={site.risk} />
              </button>
              ); })()
            ))
          ) : (
            <p className="empty-text">Aucune priorité immédiate n&apos;est identifiée pour le moment.</p>
          )}
        </div>
      </article>

      <article className="executive-panel weekly-panel">
        <p className="panel-label">Semaine terrain</p>
        <h3>Cadencement par région</h3>
        <div className="weekly-plan-list">
          {weeklyRegionalPlan.length ? (
            weeklyRegionalPlan.map((item) => (
              <div className="weekly-plan-row" key={item.region}>
                <div>
                  <strong>{item.region}</strong>
                  <small>{item.sites} sites · {item.withoutGps} sans GPS · {item.missionCount} mission(s)</small>
                  <small>{item.nextWindow}</small>
                </div>
                <b>{item.averageRisk}</b>
              </div>
            ))
          ) : (
            <p className="empty-text">Le rythme régional apparaîtra après les premières remontées terrain.</p>
          )}
        </div>
      </article>

      <article className="executive-panel executive-wide">
        <p className="panel-label">Arbitrages</p>
        <h3>{selectedSite ? "Premier dossier prioritaire" : "Aucune priorité terrain"}</h3>
        {selectedSite ? (
          <div className="executive-priority">
            <div>
              <strong>{selectedSite.name}</strong>
              <span>{selectedSite.region} / {selectedSite.city} / {selectedSite.type}</span>
            </div>
            <RiskBadge value={selectedSite.risk} />
            <p>{selectedSite.nextStep}</p>
          </div>
        ) : <p className="empty-text">Les arbitrages exécutifs apparaîtront dès consolidation des premières fiches terrain.</p>}
      </article>
    </section>
  );
}

function ExecutiveMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="executive-metric"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function CapturePanel({
  capture,
  databaseUsable,
  draftRestored,
  formMessage,
  isOnline,
  isSaving,
  onChange,
  onFlushPending,
  onSubmit,
  pendingCount,
  rgphRegions,
}: {
  capture: CaptureFormState;
  databaseUsable: boolean;
  draftRestored: boolean;
  formMessage: string | null;
  isOnline: boolean;
  isSaving: boolean;
  onChange: (next: CaptureFormState) => void;
  onFlushPending: () => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingCount: number;
  rgphRegions: string[];
}) {
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  function update<K extends keyof CaptureFormState>(key: K, value: CaptureFormState[K]) {
    if (key === "district") {
      const nextDistrict = rgphDistricts.find((item) => item.district === value);
      onChange({
        ...capture,
        district: String(value),
        region: nextDistrict?.regions[0] ?? capture.region,
      });
      return;
    }

    onChange({ ...capture, [key]: value });
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsMessage("GPS indisponible sur ce navigateur.");
      return;
    }

    setGpsMessage("Capture GPS en cours...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...capture,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          gpsAccuracyMeters: position.coords.accuracy ? position.coords.accuracy.toFixed(1) : "",
          gpsCapturedAt: new Date().toISOString(),
        });
        setGpsMessage("Coordonnées GPS capturées.");
      },
      () => setGpsMessage("Position GPS non disponible ou autorisation refusée."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  return (
    <form className="capture-panel" onSubmit={onSubmit}>
      <div className="capture-head"><div><p className="panel-label">Remontée terrain</p><h3>Nouvelle fiche site</h3></div><span className={isOnline ? "network-pill online" : "network-pill offline"}>{isOnline ? "Connexion disponible" : "Mode faible connexion"}</span></div>
      {(draftRestored || pendingCount > 0) && (
        <div className="capture-status-strip">
          {draftRestored ? <span>Un brouillon local a été restauré.</span> : <span>Aucun brouillon local en cours.</span>}
          {pendingCount > 0 ? <button className="secondary-button" onClick={() => void onFlushPending()} type="button">Publier {pendingCount} fiche(s) en attente</button> : <span>Aucune fiche en attente.</span>}
        </div>
      )}
      <div className="form-grid">
        <div className="form-section wide"><p className="section-kicker">Référencement RGPH</p></div>
        <label>Code site<input required value={capture.code} onChange={(event) => update("code", event.target.value)} placeholder="MULCV-REG-001" /></label>
        <label>Nom du site<input required value={capture.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>District<select value={capture.district} onChange={(event) => update("district", event.target.value)}>{rgphDistricts.map((item) => <option key={item.district}>{item.district}</option>)}</select></label>
        <label>Région<select value={capture.region} onChange={(event) => update("region", event.target.value)}>{rgphRegions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Département<input required value={capture.department} onChange={(event) => update("department", event.target.value)} /></label>
        <label>Sous-préfecture<input value={capture.subPrefecture} onChange={(event) => update("subPrefecture", event.target.value)} /></label>
        <label>Commune<input value={capture.commune} onChange={(event) => update("commune", event.target.value)} /></label>
        <label>Ville ou localité<input required value={capture.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label className="wide">Adresse ou emplacement<input value={capture.address} onChange={(event) => update("address", event.target.value)} placeholder="Quartier, repère principal, bâtiment" /></label>
        <label className="wide">Repères d&apos;accès<input value={capture.accessLandmarks} onChange={(event) => update("accessLandmarks", event.target.value)} placeholder="Carrefour, école, chefferie, marché, etc." /></label>

        <div className="form-section wide"><p className="section-kicker">Répondant</p></div>
        <label>Organisation<input required value={capture.organization} onChange={(event) => update("organization", event.target.value)} /></label>
        <label>Type de site<select value={capture.type} onChange={(event) => update("type", event.target.value)}>{siteTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Nom du répondant<input required value={capture.lead} onChange={(event) => update("lead", event.target.value)} /></label>
        <label>Fonction du répondant<input required value={capture.respondentRole} onChange={(event) => update("respondentRole", event.target.value)} placeholder="Directeur, chef de service, point focal..." /></label>
        <label>Téléphone<input value={capture.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" /></label>
        <label>Email<input value={capture.respondentEmail} onChange={(event) => update("respondentEmail", event.target.value)} inputMode="email" /></label>

        <div className="form-section wide"><p className="section-kicker">Accès et route</p></div>
        <label>État de la route<select value={capture.roadCondition} onChange={(event) => update("roadCondition", event.target.value)}>{roadConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Derniers kilomètres<select value={capture.lastMileCondition} onChange={(event) => update("lastMileCondition", event.target.value)}>{roadConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Temps d&apos;accès (min)<input value={capture.travelTimeMinutes} onChange={(event) => update("travelTimeMinutes", event.target.value)} inputMode="numeric" /></label>
        <label>Accessibilité<select value={capture.accessibility} onChange={(event) => update("accessibility", event.target.value)}>{accessibilityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Qualité réseau<select value={capture.networkQuality} onChange={(event) => update("networkQuality", event.target.value)}>{networkQualityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Contraintes saisonnières<input value={capture.seasonalConstraints} onChange={(event) => update("seasonalConstraints", event.target.value)} placeholder="Pluies, pont coupé, inondation, etc." /></label>

        <div className="form-section wide"><p className="section-kicker">Conditions du site</p></div>
        <label>État du bâtiment<select value={capture.buildingCondition} onChange={(event) => update("buildingCondition", event.target.value)}>{buildingConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>État des espaces d&apos;archives<select value={capture.storageCondition} onChange={(event) => update("storageCondition", event.target.value)}>{storageConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Risque eau<select value={capture.waterRiskLevel} onChange={(event) => update("waterRiskLevel", event.target.value)}>{riskLevelOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Risque sûreté<select value={capture.securityRiskLevel} onChange={(event) => update("securityRiskLevel", event.target.value)}>{riskLevelOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Nombre d&apos;agents<input value={capture.totalAgents} onChange={(event) => update("totalAgents", event.target.value)} inputMode="numeric" /></label>
        <label>Nombre de salles<input value={capture.archiveRoomsCount} onChange={(event) => update("archiveRoomsCount", event.target.value)} inputMode="numeric" /></label>
        <label>Capacité estimée (ml)<input value={capture.storageCapacityMl} onChange={(event) => update("storageCapacityMl", event.target.value)} inputMode="decimal" /></label>
        <label>Mètres linéaires<input value={capture.meters} onChange={(event) => update("meters", event.target.value)} inputMode="decimal" /></label>
        <label>Boîtes<input value={capture.boxes} onChange={(event) => update("boxes", event.target.value)} inputMode="numeric" /></label>
        <label>Dossiers<input value={capture.files} onChange={(event) => update("files", event.target.value)} inputMode="numeric" /></label>
        <label>Pages<input value={capture.pages} onChange={(event) => update("pages", event.target.value)} inputMode="numeric" /></label>
        <label>Dates extrêmes début<input value={capture.dateRangeStart} onChange={(event) => update("dateRangeStart", event.target.value)} inputMode="numeric" placeholder="1986" /></label>
        <label>Dates extrêmes fin<input value={capture.dateRangeEnd} onChange={(event) => update("dateRangeEnd", event.target.value)} inputMode="numeric" placeholder="2024" /></label>
        <label className="wide">Catégories documentaires<input value={capture.documentCategoriesText} onChange={(event) => update("documentCategoriesText", event.target.value)} placeholder="Séparer par des virgules" /></label>
        <div className="boolean-grid wide">
          <label className="check-row"><input checked={capture.hasInventory} onChange={(event) => update("hasInventory", event.target.checked)} type="checkbox" />Inventaire disponible</label>
          <label className="check-row"><input checked={capture.hasElectricity} onChange={(event) => update("hasElectricity", event.target.checked)} type="checkbox" />Électricité disponible</label>
          <label className="check-row"><input checked={capture.hasInternet} onChange={(event) => update("hasInternet", event.target.checked)} type="checkbox" />Internet disponible</label>
          <label className="check-row"><input checked={capture.hasAccessControl} onChange={(event) => update("hasAccessControl", event.target.checked)} type="checkbox" />Contrôle d&apos;accès</label>
          <label className="check-row"><input checked={capture.hasFireDetection} onChange={(event) => update("hasFireDetection", event.target.checked)} type="checkbox" />Détection incendie</label>
        </div>

        <div className="form-section wide"><p className="section-kicker">Checklist terrain</p></div>
        <div className="boolean-grid wide">
          <label className="check-row"><input checked={capture.checklistVehicleAccess} onChange={(event) => update("checklistVehicleAccess", event.target.checked)} type="checkbox" />Accès véhicule confirmé</label>
          <label className="check-row"><input checked={capture.checklistLoadingArea} onChange={(event) => update("checklistLoadingArea", event.target.checked)} type="checkbox" />Zone de chargement disponible</label>
          <label className="check-row"><input checked={capture.checklistSiteSignage} onChange={(event) => update("checklistSiteSignage", event.target.checked)} type="checkbox" />Signalisation du site visible</label>
          <label className="check-row"><input checked={capture.checklistArchivesSeparated} onChange={(event) => update("checklistArchivesSeparated", event.target.checked)} type="checkbox" />Archives séparées des bureaux</label>
          <label className="check-row"><input checked={capture.checklistShelvingAvailable} onChange={(event) => update("checklistShelvingAvailable", event.target.checked)} type="checkbox" />Rayonnages disponibles</label>
          <label className="check-row"><input checked={capture.checklistHumidityObserved} onChange={(event) => update("checklistHumidityObserved", event.target.checked)} type="checkbox" />Traces d&apos;humidité observées</label>
          <label className="check-row"><input checked={capture.checklistPestObserved} onChange={(event) => update("checklistPestObserved", event.target.checked)} type="checkbox" />Présence de nuisibles observée</label>
          <label className="check-row"><input checked={capture.checklistFireExtinguisher} onChange={(event) => update("checklistFireExtinguisher", event.target.checked)} type="checkbox" />Extincteurs présents</label>
          <label className="check-row"><input checked={capture.checklistBackupPower} onChange={(event) => update("checklistBackupPower", event.target.checked)} type="checkbox" />Source électrique de secours</label>
          <label className="check-row"><input checked={capture.checklistImmediateRiskReported} onChange={(event) => update("checklistImmediateRiskReported", event.target.checked)} type="checkbox" />Risque immédiat signalé</label>
        </div>

        <div className="form-section wide"><p className="section-kicker">Géolocalisation</p></div>
        <label>Latitude<input value={capture.latitude} onChange={(event) => update("latitude", event.target.value)} inputMode="decimal" /></label>
        <label>Longitude<input value={capture.longitude} onChange={(event) => update("longitude", event.target.value)} inputMode="decimal" /></label>
        <label>Précision GPS (m)<input value={capture.gpsAccuracyMeters} onChange={(event) => update("gpsAccuracyMeters", event.target.value)} inputMode="decimal" /></label>
        <label>Référence photo<input value={capture.photoReferencesText} onChange={(event) => update("photoReferencesText", event.target.value)} placeholder="photo1.jpg, photo2.jpg" /></label>
        <div className="gps-actions wide"><button className="secondary-button" onClick={captureGps} type="button">Capturer GPS</button>{gpsMessage && <span>{gpsMessage}</span>}</div>

        <div className="form-section wide"><p className="section-kicker">Pilotage</p></div>
        <label>Confidentialité<select value={capture.confidentiality} onChange={(event) => update("confidentiality", event.target.value as DashboardSite["confidentiality"])}>{confidentialityLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Statut<select value={capture.status} onChange={(event) => update("status", event.target.value as SiteStatusLabel)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="wide">Prochaine action<input value={capture.nextStep} onChange={(event) => update("nextStep", event.target.value)} /></label>
        <label className="wide">Observations terrain<textarea rows={4} value={capture.surveyNotes} onChange={(event) => update("surveyNotes", event.target.value)} /></label>
      </div>
      {formMessage && <p className="form-message">{formMessage}</p>}
      <div className="capture-actions">
        <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Publication..." : isOnline && databaseUsable ? "Publier la fiche" : "Enregistrer hors ligne"}</button>
        <span className="capture-helper">{pendingCount > 0 ? `${pendingCount} fiche(s) en attente de publication.` : "Les saisies sont conservées sur l'appareil en cas de coupure."}</span>
      </div>
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
  const territory = siteTerritoryMeta(site);
  const checklistItems = [
    ["Accès véhicule", site.checklistVehicleAccess],
    ["Zone de chargement", site.checklistLoadingArea],
    ["Signalisation", site.checklistSiteSignage],
    ["Archives séparées", site.checklistArchivesSeparated],
    ["Rayonnages", site.checklistShelvingAvailable],
    ["Humidité observée", site.checklistHumidityObserved],
    ["Nuisibles observés", site.checklistPestObserved],
    ["Extincteurs", site.checklistFireExtinguisher],
    ["Énergie de secours", site.checklistBackupPower],
    ["Risque immédiat", site.checklistImmediateRiskReported],
  ] as const;

  return (
    <aside className="detail-panel">
      <div className="detail-head"><div><p className="panel-label">{site.code}</p><h3>{site.name}</h3></div><RiskBadge value={site.risk} /></div>
      <span className={`territory-chip ${territory.tone}`}>{territory.label} · {site.type}</span>
      <span className={`status-pill ${statusClass(site.status)}`}>{site.status}</span>
      <dl className="detail-list">
        <div><dt>Organisation</dt><dd>{site.organization}</dd></div>
        <div><dt>Localisation</dt><dd>{site.city}, {site.department} - {site.region}</dd></div>
        <div><dt>GPS</dt><dd>{site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : "Coordonnées à capturer"}</dd></div>
        <div><dt>Responsable</dt><dd>{site.lead} · {site.phone}</dd></div>
        <div><dt>Volume</dt><dd>{site.meters} ml · {formatNumber(site.boxes)} boîtes · {formatNumber(site.pages)} pages</dd></div>
        <div><dt>Confidentialité</dt><dd>{site.confidentiality}</dd></div>
        <div><dt>Accès terrain</dt><dd>{site.roadCondition || "Non renseigné"} · {site.lastMileCondition || "Non renseigné"} · {site.travelTimeMinutes ?? 0} min</dd></div>
        <div><dt>État du site</dt><dd>{site.buildingCondition || "Non renseigné"} · {site.storageCondition || "Non renseigné"}</dd></div>
        <div><dt>Connectivité</dt><dd>{site.networkQuality || "Non renseigné"} · GPS {site.gpsAccuracyMeters ? `${site.gpsAccuracyMeters} m` : "à confirmer"}</dd></div>
      </dl>
      <div className="survey-summary"><span>Checklist terrain</span><div className="survey-checklist">{checklistItems.map(([label, checked]) => <small className={checked ? "check-ok" : "check-ko"} key={label}>{label}</small>)}</div>{site.surveyNotes ? <p>{site.surveyNotes}</p> : null}</div>
      <div className="progress-block"><div><span>Avancement global</span><strong>{site.progress}%</strong></div><div className="progress-track"><div style={{ width: `${site.progress}%` }} /></div></div>
      <div className="next-step"><span>Prochaine action</span><p>{site.nextStep}</p></div>
    </aside>
  );
}

function toNumber(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
