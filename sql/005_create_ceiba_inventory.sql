-- CEIBA Inventaire - registre separe pour les fiches guichet foncier MCLU
-- A executer une seule fois dans la meme base MySQL que l'application.

CREATE TABLE IF NOT EXISTS ceiba_inventory_forms (
  id CHAR(36) PRIMARY KEY,
  guichet_number VARCHAR(80) NULL,
  ddu_number VARCHAR(80) NULL,
  classification_reference VARCHAR(160) NULL,
  ilot_number VARCHAR(80) NULL,
  lot_number VARCHAR(80) NULL,
  surface_area VARCHAR(80) NULL,
  land_title_number VARCHAR(120) NULL,
  housing_estate TEXT NULL,
  commune VARCHAR(190) NOT NULL,
  case_nature TEXT NOT NULL,
  last_name VARCHAR(190) NOT NULL,
  first_names VARCHAR(190) NOT NULL,
  address TEXT NULL,
  phone VARCHAR(80) NULL,
  email VARCHAR(190) NULL,
  contact_person VARCHAR(190) NULL,
  contact_mobile VARCHAR(80) NULL,
  status ENUM('new', 'review', 'processed', 'blocked') NOT NULL DEFAULT 'new',
  notes TEXT NULL,
  created_by VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ceiba_inventory_commune_idx (commune),
  KEY ceiba_inventory_status_idx (status),
  KEY ceiba_inventory_created_idx (created_at),
  KEY ceiba_inventory_guichet_idx (guichet_number),
  KEY ceiba_inventory_ddu_idx (ddu_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ceiba_inventory_users (
  id CHAR(36) PRIMARY KEY,
  login VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  full_name VARCHAR(190) NOT NULL,
  role ENUM('admin', 'supervisor', 'operator') NOT NULL DEFAULT 'operator',
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_by VARCHAR(190) NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ceiba_inventory_users_login_unique (login),
  KEY ceiba_inventory_users_role_status_idx (role, status),
  KEY ceiba_inventory_users_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
