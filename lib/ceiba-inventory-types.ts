export type CeibaInventoryStatusLabel = "Nouveau" | "En revue" | "Traité" | "Bloqué";

export type CeibaInventoryInput = {
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
