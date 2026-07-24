-- MULCV GeoArchives - schema initial MySQL
-- Base recommandee: mulcv_geoarchives
-- A executer UNE SEULE FOIS sur une base MySQL vide, par exemple via phpMyAdmin.
-- L'application ne cree pas les tables au demarrage: elle lit et ecrit uniquement dans ces tables.

-- Optionnel si la base n'existe pas encore:
-- CREATE DATABASE IF NOT EXISTS mulcv_geoarchives CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE mulcv_geoarchives;

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name TEXT NOT NULL,
  ministry VARCHAR(160) NOT NULL DEFAULT 'MULCV',
  organization_type VARCHAR(80) NOT NULL,
  parent_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY organizations_code_unique (code),
  KEY organizations_name_idx (name(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administrative_territories (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name TEXT NOT NULL,
  type ENUM('district', 'region', 'department', 'sub_prefecture', 'commune') NOT NULL,
  parent_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY territories_code_unique (code),
  KEY territories_type_name_idx (type, name(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name TEXT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  home_base TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS geoarchive_users (
  id CHAR(36) PRIMARY KEY,
  login VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  full_name VARCHAR(190) NOT NULL,
  role ENUM('admin', 'executive', 'agent') NOT NULL DEFAULT 'agent',
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_by VARCHAR(190) NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY geoarchive_users_login_unique (login),
  KEY geoarchive_users_role_status_idx (role, status),
  KEY geoarchive_users_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS archive_sites (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name TEXT NOT NULL,
  organization_id CHAR(36) NOT NULL,
  territory_id CHAR(36) NULL,
  site_type ENUM('central_direction', 'regional_direction', 'departmental_direction', 'agency', 'archive_depot', 'archive_room', 'temporary_processing_center', 'ceiba_storage_site', 'mobile_digitization_unit') NOT NULL,
  status ENUM('not_evaluated', 'evaluation_scheduled', 'evaluation_done', 'mobilization_in_progress', 'archival_processing', 'digitization_in_progress', 'quality_control', 'completed', 'high_risk', 'inaccessible') NOT NULL DEFAULT 'evaluation_scheduled',
  district TEXT NOT NULL,
  region TEXT NOT NULL,
  department TEXT NOT NULL,
  sub_prefecture TEXT NULL,
  city TEXT NOT NULL,
  commune TEXT NULL,
  address TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  map_x INT NOT NULL DEFAULT 50,
  map_y INT NOT NULL DEFAULT 50,
  access_landmarks TEXT NULL,
  accessibility VARCHAR(80) NOT NULL DEFAULT 'accessible',
  total_agents INT NULL,
  archive_rooms_count INT NOT NULL DEFAULT 0,
  storage_capacity_ml DECIMAL(12,2) NULL,
  linear_meters DECIMAL(12,2) NOT NULL DEFAULT 0,
  estimated_boxes INT NOT NULL DEFAULT 0,
  estimated_files INT NOT NULL DEFAULT 0,
  estimated_pages INT NOT NULL DEFAULT 0,
  document_categories JSON NULL,
  date_range_start INT NULL,
  date_range_end INT NULL,
  confidentiality ENUM('low', 'internal', 'confidential', 'critical') NOT NULL DEFAULT 'internal',
  has_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  has_electricity BOOLEAN NOT NULL DEFAULT FALSE,
  has_internet BOOLEAN NOT NULL DEFAULT FALSE,
  has_access_control BOOLEAN NOT NULL DEFAULT FALSE,
  has_fire_detection BOOLEAN NOT NULL DEFAULT FALSE,
  risk_score INT NOT NULL DEFAULT 0,
  priority_score INT NOT NULL DEFAULT 0,
  progress_percent INT NOT NULL DEFAULT 0,
  next_action TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY archive_sites_code_unique (code),
  KEY archive_sites_region_idx (region(191)),
  KEY archive_sites_status_idx (status),
  KEY archive_sites_risk_idx (risk_score),
  KEY archive_sites_coordinates_idx (latitude, longitude),
  CONSTRAINT archive_sites_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  CONSTRAINT archive_sites_territory_fk FOREIGN KEY (territory_id) REFERENCES administrative_territories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_contacts (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  full_name TEXT NOT NULL,
  role VARCHAR(100) NOT NULL,
  phone VARCHAR(60) NULL,
  email VARCHAR(180) NULL,
  can_validate BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY site_contacts_site_idx (site_id),
  CONSTRAINT site_contacts_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS archive_rooms (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  room_type VARCHAR(80) NOT NULL,
  surface_m2 DECIMAL(10,2) NULL,
  shelf_count INT NOT NULL DEFAULT 0,
  ventilation_condition VARCHAR(80) NULL,
  security_notes TEXT NULL,
  KEY archive_rooms_site_idx (site_id),
  CONSTRAINT archive_rooms_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS archival_funds (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  series TEXT NULL,
  support_types JSON NULL,
  date_start INT NULL,
  date_end INT NULL,
  linear_meters DECIMAL(12,2) NOT NULL DEFAULT 0,
  boxes INT NOT NULL DEFAULT 0,
  files INT NOT NULL DEFAULT 0,
  pages INT NOT NULL DEFAULT 0,
  classification_state VARCHAR(120) NOT NULL,
  confidentiality ENUM('low', 'internal', 'confidential', 'critical') NOT NULL DEFAULT 'internal',
  KEY archival_funds_site_idx (site_id),
  CONSTRAINT archival_funds_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_evaluations (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  evaluated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evaluator_name TEXT NOT NULL,
  physical_state_score INT NOT NULL,
  humidity_score INT NOT NULL,
  security_score INT NOT NULL,
  inventory_score INT NOT NULL,
  sensitivity_score INT NOT NULL,
  access_score INT NOT NULL,
  risk_score INT NOT NULL,
  priority_score INT NOT NULL,
  recommendation ENUM('treat_on_site', 'transfer_to_center', 'digitize_on_site', 'centralized_digitization', 'urgent_backup', 'pre_processing_required', 'secure_temporary_storage') NOT NULL,
  notes TEXT NULL,
  raw_answers JSON NULL,
  KEY site_evaluations_site_idx (site_id),
  CONSTRAINT site_evaluations_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  full_name TEXT NOT NULL,
  role VARCHAR(100) NOT NULL,
  phone VARCHAR(60) NULL,
  email VARCHAR(180) NULL,
  KEY team_members_team_idx (team_id),
  CONSTRAINT team_members_team_fk FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipment (
  id CHAR(36) PRIMARY KEY,
  asset_tag VARCHAR(60) NOT NULL,
  type VARCHAR(80) NOT NULL,
  label TEXT NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'available',
  assigned_team_id CHAR(36) NULL,
  CONSTRAINT equipment_team_fk FOREIGN KEY (assigned_team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id CHAR(36) PRIMARY KEY,
  plate_number VARCHAR(40) NOT NULL,
  label TEXT NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'available',
  assigned_team_id CHAR(36) NULL,
  CONSTRAINT vehicles_team_fk FOREIGN KEY (assigned_team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS missions (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  title TEXT NOT NULL,
  status ENUM('planned', 'ready', 'in_progress', 'blocked', 'completed') NOT NULL DEFAULT 'planned',
  region_scope TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  lead_team_id CHAR(36) NULL,
  objective TEXT NOT NULL,
  vehicle_needs INT NOT NULL DEFAULT 0,
  scanner_needs INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY missions_code_unique (code),
  CONSTRAINT missions_team_fk FOREIGN KEY (lead_team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_sites (
  mission_id CHAR(36) NOT NULL,
  site_id CHAR(36) NOT NULL,
  planned_sequence INT NOT NULL DEFAULT 1,
  checklist_ready BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_required BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (mission_id, site_id),
  CONSTRAINT mission_sites_mission_fk FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  CONSTRAINT mission_sites_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfers (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  mission_id CHAR(36) NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  boxes_count INT NOT NULL DEFAULT 0,
  status VARCHAR(80) NOT NULL DEFAULT 'planned',
  planned_at DATETIME NULL,
  completed_at DATETIME NULL,
  KEY transfers_site_idx (site_id),
  CONSTRAINT transfers_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE,
  CONSTRAINT transfers_mission_fk FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS digitization_batches (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  code VARCHAR(60) NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'preparation',
  pages_prepared INT NOT NULL DEFAULT 0,
  pages_scanned INT NOT NULL DEFAULT 0,
  documents_indexed INT NOT NULL DEFAULT 0,
  rejected_documents INT NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  UNIQUE KEY digitization_batches_code_unique (code),
  CONSTRAINT digitization_batches_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_controls (
  id CHAR(36) PRIMARY KEY,
  batch_id CHAR(36) NOT NULL,
  controller_name TEXT NOT NULL,
  checked_documents INT NOT NULL DEFAULT 0,
  accepted_documents INT NOT NULL DEFAULT 0,
  rejected_documents INT NOT NULL DEFAULT 0,
  rejection_reasons JSON NULL,
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY quality_controls_batch_idx (batch_id),
  CONSTRAINT quality_controls_batch_fk FOREIGN KEY (batch_id) REFERENCES digitization_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operational_metrics (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,
  boxes_identified INT NOT NULL DEFAULT 0,
  boxes_collected INT NOT NULL DEFAULT 0,
  linear_meters_processed DECIMAL(12,2) NOT NULL DEFAULT 0,
  pages_prepared INT NOT NULL DEFAULT 0,
  pages_scanned INT NOT NULL DEFAULT 0,
  documents_indexed INT NOT NULL DEFAULT 0,
  quality_checks INT NOT NULL DEFAULT 0,
  documents_validated INT NOT NULL DEFAULT 0,
  documents_rejected INT NOT NULL DEFAULT 0,
  ged_integrated INT NOT NULL DEFAULT 0,
  sae_transferred INT NOT NULL DEFAULT 0,
  KEY operational_metrics_site_date_idx (site_id, metric_date),
  CONSTRAINT operational_metrics_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evidence_documents (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  mission_id CHAR(36) NULL,
  type ENUM('visit_report', 'photo', 'floor_plan', 'inventory', 'transfer_slip', 'signed_form', 'risk_report', 'quality_report', 'acceptance_certificate') NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_provider VARCHAR(80) NOT NULL DEFAULT 's3-compatible',
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT NULL,
  checksum_sha256 VARCHAR(80) NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY evidence_documents_site_idx (site_id),
  CONSTRAINT evidence_documents_site_fk FOREIGN KEY (site_id) REFERENCES archive_sites(id) ON DELETE CASCADE,
  CONSTRAINT evidence_documents_mission_fk FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_name TEXT NOT NULL,
  actor_role VARCHAR(100) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id CHAR(36) NULL,
  description TEXT NOT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY audit_logs_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
