import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type {
  CaptureSiteInput,
  DashboardSite,
  DocumentStat,
  GeoArchivesDashboard,
  MissionPlanItem,
  SiteStatusLabel,
} from "../lib/geoarchives-types";
import { getDb, isDatabaseConfigured } from "./index";
import {
  archiveSites,
  auditLogs,
  evidenceDocuments,
  missions,
  organizations,
  siteContacts,
  teams,
} from "./schema";

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

export async function getGeoArchivesDashboard(): Promise<GeoArchivesDashboard> {
  if (!isDatabaseConfigured()) {
    return emptyDashboard(
      false,
      false,
      "DATABASE_URL est manquant. Ajoute .env.local puis lance npm run db:generate, npm run db:migrate et npm run db:seed.",
    );
  }

  try {
    const db = getDb();
    const [siteRows, missionRows, documentRows, auditRows] = await Promise.all([
      db
        .select({
          id: archiveSites.id,
          code: archiveSites.code,
          name: archiveSites.name,
          organization: organizations.name,
          region: archiveSites.region,
          district: archiveSites.district,
          department: archiveSites.department,
          city: archiveSites.city,
          siteType: archiveSites.siteType,
          status: archiveSites.status,
          risk: archiveSites.riskScore,
          priority: archiveSites.priorityScore,
          meters: archiveSites.linearMeters,
          boxes: archiveSites.estimatedBoxes,
          pages: archiveSites.estimatedPages,
          progress: archiveSites.progressPercent,
          confidentiality: archiveSites.confidentiality,
          latitude: archiveSites.latitude,
          longitude: archiveSites.longitude,
          mapX: archiveSites.mapX,
          mapY: archiveSites.mapY,
          lead: siteContacts.fullName,
          phone: siteContacts.phone,
          nextAction: archiveSites.nextAction,
        })
        .from(archiveSites)
        .leftJoin(organizations, eq(archiveSites.organizationId, organizations.id))
        .leftJoin(
          siteContacts,
          and(eq(siteContacts.siteId, archiveSites.id), eq(siteContacts.isPrimary, true)),
        )
        .orderBy(desc(archiveSites.priorityScore), desc(archiveSites.riskScore)),
      db
        .select({
          id: missions.id,
          wave: missions.code,
          title: missions.title,
          region: missions.regionScope,
          startDate: missions.startDate,
          endDate: missions.endDate,
          team: teams.name,
          focus: missions.objective,
          status: missions.status,
        })
        .from(missions)
        .leftJoin(teams, eq(missions.leadTeamId, teams.id))
        .orderBy(missions.startDate),
      db
        .select({
          type: evidenceDocuments.type,
          count: sql<number>`count(*)::int`,
          latest: sql<string | null>`max(${evidenceDocuments.uploadedAt})::text`,
        })
        .from(evidenceDocuments)
        .groupBy(evidenceDocuments.type),
      db
        .select({
          id: auditLogs.id,
          actorName: auditLogs.actorName,
          description: auditLogs.description,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(6),
    ]);

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
        type: siteTypeLabels[site.siteType] ?? site.siteType,
        status: statusLabels[site.status] ?? "Non évalué",
        risk: site.risk,
        priority: site.priority,
        meters: Number(site.meters),
        boxes: site.boxes,
        pages: site.pages,
        progress: site.progress,
        confidentiality: confidentialityLabels[site.confidentiality] ?? "Interne",
        latitude: site.latitude === null ? null : Number(site.latitude),
        longitude: site.longitude === null ? null : Number(site.longitude),
        x: site.mapX,
        y: site.mapY,
        lead: site.lead ?? "Point focal à désigner",
        phone: site.phone ?? "Non renseigné",
        nextStep: site.nextAction ?? "Planifier la prochaine action",
      })),
      missions: missionRows.map((mission): MissionPlanItem => ({
        id: mission.id,
        wave: mission.wave,
        region: mission.region,
        dates: formatDateRange(mission.startDate, mission.endDate),
        team: mission.team ?? "Équipe à affecter",
        focus: mission.focus,
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
        actor: entry.actorName,
        createdAt: new Date(entry.createdAt).toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur base de données inconnue";
    return emptyDashboard(
      true,
      false,
      `Base connectée mais schéma indisponible: ${message}. Lance npm run db:generate puis npm run db:migrate.`,
    );
  }
}

export async function createCapturedSite(input: CaptureSiteInput) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL est requis pour enregistrer une fiche de site.");
  }

  const db = getDb();
  const organizationCode = makeCode("ORG", input.organization);
  const [organization] = await db
    .insert(organizations)
    .values({
      id: randomUUID(),
      code: organizationCode,
      name: input.organization.trim(),
      ministry: "MULCV",
      organizationType: "structure",
    })
    .onConflictDoUpdate({
      target: organizations.code,
      set: { name: input.organization.trim(), updatedAt: new Date() },
    })
    .returning({ id: organizations.id });

  const mapPoint = coordinatesToMap(input.latitude ?? null, input.longitude ?? null);
  const [site] = await db
    .insert(archiveSites)
    .values({
      id: randomUUID(),
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      organizationId: organization.id,
      siteType: (siteTypeValues[input.type] ?? "archive_depot") as never,
      status: (statusValues[input.status] ?? "evaluation_scheduled") as never,
      district: input.district.trim(),
      region: input.region.trim(),
      department: input.department.trim(),
      city: input.city.trim(),
      latitude: input.latitude === undefined || input.latitude === null ? null : String(input.latitude),
      longitude: input.longitude === undefined || input.longitude === null ? null : String(input.longitude),
      mapX: mapPoint.x,
      mapY: mapPoint.y,
      linearMeters: String(input.meters),
      estimatedBoxes: input.boxes,
      estimatedPages: input.pages,
      confidentiality: confidentialityValues[input.confidentiality] as never,
      riskScore: input.risk,
      priorityScore: input.priority,
      progressPercent: input.progress,
      nextAction: input.nextStep.trim(),
    })
    .onConflictDoUpdate({
      target: archiveSites.code,
      set: {
        name: input.name.trim(),
        organizationId: organization.id,
        siteType: (siteTypeValues[input.type] ?? "archive_depot") as never,
        status: (statusValues[input.status] ?? "evaluation_scheduled") as never,
        district: input.district.trim(),
        region: input.region.trim(),
        department: input.department.trim(),
        city: input.city.trim(),
        latitude: input.latitude === undefined || input.latitude === null ? null : String(input.latitude),
        longitude: input.longitude === undefined || input.longitude === null ? null : String(input.longitude),
        mapX: mapPoint.x,
        mapY: mapPoint.y,
        linearMeters: String(input.meters),
        estimatedBoxes: input.boxes,
        estimatedPages: input.pages,
        confidentiality: confidentialityValues[input.confidentiality] as never,
        riskScore: input.risk,
        priorityScore: input.priority,
        progressPercent: input.progress,
        nextAction: input.nextStep.trim(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: archiveSites.id, code: archiveSites.code });

  const [primaryContact] = await db
    .select({ id: siteContacts.id })
    .from(siteContacts)
    .where(and(eq(siteContacts.siteId, site.id), eq(siteContacts.isPrimary, true)))
    .limit(1);

  if (primaryContact) {
    await db
      .update(siteContacts)
      .set({ fullName: input.lead.trim(), phone: input.phone.trim(), role: "Point focal" })
      .where(eq(siteContacts.id, primaryContact.id));
  } else {
    await db.insert(siteContacts).values({
      id: randomUUID(),
      siteId: site.id,
      fullName: input.lead.trim(),
      role: "Point focal",
      phone: input.phone.trim(),
      canValidate: true,
      isPrimary: true,
    });
  }

  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorName: "PMO MULCV",
    actorRole: "Administrateur",
    action: "site_capture_saved",
    entityType: "archive_site",
    entityId: site.id,
    description: `Fiche ${site.code} enregistrée depuis l'interface de capture`,
    metadata: { source: "web_capture" },
  });

  return site;
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
