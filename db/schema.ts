import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const siteStatusEnum = pgEnum("site_status", [
  "not_evaluated",
  "evaluation_scheduled",
  "evaluation_done",
  "mobilization_in_progress",
  "archival_processing",
  "digitization_in_progress",
  "quality_control",
  "completed",
  "high_risk",
  "inaccessible",
]);

export const siteTypeEnum = pgEnum("site_type", [
  "central_direction",
  "regional_direction",
  "departmental_direction",
  "agency",
  "archive_depot",
  "archive_room",
  "temporary_processing_center",
  "ceiba_storage_site",
  "mobile_digitization_unit",
]);

export const confidentialityEnum = pgEnum("confidentiality_level", [
  "low",
  "internal",
  "confidential",
  "critical",
]);

export const territoryTypeEnum = pgEnum("territory_type", [
  "district",
  "region",
  "department",
  "sub_prefecture",
  "commune",
]);

export const recommendationEnum = pgEnum("processing_recommendation", [
  "treat_on_site",
  "transfer_to_center",
  "digitize_on_site",
  "centralized_digitization",
  "urgent_backup",
  "pre_processing_required",
  "secure_temporary_storage",
]);

export const documentTypeEnum = pgEnum("evidence_document_type", [
  "visit_report",
  "photo",
  "floor_plan",
  "inventory",
  "transfer_slip",
  "signed_form",
  "risk_report",
  "quality_report",
  "acceptance_certificate",
]);

export const missionStatusEnum = pgEnum("mission_status", [
  "planned",
  "ready",
  "in_progress",
  "blocked",
  "completed",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    name: text("name").notNull(),
    ministry: text("ministry").notNull().default("MULCV"),
    organizationType: varchar("organization_type", { length: 80 }).notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_code_unique").on(table.code),
    index("organizations_name_idx").on(table.name),
  ],
);

export const administrativeTerritories = pgTable(
  "administrative_territories",
  {
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    name: text("name").notNull(),
    type: territoryTypeEnum("type").notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("territories_code_unique").on(table.code),
    index("territories_type_name_idx").on(table.type, table.name),
  ],
);

export const archiveSites = pgTable(
  "archive_sites",
  {
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    name: text("name").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    territoryId: uuid("territory_id").references(() => administrativeTerritories.id, {
      onDelete: "set null",
    }),
    siteType: siteTypeEnum("site_type").notNull(),
    status: siteStatusEnum("status").notNull().default("evaluation_scheduled"),
    district: text("district").notNull(),
    region: text("region").notNull(),
    department: text("department").notNull(),
    subPrefecture: text("sub_prefecture"),
    city: text("city").notNull(),
    commune: text("commune"),
    address: text("address"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    mapX: integer("map_x").notNull().default(50),
    mapY: integer("map_y").notNull().default(50),
    accessLandmarks: text("access_landmarks"),
    accessibility: varchar("accessibility", { length: 80 }).notNull().default("accessible"),
    totalAgents: integer("total_agents"),
    archiveRoomsCount: integer("archive_rooms_count").notNull().default(0),
    storageCapacityMl: decimal("storage_capacity_ml", { precision: 12, scale: 2 }),
    linearMeters: decimal("linear_meters", { precision: 12, scale: 2 }).notNull().default("0"),
    estimatedBoxes: integer("estimated_boxes").notNull().default(0),
    estimatedFiles: integer("estimated_files").notNull().default(0),
    estimatedPages: integer("estimated_pages").notNull().default(0),
    documentCategories: jsonb("document_categories").$type<string[]>().notNull().default([]),
    dateRangeStart: integer("date_range_start"),
    dateRangeEnd: integer("date_range_end"),
    confidentiality: confidentialityEnum("confidentiality").notNull().default("internal"),
    hasInventory: boolean("has_inventory").notNull().default(false),
    hasElectricity: boolean("has_electricity").notNull().default(false),
    hasInternet: boolean("has_internet").notNull().default(false),
    hasAccessControl: boolean("has_access_control").notNull().default(false),
    hasFireDetection: boolean("has_fire_detection").notNull().default(false),
    riskScore: integer("risk_score").notNull().default(0),
    priorityScore: integer("priority_score").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    nextAction: text("next_action"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("archive_sites_code_unique").on(table.code),
    index("archive_sites_region_idx").on(table.region),
    index("archive_sites_status_idx").on(table.status),
    index("archive_sites_risk_idx").on(table.riskScore),
    index("archive_sites_coordinates_idx").on(table.latitude, table.longitude),
  ],
);

export const siteContacts = pgTable(
  "site_contacts",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    role: varchar("role", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 180 }),
    canValidate: boolean("can_validate").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("site_contacts_site_idx").on(table.siteId)],
);

export const archiveRooms = pgTable(
  "archive_rooms",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    roomType: varchar("room_type", { length: 80 }).notNull(),
    surfaceM2: decimal("surface_m2", { precision: 10, scale: 2 }),
    shelfCount: integer("shelf_count").notNull().default(0),
    ventilationCondition: varchar("ventilation_condition", { length: 80 }),
    securityNotes: text("security_notes"),
  },
  (table) => [index("archive_rooms_site_idx").on(table.siteId)],
);

export const archivalFunds = pgTable(
  "archival_funds",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    series: text("series"),
    supportTypes: jsonb("support_types").$type<string[]>().notNull().default([]),
    dateStart: integer("date_start"),
    dateEnd: integer("date_end"),
    linearMeters: decimal("linear_meters", { precision: 12, scale: 2 }).notNull().default("0"),
    boxes: integer("boxes").notNull().default(0),
    files: integer("files").notNull().default(0),
    pages: integer("pages").notNull().default(0),
    classificationState: varchar("classification_state", { length: 120 }).notNull(),
    confidentiality: confidentialityEnum("confidentiality").notNull().default("internal"),
  },
  (table) => [index("archival_funds_site_idx").on(table.siteId)],
);

export const siteEvaluations = pgTable(
  "site_evaluations",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    evaluatorName: text("evaluator_name").notNull(),
    physicalStateScore: integer("physical_state_score").notNull(),
    humidityScore: integer("humidity_score").notNull(),
    securityScore: integer("security_score").notNull(),
    inventoryScore: integer("inventory_score").notNull(),
    sensitivityScore: integer("sensitivity_score").notNull(),
    accessScore: integer("access_score").notNull(),
    riskScore: integer("risk_score").notNull(),
    priorityScore: integer("priority_score").notNull(),
    recommendation: recommendationEnum("recommendation").notNull(),
    notes: text("notes"),
    rawAnswers: jsonb("raw_answers").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("site_evaluations_site_idx").on(table.siteId)],
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull(),
  name: text("name").notNull(),
  specialty: varchar("specialty", { length: 100 }).notNull(),
  homeBase: text("home_base"),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    role: varchar("role", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 180 }),
  },
  (table) => [index("team_members_team_idx").on(table.teamId)],
);

export const equipment = pgTable("equipment", {
  id: uuid("id").primaryKey(),
  assetTag: varchar("asset_tag", { length: 60 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  label: text("label").notNull(),
  status: varchar("status", { length: 80 }).notNull().default("available"),
  assignedTeamId: uuid("assigned_team_id").references(() => teams.id, { onDelete: "set null" }),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey(),
  plateNumber: varchar("plate_number", { length: 40 }).notNull(),
  label: text("label").notNull(),
  status: varchar("status", { length: 80 }).notNull().default("available"),
  assignedTeamId: uuid("assigned_team_id").references(() => teams.id, { onDelete: "set null" }),
});

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    title: text("title").notNull(),
    status: missionStatusEnum("status").notNull().default("planned"),
    regionScope: text("region_scope").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    leadTeamId: uuid("lead_team_id").references(() => teams.id, { onDelete: "set null" }),
    objective: text("objective").notNull(),
    vehicleNeeds: integer("vehicle_needs").notNull().default(0),
    scannerNeeds: integer("scanner_needs").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("missions_code_unique").on(table.code)],
);

export const missionSites = pgTable(
  "mission_sites",
  {
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    plannedSequence: integer("planned_sequence").notNull().default(1),
    checklistReady: boolean("checklist_ready").notNull().default(false),
    transferRequired: boolean("transfer_required").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.missionId, table.siteId] })],
);

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "set null" }),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    boxesCount: integer("boxes_count").notNull().default(0),
    status: varchar("status", { length: 80 }).notNull().default("planned"),
    plannedAt: timestamp("planned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("transfers_site_idx").on(table.siteId)],
);

export const digitizationBatches = pgTable(
  "digitization_batches",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    status: varchar("status", { length: 80 }).notNull().default("preparation"),
    pagesPrepared: integer("pages_prepared").notNull().default(0),
    pagesScanned: integer("pages_scanned").notNull().default(0),
    documentsIndexed: integer("documents_indexed").notNull().default(0),
    rejectedDocuments: integer("rejected_documents").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("digitization_batches_code_unique").on(table.code)],
);

export const qualityControls = pgTable(
  "quality_controls",
  {
    id: uuid("id").primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => digitizationBatches.id, { onDelete: "cascade" }),
    controllerName: text("controller_name").notNull(),
    checkedDocuments: integer("checked_documents").notNull().default(0),
    acceptedDocuments: integer("accepted_documents").notNull().default(0),
    rejectedDocuments: integer("rejected_documents").notNull().default(0),
    rejectionReasons: jsonb("rejection_reasons").$type<string[]>().notNull().default([]),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("quality_controls_batch_idx").on(table.batchId)],
);

export const operationalMetrics = pgTable(
  "operational_metrics",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    metricDate: date("metric_date").notNull(),
    boxesIdentified: integer("boxes_identified").notNull().default(0),
    boxesCollected: integer("boxes_collected").notNull().default(0),
    linearMetersProcessed: decimal("linear_meters_processed", { precision: 12, scale: 2 }).notNull().default("0"),
    pagesPrepared: integer("pages_prepared").notNull().default(0),
    pagesScanned: integer("pages_scanned").notNull().default(0),
    documentsIndexed: integer("documents_indexed").notNull().default(0),
    qualityChecks: integer("quality_checks").notNull().default(0),
    documentsValidated: integer("documents_validated").notNull().default(0),
    documentsRejected: integer("documents_rejected").notNull().default(0),
    gedIntegrated: integer("ged_integrated").notNull().default(0),
    saeTransferred: integer("sae_transferred").notNull().default(0),
  },
  (table) => [index("operational_metrics_site_date_idx").on(table.siteId, table.metricDate)],
);

export const evidenceDocuments = pgTable(
  "evidence_documents",
  {
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => archiveSites.id, { onDelete: "cascade" }),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "set null" }),
    type: documentTypeEnum("type").notNull(),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    storageProvider: varchar("storage_provider", { length: 80 }).notNull().default("s3-compatible"),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes"),
    checksumSha256: varchar("checksum_sha256", { length: 80 }),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("evidence_documents_site_idx").on(table.siteId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    actorName: text("actor_name").notNull(),
    actorRole: varchar("actor_role", { length: 100 }).notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_created_idx").on(table.createdAt)],
);

export const archiveSitesRelations = relations(archiveSites, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [archiveSites.organizationId],
    references: [organizations.id],
  }),
  contacts: many(siteContacts),
  rooms: many(archiveRooms),
  funds: many(archivalFunds),
  evaluations: many(siteEvaluations),
  documents: many(evidenceDocuments),
  metrics: many(operationalMetrics),
}));

export type ArchiveSite = typeof archiveSites.$inferSelect;
export type NewArchiveSite = typeof archiveSites.$inferInsert;
