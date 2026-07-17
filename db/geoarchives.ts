import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
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
  city: string;
  site_type: string;
  status: string;
  risk_score: number;
  priority_score: number;
  linear_meters: string | number;
  estimated_boxes: number;
  estimated_pages: number;
  progress_percent: number;
  confidentiality: string;
  latitude: string | number | null;
  longitude: string | number | null;
  map_x: number;
  map_y: number;
  lead: string | null;
  phone: string | null;
  next_action: string | null;
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

export async function getGeoArchivesDashboard(): Promise<GeoArchivesDashboard> {
  if (!isDatabaseConfigured()) {
    return emptyDashboard(
      false,
      false,
      "DATABASE_URL est manquant. Ajoute .env.local avec une URL MySQL, exécute sql/001_create_schema.sql une seule fois, puis lance npm run db:seed si tu veux les données initiales.",
    );
  }

  try {
    const pool = getPool();
    const [siteRows] = await pool.query<SiteRow[]>(`
      select
        s.id,
        s.code,
        s.name,
        o.name as organization,
        s.region,
        s.district,
        s.department,
        s.city,
        s.site_type,
        s.status,
        s.risk_score,
        s.priority_score,
        s.linear_meters,
        s.estimated_boxes,
        s.estimated_pages,
        s.progress_percent,
        s.confidentiality,
        s.latitude,
        s.longitude,
        s.map_x,
        s.map_y,
        c.full_name as lead,
        c.phone,
        s.next_action
      from archive_sites s
      left join organizations o on o.id = s.organization_id
      left join site_contacts c on c.site_id = s.id and c.is_primary = 1
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
        m.status
      from missions m
      left join teams t on t.id = m.lead_team_id
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
      message: siteRows.length
        ? null
        : "Base connectée et tables présentes, mais aucune fiche de site n'est encore enregistrée. Lance npm run db:seed ou crée le premier site.",
      sites: siteRows.map((site): DashboardSite => ({
        id: site.id,
        code: site.code,
        name: site.name,
        organization: site.organization ?? "Organisation non renseignée",
        region: site.region,
        district: site.district,
        department: site.department,
        city: site.city,
        type: siteTypeLabels[site.site_type] ?? site.site_type,
        status: statusLabels[site.status] ?? "Non évalué",
        risk: Number(site.risk_score),
        priority: Number(site.priority_score),
        meters: Number(site.linear_meters),
        boxes: Number(site.estimated_boxes),
        pages: Number(site.estimated_pages),
        progress: Number(site.progress_percent),
        confidentiality: confidentialityLabels[site.confidentiality] ?? "Interne",
        latitude: site.latitude === null ? null : Number(site.latitude),
        longitude: site.longitude === null ? null : Number(site.longitude),
        x: Number(site.map_x),
        y: Number(site.map_y),
        lead: site.lead ?? "Point focal à désigner",
        phone: site.phone ?? "Non renseigné",
        nextStep: site.next_action ?? "Planifier la prochaine action",
      })),
      missions: missionRows.map((mission): MissionPlanItem => ({
        id: mission.id,
        wave: mission.code,
        region: mission.region_scope,
        dates: formatDateRange(mission.start_date, mission.end_date),
        team: mission.team ?? "Équipe à affecter",
        focus: mission.objective,
        status: mission.status,
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
    const message = error instanceof Error ? error.message : "Erreur base de données inconnue";
    return emptyDashboard(
      true,
      false,
      `Base connectée mais schéma indisponible: ${message}. Exécute sql/001_create_schema.sql une seule fois dans MySQL/phpMyAdmin.`,
    );
  }
}

export async function createCapturedSite(input: CaptureSiteInput) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL est requis pour enregistrer une fiche de site.");
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

    const [existingSites] = await connection.query<IdRow[]>(
      "select id from archive_sites where code = ? limit 1",
      [siteCode],
    );
    const siteId = existingSites[0]?.id ?? randomUUID();
    const siteValues = [
      input.name.trim(),
      organizationId,
      siteTypeValues[input.type] ?? "archive_depot",
      statusValues[input.status] ?? "evaluation_scheduled",
      input.district.trim(),
      input.region.trim(),
      input.department.trim(),
      input.city.trim(),
      input.latitude ?? null,
      input.longitude ?? null,
      mapPoint.x,
      mapPoint.y,
      input.meters,
      input.boxes,
      input.pages,
      confidentialityValues[input.confidentiality] ?? "internal",
      input.risk,
      input.priority,
      input.progress,
      input.nextStep.trim(),
    ];

    if (existingSites.length) {
      await connection.execute(
        `update archive_sites set
          name = ?, organization_id = ?, site_type = ?, status = ?, district = ?, region = ?, department = ?, city = ?,
          latitude = ?, longitude = ?, map_x = ?, map_y = ?, linear_meters = ?, estimated_boxes = ?, estimated_pages = ?,
          confidentiality = ?, risk_score = ?, priority_score = ?, progress_percent = ?, next_action = ?, updated_at = current_timestamp
        where id = ?`,
        [...siteValues, siteId],
      );
    } else {
      await connection.execute(
        `insert into archive_sites (
          id, code, name, organization_id, site_type, status, district, region, department, city,
          latitude, longitude, map_x, map_y, linear_meters, estimated_boxes, estimated_pages,
          confidentiality, risk_score, priority_score, progress_percent, next_action
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [siteId, siteCode, ...siteValues],
      );
    }

    const [existingContacts] = await connection.query<IdRow[]>(
      "select id from site_contacts where site_id = ? and is_primary = 1 limit 1",
      [siteId],
    );

    if (existingContacts.length) {
      await connection.execute(
        "update site_contacts set full_name = ?, role = 'Point focal', phone = ?, can_validate = 1 where id = ?",
        [input.lead.trim(), input.phone.trim(), existingContacts[0].id],
      );
    } else {
      await connection.execute(
        "insert into site_contacts (id, site_id, full_name, role, phone, can_validate, is_primary) values (?, ?, ?, 'Point focal', ?, 1, 1)",
        [randomUUID(), siteId, input.lead.trim(), input.phone.trim()],
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
  }
}

function emptyDashboard(databaseReady: boolean, schemaReady: boolean, message: string): GeoArchivesDashboard {
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
