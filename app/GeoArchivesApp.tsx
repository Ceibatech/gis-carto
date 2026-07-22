"use client";

import dynamic from "next/dynamic";
import { Archive, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardCheck, Database, LocateFixed, MapPinned, Route, Save, Send, ShieldCheck, UserRound, Wifi, WifiOff } from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AuditEntry,
  CaptureSiteInput,
  DashboardSite,
  DocumentStat,
  GeoArchivesDashboard,
  MissionPlanItem,
  SiteStatusLabel,
} from "../lib/geoarchives-types";
import { emptyGeoArchivesDashboard } from "../lib/empty-geoarchives-dashboard";
import type { AuthRole, AuthSession, LoginResponse } from "../lib/geoarchives-auth-types";
import { geoArchivesApiUrl } from "../lib/api-url";
import { abidjanDepartment, abidjanDistrictName, abidjanRegionLabel, abidjanSubPrefectures, abidjanUrbanSubPrefecture, allRgphRegions, rgphDistricts } from "../lib/rgph-territories";

type Assessment = {
  physical: number;
  humidity: number;
  security: number;
  inventory: number;
  sensitivity: number;
  access: number;
};

type AssessmentKey = keyof Assessment;

type CaptureSyncStatus = "offlineSaved" | "waiting" | "syncing" | "sent" | "failed";

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
  "Non évalué": 0,
  "Évaluation planifiée": 10,
  "Évaluation réalisée": 30,
  "Mobilisation en cours": 45,
  "Traitement en cours": 62,
  "Numérisation en cours": 76,
  "Contrôle qualité": 88,
  "Traitement terminé": 100,
  "Risque élevé": 20,
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


const abidjanCitySuggestions = [
  "Abobo Baoulé",
  "Angré",
  "Attinguié",
  "Akoupé-Zeudji",
  "Anyama-Adjamé",
  "Bingerville",
  "Brofodoumé",
  "Ebimpé",
  "Songon-Agban",
  "Songon-Kassemblé",
  "Vridi",
  "Zone 4",
];

function getRgphDistrict(district: string) {
  if (district === "Abidjan") {
    return rgphDistricts.find((item) => item.district === abidjanDistrictName) ?? rgphDistricts[0];
  }

  return rgphDistricts.find((item) => item.district === district) ?? rgphDistricts[0];
}

function isAbidjanDistrict(district: string) {
  return getRgphDistrict(district)?.district === abidjanDistrictName;
}

function regionOptionsForDistrict(district: string) {
  const selectedDistrict = getRgphDistrict(district);
  if (!selectedDistrict) return [];
  return selectedDistrict.regionLabel ? [selectedDistrict.regionLabel] : selectedDistrict.regions;
}

function getRgphRegion(district: string, region: string) {
  const selectedDistrict = getRgphDistrict(district);
  return selectedDistrict?.regionItems?.find((item) => item.nom === region) ?? selectedDistrict?.regionItems?.[0] ?? null;
}

function getRgphDepartment(district: string, region: string, department: string) {
  const selectedRegion = getRgphRegion(district, region);
  return selectedRegion?.departments.find((item) => item.nom === department) ?? selectedRegion?.departments[0] ?? null;
}

function departmentOptionsForLocation(district: string, region: string) {
  if (isAbidjanDistrict(district)) return [abidjanDepartment];
  return getRgphRegion(district, region)?.departments.map((item) => item.nom) ?? [];
}

function subPrefectureOptionsForLocation(district: string, region: string, department: string) {
  if (isAbidjanDistrict(district)) return abidjanSubPrefectures.map((item) => item.nom);
  return getRgphDepartment(district, region, department)?.subPrefectures.map((item) => item.nom) ?? [];
}

function communesForAbidjanSubPrefecture(subPrefecture: string) {
  return abidjanSubPrefectures.find((item) => item.nom === subPrefecture)?.communes ?? [];
}

function abidjanSubPrefectureForCommune(commune: string) {
  return abidjanSubPrefectures.find((item) => item.communes.includes(commune))?.nom ?? abidjanUrbanSubPrefecture;
}

function communeOptionsForLocation(district: string, region: string, department: string, subPrefecture: string) {
  if (isAbidjanDistrict(district)) return communesForAbidjanSubPrefecture(subPrefecture);
  return subPrefecture ? [subPrefecture] : [];
}

function localitySuggestionsForLocation(district: string, region: string, department: string, subPrefecture: string, commune: string) {
  const suggestions = isAbidjanDistrict(district)
    ? [commune, ...abidjanCitySuggestions]
    : [commune, subPrefecture, department, region].filter(Boolean);
  return Array.from(new Set(suggestions)).filter(Boolean);
}

function locationDefaultsForSubPrefecture(district: string, region: string, department: string, subPrefecture: string) {
  const commune = communeOptionsForLocation(district, region, department, subPrefecture)[0] ?? "";
  return { region, department, subPrefecture, commune };
}

function locationDefaultsForDepartment(district: string, region: string, department: string) {
  const subPrefecture = subPrefectureOptionsForLocation(district, region, department)[0] ?? "";
  return locationDefaultsForSubPrefecture(district, region, department, subPrefecture);
}

function locationDefaultsForRegion(district: string, region: string) {
  if (isAbidjanDistrict(district)) {
    return locationDefaultsForSubPrefecture(district, abidjanRegionLabel, abidjanDepartment, abidjanUrbanSubPrefecture);
  }

  const department = departmentOptionsForLocation(district, region)[0] ?? "";
  return locationDefaultsForDepartment(district, region, department);
}

function locationDefaultsForDistrict(district: string) {
  const region = regionOptionsForDistrict(district)[0] ?? "";
  return locationDefaultsForRegion(district, region);
}

function captureSyncMeta(status: CaptureSyncStatus) {
  switch (status) {
    case "waiting":
      return { label: "En attente d’envoi", tone: "waiting" };
    case "syncing":
      return { label: "Synchronisation en cours", tone: "syncing" };
    case "sent":
      return { label: "Envoyée", tone: "sent" };
    case "failed":
      return { label: "Échec de l’envoi — réessayer", tone: "failed" };
    case "offlineSaved":
    default:
      return { label: "Enregistrée hors ligne", tone: "offline" };
  }
}

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

const roleViewAccess: Record<AuthRole, string[]> = {
  agent: ["Registre des sites"],
  executive: navigationItems.flatMap((group) => group.items.map((item) => item.view)),
};

function landingViewForSession(session: AuthSession | null) {
  return session?.landingView ?? "Vue executive";
}

function allowedViewsForSession(session: AuthSession | null) {
  return new Set(session ? roleViewAccess[session.role] : []);
}

function roleLabel(role: AuthRole) {
  return role === "agent" ? "Agent registre" : "Pilotage exécutif";
}

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
  region: abidjanRegionLabel,
  district: abidjanDistrictName,
  department: abidjanDepartment,
  subPrefecture: abidjanUrbanSubPrefecture,
  commune: abidjanSubPrefectures[0]?.communes[0] ?? "",
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
  const waterRisk = scoreOf(capture.waterRiskLevel, { Faible: 4, "Modéré": 16, "Élevé": 31, Critique: 45 });
  const securityRisk = scoreOf(capture.securityRiskLevel, { Faible: 3, "Modéré": 12, "Élevé": 24, Critique: 36 });
  const buildingRisk = scoreOf(capture.buildingCondition, { "Bon état": 0, "État moyen": 8, Fragile: 18, "Très dégradé": 28 });
  const storageRisk = scoreOf(capture.storageCondition, { "Adapté": 0, Acceptable: 6, "Saturé": 16, "Inadapté": 26 });
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
    scoreOf(capture.accessibility, { Accessible: 0, "Accès limité": 4, "Accès difficile": 8, "Site isolé": 12, "Accès restreint": 10 }) +
    scoreOf(capture.roadCondition, { Bonne: 0, "Dégradée": 4, "Très dégradée": 8, "Saisonnière": 7, "Piste rurale": 8 }) +
    scoreOf(capture.lastMileCondition, { Bonne: 0, "Dégradée": 3, "Très dégradée": 7, "Saisonnière": 7, "Piste rurale": 8 }) +
    scoreOf(capture.networkQuality, { Bonne: 0, Moyenne: 2, Faible: 5, "Très faible": 8, "Aucune couverture": 10 }) +
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

export default function GeoArchivesApp({ initialData, initialSession }: { initialData: GeoArchivesDashboard; initialSession: AuthSession | null }) {
  const [data, setData] = useState(initialData);
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [activeView, setActiveView] = useState(() => landingViewForSession(initialSession));
  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = window.localStorage.getItem(compactModeStorageKey);
    if (stored === "1" || stored === "0") {
      return stored === "1";
    }

    return window.matchMedia("(max-width: 1024px)").matches;
  });
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionSearch, setRegionSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [risk, setRisk] = useState("Tous");
  const [territoryLevel, setTerritoryLevel] = useState("Tous");
  const [missionPhase, setMissionPhase] = useState("Tous");
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState(initialData.sites[0]?.code ?? "");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [captureSyncStatus, setCaptureSyncStatus] = useState<CaptureSyncStatus>("offlineSaved");
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
      return regionOptionsForDistrict(capture.district);
    }, [capture.district]);
  const regions = useMemo(() => Array.from(new Set(sites.map((site) => site.region))).sort(), [sites]);
  const regionFilterOptions = useMemo(() => allRgphRegions, []);
  const filteredRegionOptions = useMemo(() => {
    const term = regionSearch.trim().toLowerCase();
    return regionFilterOptions.filter((item) => !term || item.toLowerCase().includes(term));
  }, [regionFilterOptions, regionSearch]);
  const selectedRegionSummary = selectedRegions.length
    ? `${selectedRegions.slice(0, 2).join(" \u00b7 ")}${selectedRegions.length > 2 ? ` +${selectedRegions.length - 2}` : ""}`
    : `${regionFilterOptions.length} r\u00e9gions ANStat disponibles`;
  const toggleRegionFilter = useCallback((regionName: string) => {
    setSelectedRegions((current) =>
      current.includes(regionName)
        ? current.filter((item) => item !== regionName)
        : [...current, regionName].sort((left, right) => left.localeCompare(right, "fr")),
    );
  }, []);
  const clearRegionFilters = useCallback(() => {
    setSelectedRegions([]);
    setRegionSearch("");
  }, []);
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
      const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(site.region);
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
  }, [missionPhase, missionsBySiteCode, query, risk, selectedRegions, sites, status, territoryLevel]);

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
  const allowedViewSet = useMemo(() => allowedViewsForSession(session), [session]);
  const visibleNavigationItems = useMemo(
    () => navigationItems
      .map((group) => ({ ...group, items: group.items.filter((item) => allowedViewSet.has(item.view)) }))
      .filter((group) => group.items.length),
    [allowedViewSet],
  );
  const navigationTabItems = useMemo(() => visibleNavigationItems.flatMap((group) => group.items), [visibleNavigationItems]);
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
    let shortcuts: { label: string; target: string }[];

    switch (activeView) {
      case "Vue executive":
        shortcuts = [
          { label: "Ouvrir la carte live", target: "Carte nationale" },
          { label: "Lancer une nouvelle fiche", target: "Registre des sites" },
        ];
        break;
      case "Carte nationale":
        shortcuts = [
          { label: "Examiner le registre", target: "Registre des sites" },
          { label: "Voir les vagues de mobilisation", target: "Mobilisation" },
        ];
        break;
      case "Registre des sites":
        shortcuts = [
          { label: "Retour vue executive", target: "Vue executive" },
          { label: "Préparer l'évaluation", target: "Evaluation" },
        ];
        break;
      case "Evaluation":
        shortcuts = [
          { label: "Passer en mobilisation", target: "Mobilisation" },
          { label: "Revenir au registre", target: "Registre des sites" },
        ];
        break;
      case "Mobilisation":
        shortcuts = [
          { label: "Suivre la carte live", target: "Carte nationale" },
          { label: "Consulter les documents", target: "Documents" },
        ];
        break;
      case "Documents":
        shortcuts = [
          { label: "Retour vue executive", target: "Vue executive" },
          { label: "Revenir à la mobilisation", target: "Mobilisation" },
        ];
        break;
      default:
        shortcuts = [
          { label: "Nouvelle fiche terrain", target: "Registre des sites" },
          { label: "Carte nationale", target: "Carte nationale" },
        ];
        break;
    }

    return shortcuts.filter((shortcut) => allowedViewSet.has(shortcut.target));
  }, [activeView, allowedViewSet]);

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

  async function handleLogin(login: string, password: string) {
    let response: Response;

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
    } catch {
      throw new Error("Connexion impossible. Vérifie le déploiement Vercel.");
    }

    const result = (await response.json()) as LoginResponse;

    if (!response.ok || !("session" in result)) {
      throw new Error("message" in result ? result.message : "Connexion impossible");
    }

    let dashboardResponse: Response;

    try {
      dashboardResponse = await fetch(geoArchivesApiUrl("/api/geoarchives", process.env.NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL), {
        headers: { accept: "application/json" },
      });
    } catch {
      throw new Error("API nationale injoignable. Vérifie l'URL API Vercel et le CORS Contabo.");
    }

    if (!dashboardResponse.ok) {
      throw new Error("Connexion acceptée, mais les données nationales sont indisponibles.");
    }

    const nextDashboard = (await dashboardResponse.json()) as GeoArchivesDashboard;
    setData(nextDashboard);
    setSession(result.session);
    setSelectedCode(nextDashboard.sites[0]?.code ?? "");
    setActiveView(result.session.landingView);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setSession(null);
    setData(emptyGeoArchivesDashboard());
    setSelectedCode("");
    setActiveView("Vue executive");
  }
  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);
    setCaptureSyncStatus("syncing");

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
        setCaptureSyncStatus(!isOnline ? "offlineSaved" : "waiting");
        setFormMessage("Fiche enregistrée sur cet appareil. Elle sera envoyée automatiquement dès le retour de la connexion.");
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
      setCaptureSyncStatus("sent");
      setFormMessage("Fiche envoyée. Vue nationale mise à jour.");
    } catch (error) {
      if (!isOnline) {
        queueCapture(payload);
        setCapture(defaultCapture);
        setCaptureSyncStatus("offlineSaved");
        setFormMessage("Fiche enregistrée sur cet appareil. Elle sera envoyée automatiquement dès le retour de la connexion.");
      } else if (error instanceof TypeError) {
        queueCapture(payload);
        setCapture(defaultCapture);
        setCaptureSyncStatus("failed");
        setFormMessage("Échec de l’envoi — réessayer.");
      } else {
        setCaptureSyncStatus("failed");
        setFormMessage(error instanceof Error ? error.message : "Échec de l’envoi — réessayer.");
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
    setCaptureSyncStatus("syncing");
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
      setCaptureSyncStatus(remaining.length ? "failed" : "sent");
      setFormMessage(
        remaining.length
          ? `${pendingCaptures.length - remaining.length} fiche(s) envoyée(s). ${remaining.length} restent en attente d’envoi.`
          : "Toutes les fiches en attente ont été envoyées.",
      );
    } else if (remaining.length) {
      setCaptureSyncStatus("failed");
      setFormMessage("Échec de l’envoi — réessayer.");
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

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (session.role === "agent") {
    return (
      <main className="agent-shell">
        <header className="agent-topbar">
          <div>
            <p className="eyebrow">MULCV GeoArchives</p>
            <h2>Registre terrain</h2>
            <p className="view-description">Renseignez les fiches même sans connexion. Elles sont enregistrées sur l’appareil et envoyées automatiquement dès que le réseau est disponible.</p>
          </div>
          <div className="agent-actions">
            <div className="session-chip"><span>{roleLabel(session.role)}</span><strong>{session.name}</strong></div>
            <span className={sourceState.badgeClass}>{sourceState.badge}</span>
            <button className="secondary-button" onClick={() => void handleLogout()} type="button">Se déconnecter</button>
          </div>
        </header>
        <section className="agent-form-frame">
          <CapturePanel capture={capture} captureSyncStatus={captureSyncStatus} databaseUsable={databaseUsable} draftRestored={draftRestored} formMessage={formMessage} isOnline={isOnline} isSaving={isSaving} onChange={setCapture} onFlushPending={flushPendingCaptures} onSubmit={submitCapture} pendingCount={pendingCaptures.length} rgphRegions={rgphRegionsForCapture} />
        </section>
      </main>
    );
  }

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
          {visibleNavigationItems.map((group) => (
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
            <p className="view-description">{viewNarratives[activeView] ?? "Espace de travail GeoArchives."}</p>
          </div>
          <div className="topbar-actions">
            <div className="session-chip"><span>{roleLabel(session.role)}</span><strong>{session.name}</strong></div>
            <button className="secondary-button" onClick={() => void handleLogout()} type="button">Se déconnecter</button>
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
          <div className="region-filter">
            <div className="filter-label-row">
              <span>Région</span>
              {selectedRegions.length > 0 && <button onClick={clearRegionFilters} type="button">Réinitialiser</button>}
            </div>
            <div className="region-filter-box">
              <div className="region-filter-summary">
                <strong>{selectedRegions.length ? `${selectedRegions.length} sélectionnée(s)` : "Toutes les régions"}</strong>
                <small>{selectedRegionSummary}</small>
              </div>
              <input aria-label="Rechercher une région ANStat" onChange={(event) => setRegionSearch(event.target.value)} placeholder="Rechercher une région..." type="search" value={regionSearch} />
              <div className="region-checklist" role="group" aria-label="Sélection multiple des régions ANStat">
                {filteredRegionOptions.map((item) => (
                  <label className={selectedRegions.includes(item) ? "region-check active" : "region-check"} key={item}>
                    <input checked={selectedRegions.includes(item)} onChange={() => toggleRegionFilter(item)} type="checkbox" />
                    <span>{item}</span>
                  </label>
                ))}
                {!filteredRegionOptions.length && <p className="empty-text">Aucune région trouvée.</p>}
              </div>
            </div>
          </div>
          <label>Statut<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tous</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Risque<select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Tous</option><option>Critique</option><option>Élevé</option><option>Modéré</option><option>Maîtrisé</option></select></label>
          <label>Niveau<select value={territoryLevel} onChange={(event) => setTerritoryLevel(event.target.value)}><option>Tous</option><option>National</option><option>Régional</option><option>Départemental</option><option>Terrain</option></select></label>
          <label>Mission<select value={missionPhase} onChange={(event) => setMissionPhase(event.target.value)}><option>Tous</option>{missionStatusFilter.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Recherche<input onChange={(event) => setQuery(event.target.value)} placeholder="Code, ville, direction..." type="search" value={query} /></label>
        </section>

        {activeView === "Vue executive" && (
          <ExecutiveView
            auditEntries={data.auditEntries}
            databaseUsable={databaseUsable}
            documents={data.documents}
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
                <div><p className="panel-label">Carte SIG nationale</p><h3>Sites d&apos;archives en Côte d&apos;Ivoire</h3></div>
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
            <CapturePanel capture={capture} captureSyncStatus={captureSyncStatus} databaseUsable={databaseUsable} draftRestored={draftRestored} formMessage={formMessage} isOnline={isOnline} isSaving={isSaving} onChange={setCapture} onFlushPending={flushPendingCaptures} onSubmit={submitCapture} pendingCount={pendingCaptures.length} rgphRegions={rgphRegionsForCapture} />
          </section>
        )}

        {activeView === "Evaluation" && (
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
            <div className="audit-panel"><p className="panel-label">Journal d&apos;audit</p><h3>Traçabilité récente</h3>{data.auditEntries.map((entry) => <p key={entry.id}>{entry.description}<small>{entry.actor}</small></p>)}{!data.auditEntries.length && <p>Aucune action auditée pour le moment.</p>}</div>
          </section>
        )}
      </section>
    </main>
  );
}

﻿function ExecutiveView({ auditEntries, databaseUsable, documents, missions, onSelectSite, regions, selectedSite, sites, totals }: { auditEntries: AuditEntry[]; databaseUsable: boolean; documents: DocumentStat[]; missions: MissionPlanItem[]; onSelectSite: (code: string) => void; regions: string[]; selectedSite: DashboardSite | null; sites: DashboardSite[]; totals: { sites: number; meters: number; pages: number; progress: number; evaluated: number; critical: number } }) {
  const totalSites = sites.length;
  const missionSnapshots = missions.map((mission) => ({ ...mission, ...missionStatusMeta(mission) }));
  const activeMissions = missionSnapshots.filter((mission) => mission.phase === "active");
  const upcomingMissions = missionSnapshots.filter((mission) => mission.phase === "upcoming");
  const missionSiteCodes = new Set(missionSnapshots.flatMap((mission) => mission.assignedSiteCodes));
  const assignedSites = sites.filter((site) => missionSiteCodes.has(site.code)).length;
  const gpsCaptured = sites.filter((site) => site.latitude !== null && site.longitude !== null).length;
  const gpsMissing = Math.max(0, totalSites - gpsCaptured);
  const gpsCoverage = totalSites ? Math.round((gpsCaptured / totalSites) * 100) : 0;
  const evaluatedRate = totalSites ? Math.round((totals.evaluated / totalSites) * 100) : 0;
  const inventoryReady = sites.filter((site) => site.hasInventory).length;
  const inventoryRate = totalSites ? Math.round((inventoryReady / totalSites) * 100) : 0;
  const missionCoverage = totalSites ? Math.round((assignedSites / totalSites) * 100) : activeMissions.length ? 50 : 0;
  const criticalSites = sites.filter((site) => site.risk >= 80);
  const elevatedSites = sites.filter((site) => site.risk >= 60 && site.risk < 80);
  const moderateSites = sites.filter((site) => site.risk >= 40 && site.risk < 60);
  const controlledSites = sites.filter((site) => site.risk < 40);
  const sensitiveSites = sites.filter((site) => site.confidentiality === "Confidentiel" || site.confidentiality === "Critique").length;
  const inaccessibleSites = sites.filter((site) => site.status === "Inaccessible" || site.accessibility.toLowerCase().includes("difficile") || site.accessibility.toLowerCase().includes("restreint")).length;
  const missingLead = sites.filter((site) => !site.lead.trim()).length;
  const missingCapacity = sites.filter((site) => site.meters <= 0 && site.pages <= 0 && site.storageCapacityMl <= 0).length;
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(totals.progress * 0.26 + gpsCoverage * 0.22 + evaluatedRate * 0.2 + inventoryRate * 0.16 + missionCoverage * 0.16),
    ),
  );
  const nationalPosture = totalSites
    ? totals.critical
      ? "Arbitrage national requis sur les sites critiques avant industrialisation."
      : elevatedSites.length
        ? "Portefeuille exploitable, avec surveillance rapprochée des sites sensibles."
        : "Portefeuille sous contrôle, accélération possible sur la collecte et la numérisation."
    : "Aucune fiche consolidée. La priorité est l’ouverture de la collecte terrain.";
  const scoreTone = readinessScore >= 75 ? "good" : readinessScore >= 50 ? "watch" : "critical";
  const commandSignals = [
    {
      label: "Sauvegarde critique",
      value: totals.critical,
      detail: totals.critical ? "Sites à sécuriser sous 72h" : "Aucun blocage immédiat",
      tone: totals.critical ? "critical" : "good",
    },
    {
      label: "GPS manquant",
      value: gpsMissing,
      detail: gpsMissing ? "Coordonnées à capturer" : "Couverture GPS complète",
      tone: gpsMissing ? "watch" : "good",
    },
    {
      label: "Qualification à terminer",
      value: Math.max(0, totalSites - totals.evaluated),
      detail: evaluatedRate >= 80 ? "Niveau de lecture suffisant" : "Evaluation à consolider",
      tone: evaluatedRate >= 80 ? "good" : "watch",
    },
    {
      label: "Accès contraint",
      value: inaccessibleSites,
      detail: inaccessibleSites ? "Missions à préparer" : "Accès terrain maîtrisé",
      tone: inaccessibleSites ? "critical" : "good",
    },
  ];
  const riskBands = [
    { label: "Critique", value: criticalSites.length, tone: "critical" },
    { label: "Élevé", value: elevatedSites.length, tone: "elevated" },
    { label: "Modéré", value: moderateSites.length, tone: "watch" },
    { label: "Maîtrisé", value: controlledSites.length, tone: "good" },
  ];
  const dataQualityItems = [
    { label: "Géolocalisation", value: gpsCoverage, detail: `${formatNumber(gpsCaptured)} / ${formatNumber(totalSites)} sites GPS` },
    { label: "Evaluation", value: evaluatedRate, detail: `${formatNumber(totals.evaluated)} fiches qualifiées` },
    { label: "Inventaire", value: inventoryRate, detail: `${formatNumber(inventoryReady)} inventaires disponibles` },
    { label: "Responsable", value: totalSites ? Math.round(((totalSites - missingLead) / totalSites) * 100) : 0, detail: missingLead ? `${formatNumber(missingLead)} point(s) focal à compléter` : "Responsables renseignés" },
  ];
  const regionalPortfolio = regions
    .map((region) => {
      const regionSites = sites.filter((site) => site.region === region);
      const regionCritical = regionSites.filter((site) => site.risk >= 80).length;
      const regionHigh = regionSites.filter((site) => site.risk >= 60).length;
      const regionGpsMissing = regionSites.filter((site) => site.latitude === null || site.longitude === null).length;
      const averageRisk = regionSites.length ? Math.round(regionSites.reduce((sum, site) => sum + site.risk, 0) / regionSites.length) : 0;
      const averageProgress = regionSites.length ? Math.round(regionSites.reduce((sum, site) => sum + site.progress, 0) / regionSites.length) : 0;
      const mission = missionSnapshots.find((item) => item.region === region);
      return {
        region,
        averageProgress,
        averageRisk,
        critical: regionCritical,
        gpsMissing: regionGpsMissing,
        high: regionHigh,
        mission,
        sites: regionSites.length,
        volume: regionSites.reduce((sum, site) => sum + site.meters, 0),
      };
    })
    .sort((left, right) => right.critical - left.critical || right.averageRisk - left.averageRisk || right.gpsMissing - left.gpsMissing || right.sites - left.sites)
    .slice(0, 7);
  const topPrioritySites = [...sites]
    .sort((left, right) => right.priority - left.priority || right.risk - left.risk || right.meters - left.meters)
    .slice(0, 6);
  const missionQueue = [...missionSnapshots]
    .sort((left, right) => {
      const phaseRank = { active: 0, upcoming: 1, completed: 2 } as const;
      return phaseRank[left.phase] - phaseRank[right.phase] || new Date(left.startDate).getTime() - new Date(right.startDate).getTime();
    })
    .slice(0, 5);
  const recentActivity = [...auditEntries]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const documentTotal = documents.reduce((sum, item) => sum + item.count, 0);
  const selectedDecisionSite = selectedSite ?? topPrioritySites[0] ?? null;

  return (
    <section className="executive-command-grid" aria-label="Vue exécutive nationale">
      <article className="executive-command-hero">
        <div className="executive-hero-copy">
          <p className="panel-label">Gouvernance nationale</p>
          <h3>Centre de commandement archivistique</h3>
          <p>{nationalPosture}</p>
          <div className="executive-hero-tags">
            <span>{databaseUsable ? "Base nationale active" : "Service national à vérifier"}</span>
            <span>{formatNumber(regions.length)} / 33 régions couvertes</span>
            <span>{formatNumber(activeMissions.length)} mission(s) active(s)</span>
          </div>
        </div>
        <div className={`executive-readiness-card ${scoreTone}`}>
          <div className="executive-score-ring" style={{ "--score": readinessScore } as CSSProperties}>
            <strong>{readinessScore}%</strong>
            <span>maturité</span>
          </div>
          <p>{readinessScore >= 75 ? "Décision industrialisable" : readinessScore >= 50 ? "Pilotage opérationnel" : "Collecte à renforcer"}</p>
        </div>
      </article>

      <section className="executive-kpi-strip" aria-label="Indicateurs exécutifs">
        <ExecutiveMetric label="Sites consolidés" value={formatNumber(totals.sites)} detail={`${formatNumber(totals.evaluated)} évalués`} tone="good" />
        <ExecutiveMetric label="Volume déclaré" value={`${formatNumber(totals.meters)} ml`} detail={`${formatNumber(totals.pages)} pages estimées`} />
        <ExecutiveMetric label="Couverture GPS" value={`${gpsCoverage}%`} detail={`${formatNumber(gpsMissing)} sites à géocoder`} tone={gpsCoverage >= 80 ? "good" : "watch"} />
        <ExecutiveMetric label="Risque élevé" value={formatNumber(criticalSites.length + elevatedSites.length)} detail={`${formatNumber(sensitiveSites)} sites sensibles`} tone={criticalSites.length ? "critical" : elevatedSites.length ? "watch" : "good"} />
        <ExecutiveMetric label="Missions" value={formatNumber(activeMissions.length + upcomingMissions.length)} detail={`${formatNumber(assignedSites)} sites affectés`} />
      </section>

      <section className="executive-signal-strip" aria-label="Signaux de décision">
        {commandSignals.map((item) => (
          <article className={`executive-signal ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{formatNumber(item.value)}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <article className="executive-panel executive-panel-large">
        <div className="executive-panel-head">
          <div><p className="panel-label">Priorités nationales</p><h3>Dossiers à engager maintenant</h3></div>
          <span>{formatNumber(topPrioritySites.length)} dossiers</span>
        </div>
        <div className="executive-priority-stack">
          {topPrioritySites.length ? topPrioritySites.map((site, index) => {
            const mission = missionSnapshots.find((item) => item.assignedSiteCodes.includes(site.code));
            return (
              <button className="executive-priority-row" key={site.code} onClick={() => onSelectSite(site.code)} type="button">
                <span className="priority-rank">{index + 1}</span>
                <div>
                  <strong>{site.name}</strong>
                  <small>{site.region} · {site.department} · {site.city}</small>
                  <small>{mission ? `${mission.wave} · ${mission.label}` : site.nextStep}</small>
                </div>
                <RiskBadge value={site.risk} />
              </button>
            );
          }) : <p className="empty-text">Aucune priorité immédiate n’est disponible.</p>}
        </div>
      </article>

      <article className="executive-panel executive-panel-side">
        <div className="executive-panel-head"><div><p className="panel-label">Risque consolidé</p><h3>Lecture portefeuille</h3></div></div>
        <div className="executive-risk-bands">
          {riskBands.map((item) => (
            <div className={`executive-risk-band ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{formatNumber(item.value)}</strong>
              <div><i style={{ width: `${totalSites ? Math.max(5, (item.value / totalSites) * 100) : 0}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="executive-decision-note">
          <strong>{selectedDecisionSite ? selectedDecisionSite.name : "Aucun dossier sélectionné"}</strong>
          <p>{selectedDecisionSite ? selectedDecisionSite.nextStep : "Les arbitrages apparaîtront après consolidation des premières fiches terrain."}</p>
        </div>
      </article>

      <article className="executive-panel executive-panel-large">
        <div className="executive-panel-head">
          <div><p className="panel-label">Couverture territoriale</p><h3>Régions à arbitrer</h3></div>
          <span>{formatNumber(Math.max(0, 33 - regions.length))} non couvertes</span>
        </div>
        <div className="executive-region-table">
          {regionalPortfolio.length ? regionalPortfolio.map((item) => (
            <div className="executive-region-row" key={item.region}>
              <div>
                <strong>{item.region}</strong>
                <small>{item.sites} sites · {item.volume} ml · {item.mission ? item.mission.label : "mission à programmer"}</small>
              </div>
              <div className="region-health-bars">
                <span><i style={{ width: `${Math.min(100, item.averageRisk)}%` }} /></span>
                <small>Risque {item.averageRisk}</small>
              </div>
              <b>{item.gpsMissing} GPS</b>
            </div>
          )) : <p className="empty-text">La couverture régionale apparaîtra dès les premières fiches.</p>}
        </div>
      </article>

      <article className="executive-panel executive-panel-side">
        <div className="executive-panel-head"><div><p className="panel-label">Qualité de donnée</p><h3>Fiabilité BI et cartographie</h3></div></div>
        <div className="data-quality-list">
          {dataQualityItems.map((item) => (
            <div className="data-quality-row" key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
              <span>{item.value}%</span>
              <div><i style={{ width: `${item.value}%` }} /></div>
            </div>
          ))}
        </div>
        {missingCapacity > 0 && <p className="executive-warning-text">{formatNumber(missingCapacity)} fiche(s) sans volume exploitable pour la planification.</p>}
      </article>

      <article className="executive-panel executive-panel-medium">
        <div className="executive-panel-head"><div><p className="panel-label">Mobilisation</p><h3>Cadencement opérationnel</h3></div></div>
        <div className="mission-command-list">
          {missionQueue.length ? missionQueue.map((mission) => (
            <div className={`mission-command-row ${mission.phase}`} key={mission.id}>
              <span>{mission.phase === "active" ? "En cours" : mission.phase === "upcoming" ? "À venir" : "Terminé"}</span>
              <div>
                <strong>{mission.region}</strong>
                <small>{mission.timeline}</small>
                <small>{mission.team} · {mission.focus}</small>
              </div>
              <b>{mission.assignedSiteCodes.length || mission.siteCount}</b>
            </div>
          )) : <p className="empty-text">Aucune mission planifiée pour le moment.</p>}
        </div>
      </article>

      <article className="executive-panel executive-panel-medium">
        <div className="executive-panel-head"><div><p className="panel-label">Traçabilité</p><h3>Activité récente</h3></div></div>
        <div className="executive-activity-list">
          {recentActivity.length ? recentActivity.map((entry) => (
            <div className="executive-activity-row" key={entry.id}>
              <span>{new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
              <div><strong>{entry.description}</strong><small>{entry.actor}</small></div>
            </div>
          )) : <p className="empty-text">Aucune activité auditée pour le moment.</p>}
        </div>
      </article>

      <article className="executive-panel executive-panel-medium">
        <div className="executive-panel-head"><div><p className="panel-label">Pièces et preuves</p><h3>Socle documentaire</h3></div><span>{formatNumber(documentTotal)} pièces</span></div>
        <div className="executive-doc-list">
          {documents.length ? documents.slice(0, 4).map((document) => (
            <div className="executive-doc-row" key={document.label}>
              <strong>{document.label}</strong>
              <span>{formatNumber(document.count)}</span>
              <small>{document.trend}</small>
            </div>
          )) : <p className="empty-text">Les rapports, photos et inventaires apparaîtront après les premiers versements.</p>}
        </div>
      </article>
    </section>
  );
}
function ExecutiveMetric({ detail, label, tone = "neutral", value }: { detail: string; label: string; tone?: "neutral" | "good" | "watch" | "critical"; value: string }) {
  return <article className={`executive-metric ${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function LoginScreen({ onLogin }: { onLogin: (login: string, password: string) => Promise<void> }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await onLogin(login, password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion impossible");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Connexion GeoArchives">
        <div className="login-brand"><span>GA</span><div><p className="eyebrow">MULCV GeoArchives</p><strong>Plateforme nationale</strong></div></div>
        <div className="login-copy"><h1>Connexion sécurisée</h1><p>Accès réservé au pilotage national et aux agents habilités pour la collecte terrain.</p></div>
        <div className="login-routes" aria-label="Profils disponibles">
          <article><strong>Pilotage exécutif</strong><span>Dashboard national, arbitrages, cartographie et suivi.</span></article>
          <article><strong>Accès agent registre</strong><span>Identifiant personnel pour ouvrir le Registre des sites.</span></article>
        </div>
      </section>
      <form className="login-panel" onSubmit={submit}>
        <div className="login-panel-head"><p className="panel-label">Accès plateforme</p><h2>Se connecter</h2></div>
        <label><span>Identifiant</span><input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} /></label>
        <label><span>Mot de passe</span><input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message && <p className="form-message login-error" role="alert">{message}</p>}
        <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Vérification..." : "Entrer"}</button>
      </form>
    </main>
  );
}

type BooleanCaptureKey =
  | "hasInventory"
  | "hasElectricity"
  | "hasInternet"
  | "hasAccessControl"
  | "hasFireDetection"
  | "checklistVehicleAccess"
  | "checklistLoadingArea"
  | "checklistSiteSignage"
  | "checklistArchivesSeparated"
  | "checklistShelvingAvailable"
  | "checklistHumidityObserved"
  | "checklistPestObserved"
  | "checklistFireExtinguisher"
  | "checklistBackupPower"
  | "checklistImmediateRiskReported";

const captureSteps = [
  { id: "general", title: "Informations générales", icon: ClipboardCheck, summary: "Référencement et périmètre du site" },
  { id: "location", title: "Localisation", icon: MapPinned, summary: "Territoire, adresse et repères" },
  { id: "responsible", title: "Responsable", icon: UserRound, summary: "Point focal et contact terrain" },
  { id: "access", title: "Accès", icon: Route, summary: "Route, réseau et contraintes" },
  { id: "condition", title: "Conditions du site", icon: Building2, summary: "Risques bâtiment, sûreté et conservation" },
  { id: "capacity", title: "Capacité d'archives", icon: Archive, summary: "Volumes, dates extrêmes et catégories" },
  { id: "equipment", title: "Équipements", icon: ShieldCheck, summary: "Pré-requis opérationnels et checklist" },
  { id: "geolocation", title: "Géolocalisation", icon: LocateFixed, summary: "GPS, précision et preuve terrain" },
  { id: "validation", title: "Validation", icon: CheckCircle2, summary: "Contrôle final avant publication" },
] as const;

function CapturePanel({
  capture,
  captureSyncStatus,
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
  captureSyncStatus: CaptureSyncStatus;
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
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const currentStep = captureSteps[activeStepIndex];
  const CurrentStepIcon = currentStep.icon;
  const derivedScores = deriveCaptureScores(capture);
  const progress = Math.round(((activeStepIndex + 1) / captureSteps.length) * 100);
  const isFinalStep = activeStepIndex === captureSteps.length - 1;
  const selectedDistrict = getRgphDistrict(capture.district);
  const districtValue = selectedDistrict?.district ?? capture.district;
  const isAbidjanCapture = isAbidjanDistrict(capture.district);
  const regionValue = isAbidjanCapture ? abidjanRegionLabel : rgphRegions.includes(capture.region) ? capture.region : rgphRegions[0] ?? capture.region;
  const departmentOptions = departmentOptionsForLocation(districtValue, regionValue);
  const selectedDepartment = departmentOptions.includes(capture.department) ? capture.department : departmentOptions[0] ?? capture.department;
  const subPrefectureOptions = subPrefectureOptionsForLocation(districtValue, regionValue, selectedDepartment);
  const selectedSubPrefecture = subPrefectureOptions.includes(capture.subPrefecture) ? capture.subPrefecture : subPrefectureOptions[0] ?? capture.subPrefecture;
  const communeOptions = communeOptionsForLocation(districtValue, regionValue, selectedDepartment, selectedSubPrefecture);
  const selectedCommune = communeOptions.includes(capture.commune) ? capture.commune : communeOptions[0] ?? capture.commune;
  const localityOptions = localitySuggestionsForLocation(districtValue, regionValue, selectedDepartment, selectedSubPrefecture, selectedCommune);

  useEffect(() => {
    if (
      capture.region === regionValue &&
      capture.department === selectedDepartment &&
      capture.subPrefecture === selectedSubPrefecture &&
      capture.commune === selectedCommune
    ) {
      return;
    }

    onChange({
      ...capture,
      region: regionValue,
      department: selectedDepartment,
      subPrefecture: selectedSubPrefecture,
      commune: selectedCommune,
    });
  }, [capture, onChange, regionValue, selectedCommune, selectedDepartment, selectedSubPrefecture]);

  const effectiveSyncStatus: CaptureSyncStatus = isSaving ? "syncing" : captureSyncStatus;
  const currentCaptureStatus = captureSyncMeta(effectiveSyncStatus);
  const pendingCaptureStatus = captureSyncMeta(isSaving ? "syncing" : captureSyncStatus === "failed" ? "failed" : "waiting");
  const noticeMessage = !isOnline
    ? "Fiche enregistrée sur cet appareil. Elle sera envoyée automatiquement dès le retour de la connexion."
    : captureSyncStatus === "failed"
      ? "Échec de l’envoi — réessayer."
      : pendingCount > 0
        ? "Des fiches sont en attente d’envoi. Elles seront envoyées automatiquement dès que le réseau est disponible."
        : !databaseUsable
          ? "Service national indisponible. La saisie reste enregistrée sur cet appareil."
          : draftRestored
            ? "Une fiche enregistrée sur cet appareil a été restaurée."
            : null;
  const canRetryPendingCaptures = pendingCount > 0 && isOnline && databaseUsable && !isSaving;
  function update<K extends keyof CaptureFormState>(key: K, value: CaptureFormState[K]) {
    if (key === "district") {
      const district = String(value);
      onChange({
        ...capture,
        district,
        ...locationDefaultsForDistrict(district),
      });
      return;
    }

    if (key === "region") {
      const region = String(value);
      onChange({
        ...capture,
        ...locationDefaultsForRegion(capture.district, region),
      });
      return;
    }

    if (key === "department") {
      const department = String(value);
      onChange({
        ...capture,
        ...locationDefaultsForDepartment(capture.district, regionValue, department),
      });
      return;
    }

    if (key === "subPrefecture") {
      const subPrefecture = String(value);
      onChange({
        ...capture,
        ...locationDefaultsForSubPrefecture(capture.district, regionValue, selectedDepartment, subPrefecture),
      });
      return;
    }

    if (key === "commune") {
      const commune = String(value);
      onChange({
        ...capture,
        region: regionValue,
        department: selectedDepartment,
        subPrefecture: isAbidjanDistrict(capture.district) ? abidjanSubPrefectureForCommune(commune) : selectedSubPrefecture,
        commune,
      });
      return;
    }

    onChange({ ...capture, [key]: value });
  }

  function updateBoolean(key: BooleanCaptureKey, value: boolean) {
    onChange({ ...capture, [key]: value });
  }

  function goNext() {
    setActiveStepIndex((index) => Math.min(index + 1, captureSteps.length - 1));
  }

  function goBack() {
    setActiveStepIndex((index) => Math.max(index - 1, 0));
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

  function Field({ children, label, wide }: { children: ReactNode; label: string; wide?: boolean }) {
    return <label className={wide ? "wizard-field wide" : "wizard-field"}><span>{label}</span>{children}</label>;
  }

  function ToggleCard({ detail, field, label }: { detail: string; field: BooleanCaptureKey; label: string }) {
    const checked = Boolean(capture[field]);
    return (
      <label className={checked ? "toggle-card active" : "toggle-card"}>
        <input checked={checked} onChange={(event) => updateBoolean(field, event.target.checked)} type="checkbox" />
        <span className="toggle-icon" aria-hidden="true">{checked ? <Check size={16} /> : <Circle size={16} />}</span>
        <span><strong>{label}</strong><small>{detail}</small></span>
      </label>
    );
  }

  function renderStep() {
    switch (currentStep.id) {
      case "general":
        return (
          <div className="wizard-grid">
            <Field label="Code site"><input required value={capture.code} onChange={(event) => update("code", event.target.value)} /></Field>
            <Field label="Nom du site"><input required value={capture.name} onChange={(event) => update("name", event.target.value)} /></Field>
            <Field label="Organisation"><input required value={capture.organization} onChange={(event) => update("organization", event.target.value)} /></Field>
            <Field label="Type de site"><select value={capture.type} onChange={(event) => update("type", event.target.value)}>{siteTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Confidentialité"><select value={capture.confidentiality} onChange={(event) => update("confidentiality", event.target.value as DashboardSite["confidentiality"])}>{confidentialityLevels.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Statut"><select value={capture.status} onChange={(event) => update("status", event.target.value as SiteStatusLabel)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
        );
      case "location":
        return (
          <div className="wizard-grid">
            <Field label="District">
              <select value={districtValue} onChange={(event) => update("district", event.target.value)}>
                {rgphDistricts.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}
              </select>
            </Field>
            <Field label="Région">
              <select disabled={isAbidjanCapture} value={regionValue} onChange={(event) => update("region", event.target.value)}>
                {rgphRegions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Département">
              <select disabled={isAbidjanCapture} required value={selectedDepartment} onChange={(event) => update("department", event.target.value)}>
                {departmentOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Sous-préfecture">
              <select required value={selectedSubPrefecture} onChange={(event) => update("subPrefecture", event.target.value)}>
                {subPrefectureOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Commune">
              <select required value={selectedCommune} onChange={(event) => update("commune", event.target.value)}>
                {communeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Ville ou localité">
              <input list="territory-locality-suggestions" required value={capture.city} onChange={(event) => update("city", event.target.value)} />
              <datalist id="territory-locality-suggestions">{localityOptions.map((item) => <option key={item} value={item} />)}</datalist>
            </Field>
            <Field label="Adresse ou emplacement" wide><input value={capture.address} onChange={(event) => update("address", event.target.value)} /></Field>
            <Field label="Repères d'accès" wide><input value={capture.accessLandmarks} onChange={(event) => update("accessLandmarks", event.target.value)} /></Field>
          </div>
        );
      case "responsible":
        return (
          <div className="wizard-grid">
            <Field label="Nom du répondant"><input required value={capture.lead} onChange={(event) => update("lead", event.target.value)} /></Field>
            <Field label="Fonction"><input required value={capture.respondentRole} onChange={(event) => update("respondentRole", event.target.value)} /></Field>
            <Field label="Téléphone"><input inputMode="tel" value={capture.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
            <Field label="Email"><input inputMode="email" value={capture.respondentEmail} onChange={(event) => update("respondentEmail", event.target.value)} /></Field>
          </div>
        );
      case "access":
        return (
          <div className="wizard-grid">
            <Field label="Accessibilité"><select value={capture.accessibility} onChange={(event) => update("accessibility", event.target.value)}>{accessibilityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="État de la route"><select value={capture.roadCondition} onChange={(event) => update("roadCondition", event.target.value)}>{roadConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Derniers kilomètres"><select value={capture.lastMileCondition} onChange={(event) => update("lastMileCondition", event.target.value)}>{roadConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Temps d'accès (min)"><input inputMode="numeric" value={capture.travelTimeMinutes} onChange={(event) => update("travelTimeMinutes", event.target.value)} /></Field>
            <Field label="Qualité réseau"><select value={capture.networkQuality} onChange={(event) => update("networkQuality", event.target.value)}>{networkQualityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Contraintes saisonnières"><input value={capture.seasonalConstraints} onChange={(event) => update("seasonalConstraints", event.target.value)} /></Field>
          </div>
        );
      case "condition":
        return (
          <div className="wizard-grid">
            <Field label="État du bâtiment"><select value={capture.buildingCondition} onChange={(event) => update("buildingCondition", event.target.value)}>{buildingConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Espaces d'archives"><select value={capture.storageCondition} onChange={(event) => update("storageCondition", event.target.value)}>{storageConditionOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Risque eau"><select value={capture.waterRiskLevel} onChange={(event) => update("waterRiskLevel", event.target.value)}>{riskLevelOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Risque sûreté"><select value={capture.securityRiskLevel} onChange={(event) => update("securityRiskLevel", event.target.value)}>{riskLevelOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Observations terrain" wide><textarea rows={6} value={capture.surveyNotes} onChange={(event) => update("surveyNotes", event.target.value)} /></Field>
          </div>
        );
      case "capacity":
        return (
          <div className="wizard-grid">
            <Field label="Capacité estimée (ml)"><input inputMode="decimal" value={capture.storageCapacityMl} onChange={(event) => update("storageCapacityMl", event.target.value)} /></Field>
            <Field label="Mètres linéaires"><input inputMode="decimal" value={capture.meters} onChange={(event) => update("meters", event.target.value)} /></Field>
            <Field label="Boîtes"><input inputMode="numeric" value={capture.boxes} onChange={(event) => update("boxes", event.target.value)} /></Field>
            <Field label="Dossiers"><input inputMode="numeric" value={capture.files} onChange={(event) => update("files", event.target.value)} /></Field>
            <Field label="Pages"><input inputMode="numeric" value={capture.pages} onChange={(event) => update("pages", event.target.value)} /></Field>
            <Field label="Nombre de salles"><input inputMode="numeric" value={capture.archiveRoomsCount} onChange={(event) => update("archiveRoomsCount", event.target.value)} /></Field>
            <Field label="Nombre d'agents"><input inputMode="numeric" value={capture.totalAgents} onChange={(event) => update("totalAgents", event.target.value)} /></Field>
            <Field label="Dates extrêmes début"><input inputMode="numeric" value={capture.dateRangeStart} onChange={(event) => update("dateRangeStart", event.target.value)} /></Field>
            <Field label="Dates extrêmes fin"><input inputMode="numeric" value={capture.dateRangeEnd} onChange={(event) => update("dateRangeEnd", event.target.value)} /></Field>
            <Field label="Catégories documentaires" wide><input value={capture.documentCategoriesText} onChange={(event) => update("documentCategoriesText", event.target.value)} /></Field>
          </div>
        );
      case "equipment":
        return (
          <div className="toggle-grid">
            <ToggleCard field="hasInventory" label="Inventaire disponible" detail="Repérage documentaire exploitable" />
            <ToggleCard field="hasElectricity" label="Électricité disponible" detail="Alimentation stable sur site" />
            <ToggleCard field="hasInternet" label="Internet disponible" detail="Connexion opérationnelle" />
            <ToggleCard field="hasAccessControl" label="Contrôle d'accès" detail="Accès sécurisé aux fonds" />
            <ToggleCard field="hasFireDetection" label="Détection incendie" detail="Dispositif de prévention présent" />
            <ToggleCard field="checklistVehicleAccess" label="Accès véhicule confirmé" detail="Arrivée et évacuation possibles" />
            <ToggleCard field="checklistLoadingArea" label="Zone de chargement" detail="Manipulation sécurisée" />
            <ToggleCard field="checklistSiteSignage" label="Signalisation visible" detail="Site identifiable rapidement" />
            <ToggleCard field="checklistArchivesSeparated" label="Archives séparées" detail="Fonds isolés des bureaux" />
            <ToggleCard field="checklistShelvingAvailable" label="Rayonnages disponibles" detail="Stockage non posé au sol" />
            <ToggleCard field="checklistHumidityObserved" label="Humidité observée" detail="Point d'alerte conservation" />
            <ToggleCard field="checklistPestObserved" label="Nuisibles observés" detail="Point d'alerte sanitaire" />
            <ToggleCard field="checklistFireExtinguisher" label="Extincteurs présents" detail="Première réponse incendie" />
            <ToggleCard field="checklistBackupPower" label="Énergie de secours" detail="Continuité minimale" />
            <ToggleCard field="checklistImmediateRiskReported" label="Risque immédiat" detail="Escalade requise" />
          </div>
        );
      case "geolocation":
        return (
          <div className="wizard-grid">
            <Field label="Latitude"><input inputMode="decimal" value={capture.latitude} onChange={(event) => update("latitude", event.target.value)} /></Field>
            <Field label="Longitude"><input inputMode="decimal" value={capture.longitude} onChange={(event) => update("longitude", event.target.value)} /></Field>
            <Field label="Précision GPS (m)"><input inputMode="decimal" value={capture.gpsAccuracyMeters} onChange={(event) => update("gpsAccuracyMeters", event.target.value)} /></Field>
            <Field label="Références photo"><input value={capture.photoReferencesText} onChange={(event) => update("photoReferencesText", event.target.value)} /></Field>
            <div className="gps-card wide">
              <div><strong>Capture assistée</strong><span>{gpsMessage ?? "Utilise la géolocalisation de l'appareil pour réduire les erreurs de saisie."}</span></div>
              <button className="secondary-button iconed" onClick={captureGps} type="button"><LocateFixed size={16} />Capturer GPS</button>
            </div>
          </div>
        );
      default:
        return (
          <div className="validation-grid">
            <article className="review-card primary"><span>Score risque</span><strong>{derivedScores.risk}/100</strong><small>{riskLabel(derivedScores.risk)}</small></article>
            <article className="review-card"><span>Priorité</span><strong>{derivedScores.priority}/100</strong><small>Calculée automatiquement</small></article>
            <article className="review-card"><span>Avancement</span><strong>{derivedScores.progress}%</strong><small>{capture.status}</small></article>
            <article className="review-card"><span>Site</span><strong>{capture.code || "Non renseigné"}</strong><small>{capture.name || "Nom à compléter"}</small></article>
            <article className="review-card wide"><span>Localisation</span><strong>{capture.city || "Ville à compléter"}</strong><small>{capture.department || "Département à compléter"} - {capture.region}</small></article>
            <article className="review-card wide"><span>Prochaine action</span><strong>{capture.nextStep}</strong><small>{capture.lead ? "Point focal: " + capture.lead : "Point focal à compléter"}</small></article>
          </div>
        );
    }
  }

  return (
    <form className="wizard-panel" onSubmit={onSubmit}>
      <div className="wizard-topline">
        <div>
          <p className="panel-label">Remontée terrain</p>
          <h3>Nouvelle fiche site</h3>
        </div>
        <span className={isOnline ? "network-pill online" : "network-pill offline"}>{isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}{isOnline ? "Connexion disponible" : "Mode faible connexion"}</span>
      </div>

      {noticeMessage && (
        <div className="wizard-notice">
          <Database size={16} />
          <span>{noticeMessage}</span>
          {canRetryPendingCaptures && <button className="secondary-button" onClick={() => void onFlushPending()} type="button">Réessayer l’envoi</button>}
        </div>
      )}

      <div className="capture-sync-status" aria-label="Statut des fiches">
        <div className="capture-sync-item">
          <span>Fiche en cours</span>
          <strong className={`capture-status-badge ${currentCaptureStatus.tone}`}>{currentCaptureStatus.label}</strong>
        </div>
        {pendingCount > 0 && (
          <div className="capture-sync-item">
            <span>{pendingCount} fiche(s) locale(s)</span>
            <strong className={`capture-status-badge ${pendingCaptureStatus.tone}`}>{pendingCaptureStatus.label}</strong>
          </div>
        )}
      </div>

      <div className="wizard-progress" aria-label="Progression de la saisie">
        <div><span style={{ width: progress + "%" }} /></div>
        <strong>{progress}%</strong>
      </div>

      <div className="wizard-shell">
        <aside className="wizard-rail" aria-label="Etapes du formulaire">
          {captureSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isDone = index < activeStepIndex;
            const isActive = index === activeStepIndex;
            return (
              <button className={isActive ? "wizard-step active" : isDone ? "wizard-step done" : "wizard-step"} key={step.id} onClick={() => setActiveStepIndex(index)} type="button">
                <span className="wizard-step-icon">{isDone ? <Check size={16} /> : <StepIcon size={16} />}</span>
                <span><strong>{step.title}</strong><small>{step.summary}</small></span>
              </button>
            );
          })}
        </aside>

        <section className="wizard-body">
          <div className="wizard-section-head">
            <div className="wizard-section-icon"><CurrentStepIcon size={20} /></div>
            <div>
              <p className="panel-label">Etape {activeStepIndex + 1} sur {captureSteps.length}</p>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.summary}</p>
            </div>
          </div>
          {renderStep()}
        </section>
      </div>

      {formMessage && <p className="form-message">{formMessage}</p>}

      <div className="wizard-actions">
        <button className="secondary-button iconed" disabled={activeStepIndex === 0 || isSaving} onClick={goBack} type="button"><ChevronLeft size={16} />Retour</button>
        <div>
          <span className="capture-helper">{pendingCount > 0 ? pendingCount + " fiche(s) en attente d’envoi." : "Chaque saisie est conservée sur cet appareil jusqu’à son envoi."}</span>
          {isFinalStep ? (
            <button className="primary-button iconed" disabled={isSaving} type="submit">{isSaving ? <Save size={16} /> : <Send size={16} />}{isSaving ? "Synchronisation en cours" : "Enregistrer et envoyer"}</button>
          ) : (
            <button className="primary-button iconed" disabled={isSaving} onClick={goNext} type="button">Continuer<ChevronRight size={16} /></button>
          )}
        </div>
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
