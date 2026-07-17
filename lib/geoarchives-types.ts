export type SiteStatusLabel =
  | "Non évalué"
  | "Évaluation planifiée"
  | "Évaluation réalisée"
  | "Mobilisation en cours"
  | "Traitement en cours"
  | "Numérisation en cours"
  | "Contrôle qualité"
  | "Traitement terminé"
  | "Risque élevé"
  | "Inaccessible";

export type DashboardSite = {
  id: string;
  code: string;
  name: string;
  organization: string;
  region: string;
  district: string;
  department: string;
  city: string;
  type: string;
  status: SiteStatusLabel;
  risk: number;
  priority: number;
  meters: number;
  boxes: number;
  pages: number;
  progress: number;
  confidentiality: "Faible" | "Interne" | "Confidentiel" | "Critique";
  latitude: number | null;
  longitude: number | null;
  x: number;
  y: number;
  lead: string;
  phone: string;
  nextStep: string;
};

export type MissionPlanItem = {
  id: string;
  wave: string;
  region: string;
  dates: string;
  team: string;
  focus: string;
  status: string;
};

export type DocumentStat = {
  label: string;
  count: number;
  trend: string;
};

export type AuditEntry = {
  id: string;
  description: string;
  actor: string;
  createdAt: string;
};

export type GeoArchivesDashboard = {
  databaseReady: boolean;
  schemaReady: boolean;
  message: string | null;
  sites: DashboardSite[];
  missions: MissionPlanItem[];
  documents: DocumentStat[];
  auditEntries: AuditEntry[];
};

export type CaptureSiteInput = {
  code: string;
  name: string;
  organization: string;
  region: string;
  district: string;
  department: string;
  city: string;
  type: string;
  status: SiteStatusLabel;
  meters: number;
  boxes: number;
  pages: number;
  risk: number;
  priority: number;
  progress: number;
  confidentiality: DashboardSite["confidentiality"];
  latitude?: number | null;
  longitude?: number | null;
  lead: string;
  phone: string;
  nextStep: string;
};
