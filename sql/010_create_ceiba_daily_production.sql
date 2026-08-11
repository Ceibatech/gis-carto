-- Remontee journaliere des operateurs CEIBA, conforme a CG1020.
-- A executer une seule fois dans la base MySQL de production.

CREATE TABLE IF NOT EXISTS ceiba_inventory_daily_production (
  id CHAR(36) PRIMARY KEY,
  production_date DATE NOT NULL,
  operator_login VARCHAR(190) NOT NULL,
  operator_name VARCHAR(190) NOT NULL,
  assigned_room VARCHAR(190) NULL,
  cartons_count INT UNSIGNED NOT NULL DEFAULT 0,
  dossiers_count INT UNSIGNED NOT NULL DEFAULT 0,
  damaged_cartons_count INT UNSIGNED NOT NULL DEFAULT 0,
  damaged_dossiers_count INT UNSIGNED NOT NULL DEFAULT 0,
  difficulties TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ceiba_daily_production_operator_date_unique (production_date, operator_login),
  KEY ceiba_daily_production_date_idx (production_date),
  KEY ceiba_daily_production_operator_idx (operator_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;