import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type {
  CaptureSiteInput,
  DashboardSite,
  DocumentStat,
  GeoArchivesDashboard,
  MissionPlanItem,
  SiteStatusLabel,
} from "../lib/geoarchives-types";
import { getPool, isDatabaseConfigured } from "./index";

const statusLabels: Record<string, SiteStatusLabel> = {
  not_evaluated: "Non évalué",
  evaluation_scheduled: "Évaluation planifiée",
  evaluation_done: "Évaluation réalisée",
  mobilization_in_progress: "Mobilisation en cours",
  archival_processing: "Traitement en cours",
  digitization_in_progress: "Numérisation en cours",
  quality_control: "Contrôle qualité",
  completed: "Traitement terminé",
  high_risk: "Risque élevé",
  inaccessible: "Inaccessible",
};

const statusValues: Record<SiteStatusLabel, string> = {
  "Non évalué": "not_evaluated",
  "Évaluation planifiée": "evaluation_scheduled",
  "Évaluation réalisée": "evaluation_done",
  "Mobilisation en cours": "mobilization_in_progress",
  "Traitement en cours": "archival_processing",
  "Numérisation en cours": "digitization_in_progress",
  "Contrôle qualité": "quality_control",
  "Traitement terminé": "completed",
  "Risque élevé": "high_risk",
  Inaccessible: "inaccessible",
};

const siteTypeLabels: Record<string, string> = {
  central_direction: "Direction centrale",
  regional_direction: "Direction régionale",
  departmental_direction: "Direction départementale",
  agency: "Agence rattachée",
  archive_depot: "Dépôt d'archives",
  archive_room: "Local d'archives",
  temporary_processing_center: "Centre temporaire",
  ceiba_storage_site: "Site CEIBA",
  mobile_digitization_unit: "Unité mobile",
};

const siteTypeValues: Record<string, string> = {
  "Direction centrale": "central_direction",
  "Direction régionale": "regional_direction",
  "Direction départementale": "departmental_direction",
  "Agence rattachée": "agency",
  "Dépôt d'archives": "archive_depot",
  "Local d'archives": "archive_room",
  "Centre temporaire": "temporary_processing_center",
  "Site CEIBA": "ceiba_storage_site",
  "Unité mobile": "mobile_digitization_unit",
};

const confidentialityLabels: Record<string, DashboardSite["confidentiality"]> = {
  low: "Faible",
  internal: "Interne",
  confidential: "Confidentiel",
  critical: "Critique",
};

const confidentialityValues: Record<DashboardSite["confidentiality"], string> = {
  Faible: "low",
  Interne: "internal",
  Confidentiel: "confidential",
  Critique: "critical",
};

const documentLabels: Record<string, string> = {
  visit_report: "Rapports de visite",
  photo: "Photographies géolocalisées",
  floor_plan: "Plans des locaux",
  inventory: "Inventaires importés",
  transfer_slip: "Bordereaux de transfert",
  signed_form: "Procès-verbaux signés",
  risk_report: "Rapports de risque",
  quality_report: "Rapports contrôle qualité",
  acceptance_certificate: "Certificats de réception",
};

type SiteRow = RowDataPacket & {
  id: string;
  code: string;
  name: string;
  organization: string | null;
  region: string;
  district: string;
  department: string;
  sub_prefecture: string | null;
  commune: string | null;
  city: string;
  address: string | null;
  access_landmarks: string | null;
  accessibility: string;
  site_type: string;
  status: string;
  risk_score: number;
  priority_score: number;
  storage_capacity_ml: string | number | null;
  linear_meters: string | number;
  estimated_boxes: number;
  estimated_files: number;
  estimated_pages: number;
  total_agents: number | null;
  archive_rooms_count: number;
  document_categories: string | null;
  date_range_start: number | null;
  date_range_end: number | null;
  has_inventory: number | boolean;
  has_electricity: number | boolean;
  has_internet: number | boolean;
  has_access_control: number | boolean;
  has_fire_detection: number | boolean;
  progress_percent: number;
  confidentiality: string;
  latitude: string | number | null;
  longitude: string | number | null;
  map_x: number;
  map_y: number;
  lead: string | null;
  respondent_role: string | null;
  respondent_email: string | null;
  phone: string | null;
  next_action: string | null;
  road_condition: string | null;
  last_mile_condition: string | null;
  travel_time_minutes: number | null;
  network_quality: string | null;
  building_condition: string | null;
  storage_condition: string | null;
  water_risk_level: string | null;
  security_risk_level: string | null;
  seasonal_constraints: string | null;
  survey_notes: string | null;
  gps_accuracy_meters: string | number | null;
  gps_captured_at: string | Date | null;
  checklist_vehicle_access: number | boolean | null;
  checklist_loading_area: number | boolean | null;
  checklist_site_signage: number | boolean | null;
  checklist_archives_separated: number | boolean | null;
  checklist_shelving_available: number | boolean | null;
  checklist_humidity_observed: number | boolean | null;
  checklist_pest_observed: number | boolean | null;
  checklist_fire_extinguisher: number | boolean | null;
  checklist_backup_power: number | boolean | null;
  checklist_immediate_risk_reported: number | boolean | null;
};
type MissionRow = RowDataPacket & {
  id: string;
  code: string;
  region_scope: string;
  start_date: string | Date;
  end_date: string | Date;
  team: string | null;
  objective: string;
  status: string;
  site_count: number | string;
  assigned_site_codes: string | null;
};

type DocumentRow = RowDataPacket & {
  type: string;
  count: number | string;
  latest: string | Date | null;
};

type AuditRow = RowDataPacket & {
  id: string;
  actor_name: string;
  description: string;
  created_at: string | Date;
};

type IdRow = RowDataPacket & { id: string };
type TerritoryRow = RowDataPacket & { id: string; name: string; type: string; parent_id: string | null };

export async function getGeoArchivesDashboard(): Promise<GeoArchivesDashboard> {
  if (!isDatabaseConfigured()) {
    return emptyDashboard(false, false, null);
  }

  let pool: ReturnType<typeof getPool> | null = null;

  try {
    pool = getPool();
    const [siteRows] = await pool.query<SiteRow[]>(`
      select
        s.id,
        s.code,
        s.name,
        o.name as organization,
        s.region,
        s.district,
        s.department,
        s.sub_prefecture,
        s.commune,
        s.city,
        s.address,
        s.access_landmarks,
        s.accessibility,
        s.site_type,
        s.status,
        s.risk_score,
        s.priority_score,
        s.storage_capacity_ml,
        s.linear_meters,
        s.estimated_boxes,
        s.estimated_files,
        s.estimated_pages,
        s.total_agents,
        s.archive_rooms_count,
        s.document_categories,
        s.date_range_start,
        s.date_range_end,
        s.has_inventory,
        s.has_electricity,
        s.has_internet,
        s.has_access_control,
        s.has_fire_detection,
        s.progress_percent,
        s.confidentiality,
        s.latitude,
        s.longitude,
        s.map_x,
        s.map_y,
        c.full_name as lead,
        c.role as respondent_role,
        c.email as respondent_email,
        c.phone,
        s.next_action,
        scs.road_condition,
        scs.last_mile_condition,
        scs.travel_time_minutes,
        scs.network_quality,
        scs.building_condition,
        scs.storage_condition,
        scs.water_risk_level,
        scs.security_risk_level,
        scs.seasonal_constraints,
        scs.survey_notes,
        scs.gps_accuracy_meters,
        scs.gps_captured_at,
        scs.checklist_vehicle_access,
        scs.checklist_loading_area,
        scs.checklist_site_signage,
        scs.checklist_archives_separated,
        scs.checklist_shelving_available,
        scs.checklist_humidity_observed,
        scs.checklist_pest_observed,
        scs.checklist_fire_extinguisher,
        scs.checklist_backup_power,
        scs.checklist_immediate_risk_reported
      from archive_sites s
      left join organizations o on o.id = s.organization_id
      left join site_contacts c on c.site_id = s.id and c.is_primary = 1
      left join site_census_surveys scs on scs.site_id = s.id
      order by s.priority_score desc, s.risk_score desc
    `);

    const [missionRows] = await pool.query<MissionRow[]>(`
      select
        m.id,
        m.code,
        m.region_scope,
        m.start_date,
        m.end_date,
        t.name as team,
        m.objective,
        m.status,
        count(ms.site_id) as site_count,
        group_concat(s.code order by ms.planned_sequence separator '|') as assigned_site_codes
      from missions m
      left join teams t on t.id = m.lead_team_id
      left join mission_sites ms on ms.mission_id = m.id
      left join archive_sites s on s.id = ms.site_id
      group by m.id, m.code, m.region_scope, m.start_date, m.end_date, t.name, m.objective, m.status
      order by m.start_date asc
    `);

    const [documentRows] = await pool.query<DocumentRow[]>(`
      select type, count(*) as count, max(uploaded_at) as latest
      from evidence_documents
      group by type
    `);

    const [auditRows] = await pool.query<AuditRow[]>(`
      select id, actor_name, description, created_at
      from audit_logs
      order by created_at desc
      limit 6
    `);

    return {
      databaseReady: true,
      schemaReady: true,
      message: null,
      sites: siteRows.map((site): DashboardSite => ({
        id: site.id,
        code: site.code,
        name: site.name,
        organization: site.organization ?? "Organisation non renseignée",
        region: site.region,
        district: site.district,
        department: site.department,
        subPrefecture: site.sub_prefecture ?? "",
        commune: site.commune ?? "",
        city: site.city,
        address: site.address ?? "",
        accessLandmarks: site.access_landmarks ?? "",
        accessibility: site.accessibility,
        type: siteTypeLabels[site.site_type] ?? site.site_type,
        status: statusLabels[site.status] ?? "Non évalué",
        risk: Number(site.risk_score),
        priority: Number(site.priority_score),
        storageCapacityMl: Number(site.storage_capacity_ml ?? 0),
        meters: Number(site.linear_meters),
        boxes: Number(site.estimated_boxes),
        files: Number(site.estimated_files),
        pages: Number(site.estimated_pages),
        totalAgents: Number(site.total_agents ?? 0),
        archiveRoomsCount: Number(site.archive_rooms_count),
        documentCategories: parseDocumentCategories(site.document_categories),
        dateRangeStart: site.date_range_start === null ? null : Number(site.date_range_start),
        dateRangeEnd: site.date_range_end === null ? null : Number(site.date_range_end),
        hasInventory: Boolean(site.has_inventory),
        hasElectricity: Boolean(site.has_electricity),
        hasInternet: Boolean(site.has_internet),
        hasAccessControl: Boolean(site.has_access_control),
        hasFireDetection: Boolean(site.has_fire_detection),
        progress: Number(site.progress_percent),
        confidentiality: confidentialityLabels[site.confidentiality] ?? "Interne",
        latitude: site.latitude === null ? null : Number(site.latitude),
        longitude: site.longitude === null ? null : Number(site.longitude),
        x: Number(site.map_x),
        y: Number(site.map_y),
        lead: site.lead ?? "Point focal à désigner",
        respondentRole: site.respondent_role ?? "Point focal",
        respondentEmail: site.respondent_email ?? "",
        phone: site.phone ?? "Non renseigné",
        nextStep: site.next_action ?? "Planifier la prochaine action",
        roadCondition: site.road_condition ?? "",
        lastMileCondition: site.last_mile_condition ?? "",
        travelTimeMinutes: site.travel_time_minutes ?? 0,
        networkQuality: site.network_quality ?? "",
        buildingCondition: site.building_condition ?? "",
        storageCondition: site.storage_condition ?? "",
        waterRiskLevel: site.water_risk_level ?? "",
        securityRiskLevel: site.security_risk_level ?? "",
        seasonalConstraints: site.seasonal_constraints ?? "",
        surveyNotes: site.survey_notes ?? "",
        gpsAccuracyMeters: site.gps_accuracy_meters === null ? null : Number(site.gps_accuracy_meters),
        gpsCapturedAt: site.gps_captured_at ? new Date(site.gps_captured_at).toISOString() : null,
        checklistVehicleAccess: Boolean(site.checklist_vehicle_access),
        checklistLoadingArea: Boolean(site.checklist_loading_area),
        checklistSiteSignage: Boolean(site.checklist_site_signage),
        checklistArchivesSeparated: Boolean(site.checklist_archives_separated),
        checklistShelvingAvailable: Boolean(site.checklist_shelving_available),
        checklistHumidityObserved: Boolean(site.checklist_humidity_observed),
        checklistPestObserved: Boolean(site.checklist_pest_observed),
        checklistFireExtinguisher: Boolean(site.checklist_fire_extinguisher),
        checklistBackupPower: Boolean(site.checklist_backup_power),
        checklistImmediateRiskReported: Boolean(site.checklist_immediate_risk_reported),
      })),
      missions: missionRows.map((mission): MissionPlanItem => ({
        id: mission.id,
        wave: mission.code,
        region: mission.region_scope,
        dates: formatDateRange(mission.start_date, mission.end_date),
        startDate: toIsoDate(mission.start_date),
        endDate: toIsoDate(mission.end_date),
        team: mission.team ?? "Équipe à affecter",
        focus: mission.objective,
        status: mission.status,
        siteCount: Number(mission.site_count),
        assignedSiteCodes: mission.assigned_site_codes ? mission.assigned_site_codes.split("|") : [],
      })),
      documents: documentRows.map((document): DocumentStat => ({
        label: documentLabels[document.type] ?? document.type,
        count: Number(document.count),
        trend: document.latest ? `Dernier dépôt ${formatShortDate(document.latest)}` : "Aucun dépôt daté",
      })),
      auditEntries: auditRows.map((entry) => ({
        id: entry.id,
        description: entry.description,
        actor: entry.actor_name,
        createdAt: new Date(entry.created_at).toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Le service est temporairement indisponible";
    return emptyDashboard(
      true,
      false,
      `Le service de pilotage est en cours d'ouverture. ${message}`,
    );
  } finally {
    await pool?.end().catch(() => undefined);
  }
}

export async function createCapturedSite(input: CaptureSiteInput) {
  if (!isDatabaseConfigured()) {
    throw new Error("La publication des fiches n'est pas encore ouverte.");
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  const organizationCode = makeCode("ORG", input.organization);
  const siteCode = input.code.trim().toUpperCase();
  const mapPoint = coordinatesToMap(input.latitude ?? null, input.longitude ?? null);

  try {
    await connection.beginTransaction();

    const [existingOrganizations] = await connection.query<IdRow[]>(
      "select id from organizations where code = ? limit 1",
      [organizationCode],
    );
    const organizationId = existingOrganizations[0]?.id ?? randomUUID();

    if (existingOrganizations.length) {
      await connection.execute(
        "update organizations set name = ?, organization_type = ?, updated_at = current_timestamp where id = ?",
        [input.organization.trim(), "structure", organizationId],
      );
    } else {
      await connection.execute(
        "insert into organizations (id, code, name, ministry, organization_type) values (?, ?, ?, 'MULCV', ?)",
        [organizationId, organizationCode, input.organization.trim(), "structure"],
      );
    }

    const territoryId = await ensureAdministrativeTerritoryChain(connection, input);

    const [existingSites] = await connection.query<IdRow[]>(
      "select id from archive_sites where code = ? limit 1",
      [siteCode],
    );
    const siteId = existingSites[0]?.id ?? randomUUID();
    const siteValues = [
      input.name.trim(),
      organizationId,
      territoryId,
      siteTypeValues[input.type] ?? "archive_depot",
      statusValues[input.status] ?? "evaluation_scheduled",
      input.district.trim(),
      input.region.trim(),
      input.department.trim(),
      nullIfEmpty(input.subPrefecture),
      nullIfEmpty(input.commune),
      input.city.trim(),
      nullIfEmpty(input.address),
      input.latitude ?? null,
      input.longitude ?? null,
      mapPoint.x,
      mapPoint.y,
      nullIfEmpty(input.accessLandmarks),
      input.accessibility.trim() || "accessible",
      input.totalAgents,
      input.archiveRoomsCount,
      input.storageCapacityMl,
      input.meters,
      input.boxes,
      input.files,
      input.pages,
      JSON.stringify(input.documentCategories),
      input.dateRangeStart ?? null,
      input.dateRangeEnd ?? null,
      confidentialityValues[input.confidentiality] ?? "internal",
      input.hasInventory,
      input.hasElectricity,
      input.hasInternet,
      input.hasAccessControl,
      input.hasFireDetection,
      input.risk,
      input.priority,
      input.progress,
      input.nextStep.trim(),
    ];

    if (existingSites.length) {
      await connection.execute(
        `update archive_sites set
          name = ?, organization_id = ?, territory_id = ?, site_type = ?, status = ?, district = ?, region = ?, department = ?, sub_prefecture = ?, commune = ?, city = ?, address = ?,
          latitude = ?, longitude = ?, map_x = ?, map_y = ?, access_landmarks = ?, accessibility = ?, total_agents = ?, archive_rooms_count = ?, storage_capacity_ml = ?, linear_meters = ?, estimated_boxes = ?, estimated_files = ?, estimated_pages = ?,
          document_categories = ?, date_range_start = ?, date_range_end = ?, confidentiality = ?, has_inventory = ?, has_electricity = ?, has_internet = ?, has_access_control = ?, has_fire_detection = ?, risk_score = ?, priority_score = ?, progress_percent = ?, next_action = ?, updated_at = current_timestamp
        where id = ?`,
        [...siteValues, siteId],
      );
    } else {
      await connection.execute(
        `insert into archive_sites (
          id, code, name, organization_id, territory_id, site_type, status, district, region, department, sub_prefecture, commune, city, address,
          latitude, longitude, map_x, map_y, access_landmarks, accessibility, total_agents, archive_rooms_count, storage_capacity_ml, linear_meters, estimated_boxes, estimated_files, estimated_pages,
          document_categories, date_range_start, date_range_end, confidentiality, has_inventory, has_electricity, has_internet, has_access_control, has_fire_detection, risk_score, priority_score, progress_percent, next_action
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [siteId, siteCode, ...siteValues],
      );
    }

    const [existingContacts] = await connection.query<IdRow[]>(
      "select id from site_contacts where site_id = ? and is_primary = 1 limit 1",
      [siteId],
    );

    if (existingContacts.length) {
      await connection.execute(
        "update site_contacts set full_name = ?, role = ?, phone = ?, email = ?, can_validate = 1 where id = ?",
        [input.lead.trim(), input.respondentRole.trim() || "Point focal", input.phone.trim(), nullIfEmpty(input.respondentEmail), existingContacts[0].id],
      );
    } else {
      await connection.execute(
        "insert into site_contacts (id, site_id, full_name, role, phone, email, can_validate, is_primary) values (?, ?, ?, ?, ?, ?, 1, 1)",
        [randomUUID(), siteId, input.lead.trim(), input.respondentRole.trim() || "Point focal", input.phone.trim(), nullIfEmpty(input.respondentEmail)],
      );
    }

    const censusValues = [
      siteId,
      input.lead.trim(),
      input.respondentRole.trim() || "Point focal",
      input.phone.trim(),
      nullIfEmpty(input.respondentEmail),
      input.roadCondition.trim(),
      input.lastMileCondition.trim(),
      input.travelTimeMinutes,
      input.networkQuality.trim(),
      input.buildingCondition.trim(),
      input.storageCondition.trim(),
      input.waterRiskLevel.trim(),
      input.securityRiskLevel.trim(),
      nullIfEmpty(input.seasonalConstraints),
      nullIfEmpty(input.surveyNotes),
      JSON.stringify(input.photoReferences),
      input.gpsAccuracyMeters ?? null,
      input.gpsCapturedAt ?? null,
      input.checklistVehicleAccess,
      input.checklistLoadingArea,
      input.checklistSiteSignage,
      input.checklistArchivesSeparated,
      input.checklistShelvingAvailable,
      input.checklistHumidityObserved,
      input.checklistPestObserved,
      input.checklistFireExtinguisher,
      input.checklistBackupPower,
      input.checklistImmediateRiskReported,
      JSON.stringify(input),
    ];

    const [existingSurveyRows] = await connection.query<IdRow[]>(
      "select id from site_census_surveys where site_id = ? limit 1",
      [siteId],
    );

    if (existingSurveyRows.length) {
      await connection.execute(
        `update site_census_surveys set
          respondent_name = ?, respondent_role = ?, respondent_phone = ?, respondent_email = ?, road_condition = ?, last_mile_condition = ?,
          travel_time_minutes = ?, network_quality = ?, building_condition = ?, storage_condition = ?, water_risk_level = ?, security_risk_level = ?,
          seasonal_constraints = ?, survey_notes = ?, photo_references = ?, gps_accuracy_meters = ?, gps_captured_at = ?,
          checklist_vehicle_access = ?, checklist_loading_area = ?, checklist_site_signage = ?, checklist_archives_separated = ?, checklist_shelving_available = ?,
          checklist_humidity_observed = ?, checklist_pest_observed = ?, checklist_fire_extinguisher = ?, checklist_backup_power = ?, checklist_immediate_risk_reported = ?,
          raw_payload = ?, updated_at = current_timestamp
        where site_id = ?`,
        [...censusValues.slice(1), siteId],
      );
    } else {
      await connection.execute(
        `insert into site_census_surveys (
          id, site_id, respondent_name, respondent_role, respondent_phone, respondent_email, road_condition, last_mile_condition,
          travel_time_minutes, network_quality, building_condition, storage_condition, water_risk_level, security_risk_level,
          seasonal_constraints, survey_notes, photo_references, gps_accuracy_meters, gps_captured_at,
          checklist_vehicle_access, checklist_loading_area, checklist_site_signage, checklist_archives_separated, checklist_shelving_available,
          checklist_humidity_observed, checklist_pest_observed, checklist_fire_extinguisher, checklist_backup_power, checklist_immediate_risk_reported,
          raw_payload
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), ...censusValues],
      );
    }

    await connection.execute(
      `insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, metadata)
       values (?, 'PMO MULCV', 'Administrateur', 'site_capture_saved', 'archive_site', ?, ?, ?)`,
      [
        randomUUID(),
        siteId,
        `Fiche ${siteCode} enregistrée depuis l'interface de capture`,
        JSON.stringify({ source: "web_capture" }),
      ],
    );

    await connection.commit();
    return { id: siteId, code: siteCode };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end().catch(() => undefined);
  }
}

function emptyDashboard(databaseReady: boolean, schemaReady: boolean, message: string | null): GeoArchivesDashboard {
  return {
    databaseReady,
    schemaReady,
    message,
    sites: [],
    missions: [],
    documents: [],
    auditEntries: [],
  };
}

function formatDateRange(start: string | Date, end: string | Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function toIsoDate(value: string | Date) {
  return new Date(value).toISOString();
}

function makeCode(prefix: string, value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .toUpperCase();
  return `${prefix}-${slug || "MULCV"}`;
}

function coordinatesToMap(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return { x: 50, y: 50 };

  const minLng = -8.7;
  const maxLng = -2.4;
  const minLat = 4.2;
  const maxLat = 10.8;
  const x = Math.round(((longitude - minLng) / (maxLng - minLng)) * 74 + 13);
  const y = Math.round(((maxLat - latitude) / (maxLat - minLat)) * 78 + 8);

  return {
    x: Math.min(88, Math.max(12, x)),
    y: Math.min(90, Math.max(8, y)),
  };
}

function parseDocumentCategories(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function nullIfEmpty(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function ensureAdministrativeTerritoryChain(connection: PoolConnection, input: CaptureSiteInput) {
  const districtId = await ensureTerritory(connection, "district", input.district.trim(), null);
  const regionId = await ensureTerritory(connection, "region", input.region.trim(), districtId);
  const departmentId = await ensureTerritory(connection, "department", input.department.trim(), regionId);
  const subPrefectureId = input.subPrefecture.trim()
    ? await ensureTerritory(connection, "sub_prefecture", input.subPrefecture.trim(), departmentId)
    : null;
  const communeId = input.commune.trim()
    ? await ensureTerritory(connection, "commune", input.commune.trim(), subPrefectureId ?? departmentId)
    : null;

  return communeId ?? subPrefectureId ?? departmentId ?? regionId ?? districtId;
}

async function ensureTerritory(
  connection: PoolConnection,
  type: "district" | "region" | "department" | "sub_prefecture" | "commune",
  name: string,
  parentId: string | null,
) {
  const code = makeCode(type.toUpperCase(), `${parentId ?? "ROOT"}-${name}`);
  const [existing] = await connection.query<TerritoryRow[]>(
    "select id, name, type, parent_id from administrative_territories where code = ? limit 1",
    [code],
  );

  if (existing.length) {
    return existing[0].id;
  }

  const id = randomUUID();
  await connection.execute(
    "insert into administrative_territories (id, code, name, type, parent_id) values (?, ?, ?, ?, ?)",
    [id, code, name, type, parentId],
  );

  return id;
}
