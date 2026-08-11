export type CeibaInventoryStatusLabel = "Nouveau" | "En revue" | "Traité" | "Bloqué";

export type CeibaInventoryInput = {
  boxLabel: string;
  barcode: string;
  guichetNumber: string;
  dduNumber: string;
  classificationReference: string;
  ilotNumber: string;
  lotNumber: string;
  surfaceArea: string;
  landTitleNumber: string;
  housingEstate: string;
  commune: string;
  caseNature: string;
  lastName: string;
  firstNames: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
  contactMobile: string;
  status: CeibaInventoryStatusLabel;
  notes: string;
};

export type CeibaInventoryRecord = CeibaInventoryInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type CeibaInventoryOperatorPerformance = {
  login: string;
  name: string;
  employeeId: string | null;
  assignedRoom: string | null;
  totalRecords: number;
  newRecords: number;
  reviewedRecords: number;
  processedRecords: number;
  blockedRecords: number;
};

export type CeibaInventoryProductionSnapshot = {
  dashboard: CeibaInventoryDashboard;
  operatorPerformance: CeibaInventoryOperatorPerformance[];
  dailyProduction: CeibaInventoryDailyProduction[];
};

export type CeibaInventoryDailyProduction = {
  operatorLogin: string;
  operatorName: string;
  assignedRoom: string | null;
  cartonsCount: number;
  dossiersCount: number;
  damagedCartonsCount: number;
  damagedDossiersCount: number;
};

export type CeibaInventoryDailyProductionInput = {
  productionDate: string;
  cartonsCount: number;
  dossiersCount: number;
  damagedCartonsCount: number;
  damagedDossiersCount: number;
  difficulties: string;
};

export type CeibaInventoryDashboard = {
  databaseReady: boolean;
  schemaReady: boolean;
  message: string | null;
  totalRecords: number;
  newRecords: number;
  reviewedRecords: number;
  processedRecords: number;
  blockedRecords: number;
  todayRecords: number;
  uniqueCommunes: number;
  recentRecords: CeibaInventoryRecord[];
  activityByCommune: Array<{ commune: string; count: number }>;
};
