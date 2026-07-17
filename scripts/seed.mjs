import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL est manquant. Crée .env.local ou exporte DATABASE_URL avant npm run db:seed.");
  process.exit(1);
}

const sql = neon(databaseUrl);

const organizations = [
  ["11111111-1111-4111-8111-111111111111", "ORG-SDA", "Direction des archives et de la documentation", "MULCV", "direction_centrale"],
  ["22222222-2222-4222-8222-222222222222", "ORG-CEIBA", "Antenne de traitement CEIBA", "MULCV", "partenaire_technique"],
  ["33333333-3333-4333-8333-333333333333", "ORG-DR-CENTRE", "Direction régionale du Centre", "MULCV", "direction_regionale"],
  ["44444444-4444-4444-8444-444444444444", "ORG-DR-NORD", "Direction régionale Nord", "MULCV", "direction_regionale"],
  ["55555555-5555-4555-8555-555555555555", "ORG-DD-OUEST", "Service départemental Ouest", "MULCV", "direction_departementale"],
  ["66666666-6666-4666-8666-666666666666", "ORG-DD-SUD-COMOE", "Direction départementale du Sud-Comoé", "MULCV", "direction_departementale"],
];

const territories = [
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "REG-ABJ", "Abidjan", "region"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "REG-GBK", "Gbêkê", "region"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "REG-SAN", "San-Pédro", "region"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "REG-POR", "Poro", "region"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", "REG-TON", "Tonkpi", "region"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6", "REG-COM", "Sud-Comoé", "region"],
];

const sites = [
  {
    id: "77777777-7777-4777-8777-777777777701",
    code: "MULCV-ABJ-001",
    name: "Archives Direction centrale",
    organizationId: organizations[0][0],
    territoryId: territories[0][0],
    siteType: "central_direction",
    status: "digitization_in_progress",
    district: "District autonome d'Abidjan",
    region: "Abidjan",
    department: "Abidjan",
    city: "Plateau",
    latitude: 5.3236,
    longitude: -4.0267,
    mapX: 42,
    mapY: 82,
    meters: 420,
    boxes: 1840,
    pages: 1240000,
    categories: ["Dossiers fonciers", "Courriers ministériels", "Registres administratifs"],
    start: 1978,
    end: 2025,
    confidentiality: "critical",
    inventory: true,
    electricity: true,
    internet: true,
    accessControl: true,
    fireDetection: false,
    risk: 72,
    priority: 88,
    progress: 54,
    nextAction: "Contrôle qualité sur les lots fonciers prioritaires",
  },
  {
    id: "77777777-7777-4777-8777-777777777702",
    code: "MULCV-GBK-014",
    name: "Dépôt régional de Gbêkê",
    organizationId: organizations[2][0],
    territoryId: territories[1][0],
    siteType: "archive_depot",
    status: "high_risk",
    district: "Vallée du Bandama",
    region: "Gbêkê",
    department: "Bouaké",
    city: "Bouaké",
    latitude: 7.6906,
    longitude: -5.0300,
    mapX: 50,
    mapY: 44,
    meters: 680,
    boxes: 2620,
    pages: 1820000,
    categories: ["Permis de construire", "Contentieux", "Plans papier"],
    start: 1965,
    end: 2024,
    confidentiality: "confidential",
    inventory: false,
    electricity: true,
    internet: false,
    accessControl: false,
    fireDetection: false,
    risk: 91,
    priority: 93,
    progress: 18,
    nextAction: "Sauvegarde urgente et reconditionnement avant transfert",
  },
  {
    id: "77777777-7777-4777-8777-777777777703",
    code: "MULCV-SAS-022",
    name: "Centre temporaire de San-Pédro",
    organizationId: organizations[1][0],
    territoryId: territories[2][0],
    siteType: "temporary_processing_center",
    status: "mobilization_in_progress",
    district: "Bas-Sassandra",
    region: "San-Pédro",
    department: "San-Pédro",
    city: "San-Pédro",
    latitude: 4.7485,
    longitude: -6.6363,
    mapX: 25,
    mapY: 76,
    meters: 310,
    boxes: 1170,
    pages: 810000,
    categories: ["Dossiers techniques", "Archives de projet"],
    start: 1988,
    end: 2025,
    confidentiality: "internal",
    inventory: true,
    electricity: true,
    internet: true,
    accessControl: true,
    fireDetection: true,
    risk: 58,
    priority: 71,
    progress: 33,
    nextAction: "Installer deux scanners et valider la zone de préparation",
  },
  {
    id: "77777777-7777-4777-8777-777777777704",
    code: "MULCV-POR-006",
    name: "Direction régionale du Poro",
    organizationId: organizations[3][0],
    territoryId: territories[3][0],
    siteType: "regional_direction",
    status: "evaluation_done",
    district: "Savanes",
    region: "Poro",
    department: "Korhogo",
    city: "Korhogo",
    latitude: 9.4580,
    longitude: -5.6296,
    mapX: 47,
    mapY: 17,
    meters: 180,
    boxes: 690,
    pages: 412000,
    categories: ["Registres", "Dossiers administratifs"],
    start: 1991,
    end: 2023,
    confidentiality: "internal",
    inventory: true,
    electricity: true,
    internet: true,
    accessControl: true,
    fireDetection: false,
    risk: 44,
    priority: 62,
    progress: 22,
    nextAction: "Planifier la mission de numérisation sur site",
  },
  {
    id: "77777777-7777-4777-8777-777777777705",
    code: "MULCV-TON-031",
    name: "Agence départementale de Tonkpi",
    organizationId: organizations[4][0],
    territoryId: territories[4][0],
    siteType: "agency",
    status: "evaluation_scheduled",
    district: "Montagnes",
    region: "Tonkpi",
    department: "Man",
    city: "Man",
    latitude: 7.4125,
    longitude: -7.5538,
    mapX: 19,
    mapY: 47,
    meters: 260,
    boxes: 940,
    pages: 590000,
    categories: ["Dossiers cadastraux", "Dossiers RH"],
    start: 1982,
    end: 2024,
    confidentiality: "confidential",
    inventory: false,
    electricity: true,
    internet: false,
    accessControl: false,
    fireDetection: false,
    risk: 63,
    priority: 67,
    progress: 8,
    nextAction: "Visite terrain et capture GPS confirmée",
  },
  {
    id: "77777777-7777-4777-8777-777777777706",
    code: "MULCV-COM-019",
    name: "Local d'archives communal",
    organizationId: organizations[5][0],
    territoryId: territories[5][0],
    siteType: "archive_room",
    status: "quality_control",
    district: "Comoé",
    region: "Sud-Comoé",
    department: "Aboisso",
    city: "Aboisso",
    latitude: 5.4678,
    longitude: -3.2071,
    mapX: 62,
    mapY: 83,
    meters: 145,
    boxes: 510,
    pages: 260000,
    categories: ["Permis", "Correspondances"],
    start: 1996,
    end: 2022,
    confidentiality: "low",
    inventory: true,
    electricity: true,
    internet: true,
    accessControl: true,
    fireDetection: true,
    risk: 35,
    priority: 58,
    progress: 77,
    nextAction: "Clôturer les reprises de lots rejetés",
  },
];

const contacts = [
  ["88888888-8888-4888-8888-888888888801", sites[0].id, "Koffi Yao", "Responsable du site", "+225 07 00 00 11 24", "koffi.yao@mulcv.ci", true],
  ["88888888-8888-4888-8888-888888888802", sites[1].id, "Aminata Coulibaly", "Point focal", "+225 05 00 00 48 16", "aminata.coulibaly@mulcv.ci", true],
  ["88888888-8888-4888-8888-888888888803", sites[2].id, "Serge Dago", "Chef de centre", "+225 01 00 00 39 92", "serge.dago@ceiba.ci", true],
  ["88888888-8888-4888-8888-888888888804", sites[3].id, "Mamadou Soro", "Responsable régional", "+225 07 00 00 27 43", "mamadou.soro@mulcv.ci", true],
  ["88888888-8888-4888-8888-888888888805", sites[4].id, "Nadine Guei", "Point focal", "+225 05 00 00 15 68", "nadine.guei@mulcv.ci", true],
  ["88888888-8888-4888-8888-888888888806", sites[5].id, "Jean Kouadio", "Responsable local", "+225 01 00 00 22 08", "jean.kouadio@mulcv.ci", true],
];

const teams = [
  ["99999999-9999-4999-8999-999999999901", "TEAM-SDA-01", "Équipe SDA priorisation", "évaluation", "Abidjan"],
  ["99999999-9999-4999-8999-999999999902", "TEAM-CEIBA-01", "Équipe CEIBA numérisation", "numérisation", "Abidjan"],
  ["99999999-9999-4999-8999-999999999903", "TEAM-LOG-01", "Équipe logistique nationale", "logistique", "Yamoussoukro"],
];

const missions = [
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "Vague 1", "Mobilisation critique Gbêkê - Abidjan", "in_progress", "Gbêkê, Abidjan", "2026-07-22", "2026-08-02", teams[0][0], "Sites critiques, volumes supérieurs à 400 ml", 3, 4],
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", "Vague 2", "Préparation Gôh - San-Pédro", "planned", "Gôh, San-Pédro", "2026-08-05", "2026-08-16", teams[1][0], "Préparation et transfert vers centre temporaire", 2, 3],
  ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3", "Vague 3", "Numérisation Nord et Est", "planned", "Poro, Zanzan", "2026-08-19", "2026-08-30", teams[2][0], "Numérisation sur site et validation documentaire", 2, 2],
];

const documents = [
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc1", sites[0].id, missions[0][0], "visit_report", "Rapport de visite Abidjan", "rapport-visite-abj-001.pdf", "s3://mulcv/abj/rapport-visite.pdf", "application/pdf", 482000, "PMO MULCV", "2026-07-12T09:10:00Z"],
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc2", sites[1].id, missions[0][0], "risk_report", "Rapport de risque Gbêkê", "rapport-risque-gbeke.pdf", "s3://mulcv/gbk/rapport-risque.pdf", "application/pdf", 618000, "SDA", "2026-07-13T11:35:00Z"],
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc3", sites[1].id, missions[0][0], "photo", "Photos humidité magasin B", "gbeke-magasin-b.zip", "s3://mulcv/gbk/photos-magasin-b.zip", "application/zip", 9240000, "SDA", "2026-07-13T12:20:00Z"],
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc4", sites[2].id, missions[1][0], "inventory", "Inventaire provisoire San-Pédro", "inventaire-san-pedro.xlsx", "s3://mulcv/sas/inventaire.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 308000, "CEIBA", "2026-07-14T08:40:00Z"],
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc5", sites[5].id, missions[1][0], "quality_report", "Contrôle qualité Aboisso", "qc-aboisso.pdf", "s3://mulcv/com/qc-aboisso.pdf", "application/pdf", 215000, "CEIBA", "2026-07-15T16:15:00Z"],
  ["cccccccc-cccc-4ccc-8ccc-ccccccccccc6", sites[0].id, missions[0][0], "signed_form", "PV validation Abidjan", "pv-validation-abj.pdf", "s3://mulcv/abj/pv-validation.pdf", "application/pdf", 180000, "Cabinet MULCV", "2026-07-16T10:00:00Z"],
];

const audit = [
  ["dddddddd-dddd-4ddd-8ddd-ddddddddddd1", "SDA", "Archiviste", "evaluation_validated", "archive_site", sites[1].id, "SDA a validé l'évaluation MULCV-GBK-014", "2026-07-16T13:20:00Z"],
  ["dddddddd-dddd-4ddd-8ddd-ddddddddddd2", "CEIBA", "Numérisation", "evidence_uploaded", "evidence_document", sites[2].id, "CEIBA a importé l'inventaire provisoire San-Pédro", "2026-07-16T11:10:00Z"],
  ["dddddddd-dddd-4ddd-8ddd-ddddddddddd3", "PMO MULCV", "Pilotage", "mission_prioritized", "mission", missions[0][0], "PMO a priorisé la vague Gbêkê - Abidjan", "2026-07-15T17:25:00Z"],
  ["dddddddd-dddd-4ddd-8ddd-ddddddddddd4", "Auditeur", "Audit", "evidence_reviewed", "archive_site", sites[0].id, "Auditeur a consulté les pièces du site Abidjan", "2026-07-15T09:45:00Z"],
];

async function main() {
  for (const org of organizations) {
    await sql`insert into organizations (id, code, name, ministry, organization_type)
      values (${org[0]}, ${org[1]}, ${org[2]}, ${org[3]}, ${org[4]})
      on conflict (code) do update set name = excluded.name, ministry = excluded.ministry, organization_type = excluded.organization_type, updated_at = now()`;
  }

  for (const territory of territories) {
    await sql`insert into administrative_territories (id, code, name, type)
      values (${territory[0]}, ${territory[1]}, ${territory[2]}, ${territory[3]})
      on conflict (code) do update set name = excluded.name, type = excluded.type`;
  }

  for (const site of sites) {
    await sql`insert into archive_sites (
      id, code, name, organization_id, territory_id, site_type, status, district, region, department, city,
      latitude, longitude, map_x, map_y, linear_meters, estimated_boxes, estimated_pages, document_categories,
      date_range_start, date_range_end, confidentiality, has_inventory, has_electricity, has_internet,
      has_access_control, has_fire_detection, risk_score, priority_score, progress_percent, next_action
    ) values (
      ${site.id}, ${site.code}, ${site.name}, ${site.organizationId}, ${site.territoryId}, ${site.siteType}, ${site.status},
      ${site.district}, ${site.region}, ${site.department}, ${site.city}, ${site.latitude}, ${site.longitude}, ${site.mapX}, ${site.mapY},
      ${site.meters}, ${site.boxes}, ${site.pages}, ${JSON.stringify(site.categories)}::jsonb, ${site.start}, ${site.end},
      ${site.confidentiality}, ${site.inventory}, ${site.electricity}, ${site.internet}, ${site.accessControl}, ${site.fireDetection},
      ${site.risk}, ${site.priority}, ${site.progress}, ${site.nextAction}
    ) on conflict (code) do update set
      name = excluded.name, organization_id = excluded.organization_id, territory_id = excluded.territory_id,
      site_type = excluded.site_type, status = excluded.status, district = excluded.district, region = excluded.region,
      department = excluded.department, city = excluded.city, latitude = excluded.latitude, longitude = excluded.longitude,
      map_x = excluded.map_x, map_y = excluded.map_y, linear_meters = excluded.linear_meters,
      estimated_boxes = excluded.estimated_boxes, estimated_pages = excluded.estimated_pages,
      document_categories = excluded.document_categories, date_range_start = excluded.date_range_start,
      date_range_end = excluded.date_range_end, confidentiality = excluded.confidentiality,
      has_inventory = excluded.has_inventory, has_electricity = excluded.has_electricity,
      has_internet = excluded.has_internet, has_access_control = excluded.has_access_control,
      has_fire_detection = excluded.has_fire_detection, risk_score = excluded.risk_score,
      priority_score = excluded.priority_score, progress_percent = excluded.progress_percent,
      next_action = excluded.next_action, updated_at = now()`;
  }

  for (const contact of contacts) {
    await sql`insert into site_contacts (id, site_id, full_name, role, phone, email, can_validate, is_primary)
      values (${contact[0]}, ${contact[1]}, ${contact[2]}, ${contact[3]}, ${contact[4]}, ${contact[5]}, ${contact[6]}, true)
      on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = excluded.phone, email = excluded.email, can_validate = excluded.can_validate, is_primary = excluded.is_primary`;
  }

  for (const team of teams) {
    await sql`insert into teams (id, code, name, specialty, home_base)
      values (${team[0]}, ${team[1]}, ${team[2]}, ${team[3]}, ${team[4]})
      on conflict (id) do update set code = excluded.code, name = excluded.name, specialty = excluded.specialty, home_base = excluded.home_base`;
  }

  for (const mission of missions) {
    await sql`insert into missions (id, code, title, status, region_scope, start_date, end_date, lead_team_id, objective, vehicle_needs, scanner_needs)
      values (${mission[0]}, ${mission[1]}, ${mission[2]}, ${mission[3]}, ${mission[4]}, ${mission[5]}, ${mission[6]}, ${mission[7]}, ${mission[8]}, ${mission[9]}, ${mission[10]})
      on conflict (code) do update set title = excluded.title, status = excluded.status, region_scope = excluded.region_scope, start_date = excluded.start_date, end_date = excluded.end_date, lead_team_id = excluded.lead_team_id, objective = excluded.objective, vehicle_needs = excluded.vehicle_needs, scanner_needs = excluded.scanner_needs`;
  }

  for (const document of documents) {
    await sql`insert into evidence_documents (id, site_id, mission_id, type, title, file_name, storage_key, mime_type, size_bytes, uploaded_by, uploaded_at)
      values (${document[0]}, ${document[1]}, ${document[2]}, ${document[3]}, ${document[4]}, ${document[5]}, ${document[6]}, ${document[7]}, ${document[8]}, ${document[9]}, ${document[10]})
      on conflict (id) do update set title = excluded.title, file_name = excluded.file_name, storage_key = excluded.storage_key, mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, uploaded_by = excluded.uploaded_by, uploaded_at = excluded.uploaded_at`;
  }

  for (const entry of audit) {
    await sql`insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, created_at)
      values (${entry[0]}, ${entry[1]}, ${entry[2]}, ${entry[3]}, ${entry[4]}, ${entry[5]}, ${entry[6]}, ${entry[7]})
      on conflict (id) do update set actor_name = excluded.actor_name, actor_role = excluded.actor_role, action = excluded.action, entity_type = excluded.entity_type, entity_id = excluded.entity_id, description = excluded.description, created_at = excluded.created_at`;
  }

  console.log(`Seed terminé: ${sites.length} sites, ${missions.length} missions, ${documents.length} pièces.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
