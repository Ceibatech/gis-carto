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
  subPrefecture: string;
  commune: string;
  city: string;
  address: string;
  accessLandmarks: string;
  accessibility: string;
  type: string;
  status: SiteStatusLabel;
  risk: number;
  priority: number;
  meters: number;
  storageCapacityMl: number;
  boxes: number;
  files: number;
  pages: number;
  totalAgents: number;
  archiveRoomsCount: number;
  progress: number;
  documentCategories: string[];
  dateRangeStart: number | null;
  dateRangeEnd: number | null;
  hasInventory: boolean;
  hasElectricity: boolean;
  hasInternet: boolean;
  hasAccessControl: boolean;
  hasFireDetection: boolean;
  confidentiality: "Faible" | "Interne" | "Confidentiel" | "Critique";
  latitude: number | null;
  longitude: number | null;
  x: number;
  y: number;
  lead: string;
  respondentRole: string;
  respondentEmail: string;
  phone: string;
  nextStep: string;
  roadCondition?: string;
  lastMileCondition?: string;
  travelTimeMinutes?: number;
  networkQuality?: string;
  buildingCondition?: string;
  storageCondition?: string;
  waterRiskLevel?: string;
  securityRiskLevel?: string;
  seasonalConstraints?: string;
  surveyNotes?: string;
  gpsAccuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
  checklistVehicleAccess?: boolean;
  checklistLoadingArea?: boolean;
  checklistSiteSignage?: boolean;
  checklistArchivesSeparated?: boolean;
  checklistShelvingAvailable?: boolean;
  checklistHumidityObserved?: boolean;
  checklistPestObserved?: boolean;
  checklistFireExtinguisher?: boolean;
  checklistBackupPower?: boolean;
  checklistImmediateRiskReported?: boolean;
};

export type MissionPlanItem = {
  id: string;
  wave: string;
  region: string;
  dates: string;
  startDate: string;
  endDate: string;
  team: string;
  focus: string;
  status: string;
  siteCount: number;
  assignedSiteCodes: string[];
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
  subPrefecture: string;
  commune: string;
  city: string;
  address: string;
  accessLandmarks: string;
  accessibility: string;
  type: string;
  status: SiteStatusLabel;
  meters: number;
  storageCapacityMl: number;
  boxes: number;
  files: number;
  pages: number;
  risk: number;
  priority: number;
  progress: number;
  totalAgents: number;
  archiveRoomsCount: number;
  documentCategories: string[];
  dateRangeStart?: number | null;
  dateRangeEnd?: number | null;
  hasInventory: boolean;
  hasElectricity: boolean;
  hasInternet: boolean;
  hasAccessControl: boolean;
  hasFireDetection: boolean;
  confidentiality: DashboardSite["confidentiality"];
  latitude?: number | null;
  longitude?: number | null;
  lead: string;
  respondentRole: string;
  respondentEmail: string;
  phone: string;
  nextStep: string;
  roadCondition: string;
  lastMileCondition: string;
  travelTimeMinutes: number;
  networkQuality: string;
  buildingCondition: string;
  storageCondition: string;
  waterRiskLevel: string;
  securityRiskLevel: string;
  seasonalConstraints: string;
  surveyNotes: string;
  photoReferences: string[];
  gpsAccuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
  checklistVehicleAccess: boolean;
  checklistLoadingArea: boolean;
  checklistSiteSignage: boolean;
  checklistArchivesSeparated: boolean;
  checklistShelvingAvailable: boolean;
  checklistHumidityObserved: boolean;
  checklistPestObserved: boolean;
  checklistFireExtinguisher: boolean;
  checklistBackupPower: boolean;
  checklistImmediateRiskReported: boolean;
};
