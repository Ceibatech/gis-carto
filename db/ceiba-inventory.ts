import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { CeibaInventoryDailyProduction, CeibaInventoryDailyProductionInput, CeibaInventoryDashboard, CeibaInventoryInput, CeibaInventoryOperatorPerformance, CeibaInventoryProductionSnapshot, CeibaInventoryRecord, CeibaInventoryStatusLabel } from "../lib/ceiba-inventory-types";
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
  today_records: number;
  unique_communes: number;
};

type RecordRow = RowDataPacket & {
  id: string;
  box_label: string | null;
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
    databaseReady,
    message,
    newRecords: 0,
    processedRecords: 0,
    recentRecords: [],
    reviewedRecords: 0,
    schemaReady,
    todayRecords: 0,
    totalRecords: 0,
    uniqueCommunes: 0,
  };
}

function mapRecord(row: RecordRow): CeibaInventoryRecord {
  return {
    address: row.address ?? "",
    barcode: row.barcode ?? "",
    boxLabel: row.box_label ?? "",
    caseNature: row.case_nature,
    classificationReference: row.classification_reference ?? "",
    commune: row.commune,
    contactMobile: row.contact_mobile ?? "",
    contactPerson: row.contact_person ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    dduNumber: row.ddu_number ?? "",
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
        sum(case when date(created_at) = current_date then 1 else 0 end) as today_records,
        count(distinct nullif(trim(commune), '')) as unique_communes
      from ceiba_inventory_forms
    `);
    const [recentRows] = await pool.query<RecordRow[]>(`
      select
        id,
        box_label,
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
      databaseReady: true,
      message: null,
      newRecords: Number(summary?.new_records ?? 0),
      processedRecords: Number(summary?.processed_records ?? 0),
      recentRecords: recentRows.map(mapRecord),
      reviewedRecords: Number(summary?.reviewed_records ?? 0),
      schemaReady: true,
      todayRecords: Number(summary?.today_records ?? 0),
      totalRecords: Number(summary?.total_records ?? 0),
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
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      randomUUID(),
      cleanText(input.boxLabel) || null,
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
