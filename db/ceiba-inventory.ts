import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { CeibaInventoryAgentPeriodPoint, CeibaInventoryDailyProduction, CeibaInventoryDailyProductionInput, CeibaInventoryDashboard, CeibaInventoryInput, CeibaInventoryOperatorPerformance, CeibaInventoryProductionSnapshot, CeibaInventoryRecord, CeibaInventoryReportSeries, CeibaInventoryStatusLabel } from "../lib/ceiba-inventory-types";
import { buildCeibaInventoryReportSeries, summarizeCeibaInventorySnapshot } from "../lib/ceiba-inventory-reports";
import { getPool, isDatabaseConfigured } from "./index";

const statusValues: Record<CeibaInventoryStatusLabel, string> = {
  Nouveau: "new",
  "En revue": "review",
  "Traité": "processed",
  Bloqué: "blocked",
};

const statusLabels: Record<string, CeibaInventoryStatusLabel> = {
  new: "Nouveau",
  review: "En revue",
  processed: "Traité",
  blocked: "Bloqué",
};

type SummaryRow = RowDataPacket & {
  total_records: number;
  new_records: number;
  reviewed_records: number;
  processed_records: number;
  blocked_records: number;
  damaged_cartons: number;
  damaged_dossiers: number;
  today_records: number;
  unique_communes: number;
  unique_cartons: number;
};

type RecordRow = RowDataPacket & {
  id: string;
  box_label: string | null;
  carton_id: string | null;
  barcode: string | null;
  guichet_number: string | null;
  ddu_number: string | null;
  classification_reference: string | null;
  ilot_number: string | null;
  lot_number: string | null;
  surface_area: string | null;
  land_title_number: string | null;
  housing_estate: string | null;
  commune: string;
  case_nature: string;
  carton_state: string | null;
  carton_damaged: number | null;
  carton_damage_type: string | null;
  dossier_state: string | null;
  dossier_damaged: number | null;
  dossier_damage_type: string | null;
  last_name: string;
  first_names: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  contact_mobile: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type CommuneRow = RowDataPacket & {
  commune: string;
  count: number;
};

type OperatorPerformanceRow = RowDataPacket & {
  login: string;
  name: string;
  employee_id: string | null;
  assigned_room: string | null;
  total_records: number;
  new_records: number;
  reviewed_records: number;
  processed_records: number;
  blocked_records: number;
};

function emptyCeibaInventoryDashboard(databaseReady: boolean, schemaReady: boolean, message: string | null): CeibaInventoryDashboard {
  return {
    activityByCommune: [],
    blockedRecords: 0,
    damagedCartons: 0,
    damagedDossiers: 0,
    databaseReady,
    message,
    newRecords: 0,
    processedRecords: 0,
    recentRecords: [],
    reviewedRecords: 0,
    schemaReady,
    todayRecords: 0,
    totalRecords: 0,
    uniqueCartons: 0,
    uniqueCommunes: 0,
  };
}

function mapRecord(row: RecordRow): CeibaInventoryRecord {
  return {
    address: row.address ?? "",
    barcode: row.barcode ?? "",
    boxLabel: row.box_label ?? "",
    cartonDamaged: Boolean(row.carton_damaged),
    cartonDamageType: row.carton_damage_type ?? "",
    cartonId: row.carton_id ?? "",
    cartonState: (row.carton_state as CeibaInventoryInput["cartonState"]) ?? "Bon",
    caseNature: row.case_nature,
    classificationReference: row.classification_reference ?? "",
    commune: row.commune,
    contactMobile: row.contact_mobile ?? "",
    contactPerson: row.contact_person ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    dduNumber: row.ddu_number ?? "",
    dossierDamaged: Boolean(row.dossier_damaged),
    dossierDamageType: row.dossier_damage_type ?? "",
    dossierState: (row.dossier_state as CeibaInventoryInput["dossierState"]) ?? "Bon",
    email: row.email ?? "",
    firstNames: row.first_names,
    guichetNumber: row.guichet_number ?? "",
    housingEstate: row.housing_estate ?? "",
    id: row.id,
    ilotNumber: row.ilot_number ?? "",
    landTitleNumber: row.land_title_number ?? "",
    lastName: row.last_name,
    lotNumber: row.lot_number ?? "",
    notes: row.notes ?? "",
    phone: row.phone ?? "",
    status: statusLabels[row.status] ?? "Nouveau",
    surfaceArea: row.surface_area ?? "",
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getCeibaInventoryDashboard(): Promise<CeibaInventoryDashboard> {
  if (!isDatabaseConfigured()) {
    return emptyCeibaInventoryDashboard(false, false, "DATABASE_URL n'est pas configuré pour l'inventaire CEIBA.");
  }

  try {
    const pool = getPool();
    const [summaryRows] = await pool.query<SummaryRow[]>(`
      select
        count(*) as total_records,
        sum(case when status = 'new' then 1 else 0 end) as new_records,
        sum(case when status = 'review' then 1 else 0 end) as reviewed_records,
        sum(case when status = 'processed' then 1 else 0 end) as processed_records,
        sum(case when status = 'blocked' then 1 else 0 end) as blocked_records,
        count(distinct case when carton_damaged = 1 and nullif(trim(carton_id), '') is not null then carton_id end) as damaged_cartons,
        sum(case when dossier_damaged = 1 then 1 else 0 end) as damaged_dossiers,
        sum(case when date(created_at) = current_date then 1 else 0 end) as today_records,
        count(distinct nullif(trim(commune), '')) as unique_communes,
        count(distinct nullif(trim(carton_id), '')) as unique_cartons
      from ceiba_inventory_forms
    `);
    const [recentRows] = await pool.query<RecordRow[]>(`
      select
        id,
        box_label,
        carton_id,
        barcode,
        guichet_number,
        ddu_number,
        classification_reference,
        ilot_number,
        lot_number,
        surface_area,
        land_title_number,
        housing_estate,
        commune,
        case_nature,
        carton_state,
        carton_damaged,
        carton_damage_type,
        dossier_state,
        dossier_damaged,
        dossier_damage_type,
        last_name,
        first_names,
        address,
        phone,
        email,
        contact_person,
        contact_mobile,
        status,
        notes,
        created_by,
        created_at,
        updated_at
      from ceiba_inventory_forms
      order by created_at desc
      limit 40
    `);
    const [communeRows] = await pool.query<CommuneRow[]>(`
      select commune, count(*) as count
      from ceiba_inventory_forms
      group by commune
      order by count desc, commune asc
      limit 10
    `);

    const summary = summaryRows[0];
    return {
      activityByCommune: communeRows.map((row) => ({ commune: row.commune, count: Number(row.count ?? 0) })),
      blockedRecords: Number(summary?.blocked_records ?? 0),
      damagedCartons: Number(summary?.damaged_cartons ?? 0),
      damagedDossiers: Number(summary?.damaged_dossiers ?? 0),
      databaseReady: true,
      message: null,
      newRecords: Number(summary?.new_records ?? 0),
      processedRecords: Number(summary?.processed_records ?? 0),
      recentRecords: recentRows.map(mapRecord),
      reviewedRecords: Number(summary?.reviewed_records ?? 0),
      schemaReady: true,
      todayRecords: Number(summary?.today_records ?? 0),
      totalRecords: Number(summary?.total_records ?? 0),
      uniqueCartons: Number(summary?.unique_cartons ?? 0),
      uniqueCommunes: Number(summary?.unique_communes ?? 0),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Table ceiba_inventory_forms indisponible.";
    return emptyCeibaInventoryDashboard(true, false, message.includes("ceiba_inventory_forms") ? "Exécutez sql/005_create_ceiba_inventory.sql dans MySQL pour activer l'inventaire CEIBA." : message);
  }
}

export async function getCeibaInventoryOperatorPerformance(): Promise<CeibaInventoryOperatorPerformance[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const pool = getPool();
    const [rows] = await pool.query<OperatorPerformanceRow[]>(`
      select
        coalesce(users.login, forms.created_by) as login,
        coalesce(users.full_name, forms.created_by) as name,
        users.employee_id,
        users.assigned_room,
        count(forms.id) as total_records,
        sum(case when forms.status = 'new' then 1 else 0 end) as new_records,
        sum(case when forms.status = 'review' then 1 else 0 end) as reviewed_records,
        sum(case when forms.status = 'processed' then 1 else 0 end) as processed_records,
        sum(case when forms.status = 'blocked' then 1 else 0 end) as blocked_records
      from ceiba_inventory_forms forms
      left join ceiba_inventory_users users on lower(users.login) = lower(forms.created_by)
      group by users.id, users.login, users.full_name, users.employee_id, users.assigned_room, forms.created_by
      order by total_records desc, processed_records desc, name asc
    `);

    return rows.map((row) => ({
      blockedRecords: Number(row.blocked_records ?? 0),
      assignedRoom: row.assigned_room,
      employeeId: row.employee_id,
      login: row.login,
      name: row.name,
      newRecords: Number(row.new_records ?? 0),
      processedRecords: Number(row.processed_records ?? 0),
      reviewedRecords: Number(row.reviewed_records ?? 0),
      totalRecords: Number(row.total_records ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getCeibaInventoryProductionSnapshot(): Promise<CeibaInventoryProductionSnapshot> {
  const [dashboard, operatorPerformance, dailyProduction] = await Promise.all([
    getCeibaInventoryDashboard(),
    getCeibaInventoryOperatorPerformance(),
    getCeibaInventoryDailyProduction(),
  ]);

  return { dashboard, operatorPerformance, dailyProduction };
}

export async function getCeibaInventoryReportSeries(period: "day" | "week" | "month" = "day"): Promise<CeibaInventoryAgentPeriodPoint[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const pool = getPool();
    const [rows] = await pool.query<Array<RowDataPacket & { created_at: string; created_by: string | null; carton_id: string | null; carton_damaged: number | null; dossier_damaged: number | null }>>(`
      select created_at, created_by, carton_id, carton_damaged, dossier_damaged
      from ceiba_inventory_forms
      where created_at is not null
      order by created_at asc
    `);

    const normalized = rows.map((row) => ({
      agentLogin: String(row.created_by ?? "inconnu").trim() || "inconnu",
      agentName: String(row.created_by ?? "Inconnu").trim() || "Inconnu",
      created_at: String(row.created_at),
      carton_id: row.carton_id ?? null,
      carton_damaged: row.carton_damaged ?? 0,
      dossier_damaged: row.dossier_damaged ?? 0,
      status: "processed",
      commune: "",
    }));

    return buildCeibaInventoryReportSeries(normalized, period);
  } catch {
    return [];
  }
}

export async function dispatchCeibaInventoryExecutiveReports(period: "day" | "week" | "month" = "day") {
  if (!isDatabaseConfigured()) {
    return { ok: false, sent: 0, recipients: [], reason: "DATABASE_URL n'est pas configuré." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "support@ceiba-analytics.com";
  if (!apiKey) {
    return { ok: false, sent: 0, recipients: [], reason: "RESEND_API_KEY n'est pas configuré." };
  }

  const pool = getPool();
  const [recipientRows] = await pool.query<Array<RowDataPacket & { email: string }>>(`
    select distinct email
    from ceiba_inventory_users
    where status = 'active'
      and email is not null
      and trim(email) <> ''
      and role in ('admin', 'supervisor')
  `);

  const recipients = recipientRows.map((row) => row.email).filter(Boolean);
  if (!recipients.length) {
    return { ok: false, sent: 0, recipients: [], reason: "Aucun destinataire exécutif n'a été trouvé." };
  }

  const series = await getCeibaInventoryReportSeries(period);
  const summary = summarizeCeibaInventorySnapshot((await pool.query<Array<RowDataPacket & { created_at: string; created_by: string | null; carton_id: string | null; carton_damaged: number | null; dossier_damaged: number | null; status: string; commune: string }>>(`
    select created_at, created_by, carton_id, carton_damaged, dossier_damaged, status, commune
    from ceiba_inventory_forms
    order by created_at asc
  `))[0] ?? []);

  const title = period === "day" ? "Rapport journalier CEIBA" : period === "week" ? "Rapport hebdomadaire CEIBA" : "Rapport mensuel CEIBA";
  const rowsHtml = series.slice(0, 12).map((point) => `
    <tr>
      <td>${escapeHtml(point.agentName)}</td>
      <td>${escapeHtml(point.label)}</td>
      <td>${point.records}</td>
      <td>${point.uniqueCartons}</td>
      <td>${point.degradedCartons}</td>
      <td>${point.dossiers}</td>
    </tr>
  `).join("");

  const reportDate = new Date().toISOString().slice(0, 10);
  const result = { ok: false as boolean, sent: 0, recipients, reason: "Email non envoyé" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: `${title} — CEIBA analytics`,
        html: `<h2>${title}</h2><p>Nombre de fiches: ${summary.totalRecords}</p><p>Cartons uniques: ${summary.uniqueCartons}</p><p>Cartons dégradés: ${summary.degradedCartons}</p><table><thead><tr><th>Agent</th><th>Période</th><th>Fiches</th><th>Cartons</th><th>Cartons dégradés</th><th>Dossiers</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
        text: `${title}\n\nFiches: ${summary.totalRecords}\nCartons uniques: ${summary.uniqueCartons}\nCartons dégradés: ${summary.degradedCartons}\n\nDétail par agent:\n${series.map((point) => `${point.agentName} (${point.label}): ${point.records} fiches, ${point.uniqueCartons} cartons, ${point.degradedCartons} dégradés`).join("\n")}`,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      result.ok = false;
      result.sent = 0;
      result.reason = `Resend error: ${response.status} - ${payload}`;
    } else {
      result.ok = true;
      result.sent = recipients.length;
      result.reason = "Email envoyé";
    }
  } catch (error) {
    result.ok = false;
    result.sent = 0;
    result.reason = error instanceof Error ? error.message : "Erreur inconnue lors de l'envoi";
  }

  await saveCeibaInventoryReportDispatch({
    reportDate,
    period,
    status: result.ok ? "sent" : "failed",
    recipientsCount: recipients.length,
    errorMessage: result.ok ? null : result.reason,
    sentAt: result.ok ? new Date().toISOString() : null,
  });

  return result;
}

export async function getCeibaInventoryReportDispatches(): Promise<CeibaInventoryReportDispatch[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const pool = getPool();
    await ensureCeibaInventoryReportDispatchTable(pool);
    const [rows] = await pool.query<Array<RowDataPacket & {
      id: string;
      report_date: string;
      period: "day" | "week" | "month";
      status: "queued" | "sent" | "failed";
      recipients_count: number;
      error_message: string | null;
      generated_at: string;
      sent_at: string | null;
    }>>(`
      select id, report_date, period, status, recipients_count, error_message, generated_at, sent_at
      from ceiba_inventory_report_dispatches
      order by report_date desc, field(period, 'day', 'week', 'month') desc
      limit 30
    `);

    return rows.map((row) => ({
      id: row.id,
      reportDate: row.report_date,
      period: row.period,
      status: row.status,
      recipientsCount: Number(row.recipients_count ?? 0),
      errorMessage: row.error_message ?? null,
      generatedAt: row.generated_at,
      sentAt: row.sent_at ?? null,
    }));
  } catch {
    return [];
  }
}

export async function saveCeibaInventoryReportDispatch(input: {
  reportDate: string;
  period: "day" | "week" | "month";
  status: "queued" | "sent" | "failed";
  recipientsCount: number;
  errorMessage: string | null;
  sentAt: string | null;
}) {
  const pool = getPool();
  await ensureCeibaInventoryReportDispatchTable(pool);
  await pool.execute(`
    insert into ceiba_inventory_report_dispatches (
      id, report_date, period, status, recipients_count, error_message, generated_at, sent_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update
      status = values(status),
      recipients_count = values(recipients_count),
      error_message = values(error_message),
      sent_at = values(sent_at),
      generated_at = values(generated_at)
  `, [
    randomUUID(),
    input.reportDate,
    input.period,
    input.status,
    Number(input.recipientsCount ?? 0),
    input.errorMessage?.slice(0, 1000) ?? null,
    new Date().toISOString(),
    input.sentAt,
  ]);
}

async function ensureCeibaInventoryReportDispatchTable(pool: ReturnType<typeof getPool>) {
  await pool.execute(`
    create table if not exists ceiba_inventory_report_dispatches (
      id char(36) primary key,
      report_date date not null,
      period enum('day', 'week', 'month') not null,
      status enum('queued', 'sent', 'failed') not null default 'queued',
      recipients_count int unsigned not null default 0,
      error_message text null,
      generated_at datetime not null default current_timestamp,
      sent_at datetime null,
      unique key ceiba_report_dispatch_date_period_unique (report_date, period)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
  `);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

export async function getCeibaInventoryDailyProduction(): Promise<CeibaInventoryDailyProduction[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const pool = getPool();
    const [rows] = await pool.query<Array<RowDataPacket & { operator_login: string; operator_name: string; assigned_room: string | null; cartons_count: number; dossiers_count: number; damaged_cartons_count: number | null; damaged_dossiers_count: number | null; source: "daily" | "historical" }>>(`
      select operator_login, operator_name, assigned_room, cartons_count, dossiers_count,
        damaged_cartons_count, damaged_dossiers_count, source
      from (
        select operator_login, operator_name, assigned_room,
          sum(cartons_count) as cartons_count, sum(dossiers_count) as dossiers_count,
          sum(damaged_cartons_count) as damaged_cartons_count, sum(damaged_dossiers_count) as damaged_dossiers_count,
          'daily' as source
        from ceiba_inventory_daily_production
        group by operator_login, operator_name, assigned_room
        union all
        select forms.created_by as operator_login, forms.created_by as operator_name, null as assigned_room,
          count(forms.id) as cartons_count, count(forms.id) as dossiers_count,
          null as damaged_cartons_count, null as damaged_dossiers_count, 'historical' as source
        from ceiba_inventory_forms forms
        where forms.created_by is not null
          and not exists (select 1 from ceiba_inventory_daily_production daily where lower(daily.operator_login) = lower(forms.created_by))
        group by forms.created_by
      ) production
      order by dossiers_count desc, operator_name asc
    `);
    return rows.map((row) => ({ operatorLogin: row.operator_login, operatorName: row.operator_name, assignedRoom: row.assigned_room, cartonsCount: Number(row.cartons_count), dossiersCount: Number(row.dossiers_count), damagedCartonsCount: row.damaged_cartons_count === null ? null : Number(row.damaged_cartons_count), damagedDossiersCount: row.damaged_dossiers_count === null ? null : Number(row.damaged_dossiers_count), source: row.source }));
  } catch {
    return [];
  }
}

export async function saveCeibaInventoryDailyProduction(input: CeibaInventoryDailyProductionInput, operator: { login: string; name: string }) {
  const pool = getPool();
  await pool.execute(`
    insert into ceiba_inventory_daily_production (
      id, production_date, operator_login, operator_name, cartons_count, dossiers_count,
      damaged_cartons_count, damaged_dossiers_count, difficulties
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update operator_name = values(operator_name), cartons_count = values(cartons_count),
      dossiers_count = values(dossiers_count), damaged_cartons_count = values(damaged_cartons_count),
      damaged_dossiers_count = values(damaged_dossiers_count), difficulties = values(difficulties)
  `, [randomUUID(), input.productionDate, operator.login, operator.name, input.cartonsCount, input.dossiersCount, input.damagedCartonsCount, input.damagedDossiersCount, cleanText(input.difficulties) || null]);
}

export async function createCeibaInventoryRecord(input: CeibaInventoryInput, createdBy: string | null) {
  const pool = getPool();

  await pool.execute(
    `insert into ceiba_inventory_forms (
    id,
    box_label,
    carton_id,
    barcode,
    guichet_number,
    ddu_number,
    classification_reference,
    ilot_number,
    lot_number,
    surface_area,
    land_title_number,
    housing_estate,
    commune,
    case_nature,
    carton_state,
    carton_damaged,
    carton_damage_type,
    dossier_state,
    dossier_damaged,
    dossier_damage_type,
    last_name,
    first_names,
    address,
    phone,
    email,
    contact_person,
    contact_mobile,
    status,
    notes,
    created_by
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      randomUUID(),
      cleanText(input.boxLabel) || null,
      cleanText(input.cartonId) || null,
      cleanText(input.barcode) || null,
      cleanText(input.guichetNumber) || null,
      cleanText(input.dduNumber) || null,
      cleanText(input.classificationReference) || null,
      cleanText(input.ilotNumber) || null,
      cleanText(input.lotNumber) || null,
      cleanText(input.surfaceArea) || null,
      cleanText(input.landTitleNumber) || null,
      cleanText(input.housingEstate) || null,
      cleanText(input.commune),
      cleanText(input.caseNature),
      cleanText(input.cartonState) || "Bon",
      input.cartonDamaged ? 1 : 0,
      cleanText(input.cartonDamageType) || null,
      cleanText(input.dossierState) || "Bon",
      input.dossierDamaged ? 1 : 0,
      cleanText(input.dossierDamageType) || null,
      cleanText(input.lastName),
      cleanText(input.firstNames),
      cleanText(input.address) || null,
      cleanText(input.phone) || null,
      cleanText(input.email) || null,
      cleanText(input.contactPerson) || null,
      cleanText(input.contactMobile) || null,
      statusValues[input.status],
      cleanText(input.notes) || null,
      createdBy,
    ],
  );
}

function cleanText(value: string) {
  return value.trim();
}
