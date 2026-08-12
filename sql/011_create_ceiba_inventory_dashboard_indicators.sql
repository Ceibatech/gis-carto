-- CEIBA Inventory dashboard indicators
-- Ce script cree une table de faits journaliere et des vues de consolidation
-- par agent pour les periodes jour, semaine et mois.
-- A executer une seule fois dans la base MySQL CEIBA.

DROP TABLE IF EXISTS ceiba_inventory_agent_daily_points;
CREATE TABLE ceiba_inventory_agent_daily_points (
  id CHAR(36) PRIMARY KEY,
  agent_login VARCHAR(190) NOT NULL,
  agent_name VARCHAR(190) NULL,
  production_day DATE NOT NULL,
  cartons_count INT UNSIGNED NOT NULL DEFAULT 0,
  dossiers_count INT UNSIGNED NOT NULL DEFAULT 0,
  damaged_cartons_count INT UNSIGNED NOT NULL DEFAULT 0,
  damaged_dossiers_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_points INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ceiba_daily_points_agent_day_unique (production_day, agent_login),
  KEY ceiba_daily_points_day_idx (production_day),
  KEY ceiba_daily_points_agent_idx (agent_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ceiba_inventory_agent_daily_points (
  id,
  agent_login,
  agent_name,
  production_day,
  cartons_count,
  dossiers_count,
  damaged_cartons_count,
  damaged_dossiers_count,
  total_points
)
SELECT
  UUID() AS id,
  LOWER(COALESCE(f.created_by, 'inconnu')) AS agent_login,
  COALESCE(u.full_name, f.created_by, 'Inconnu') AS agent_name,
  DATE(f.created_at) AS production_day,
  SUM(CASE WHEN NULLIF(TRIM(f.carton_id), '') IS NOT NULL THEN 1 ELSE 0 END) AS cartons_count,
  COUNT(*) AS dossiers_count,
  SUM(CASE WHEN f.carton_damaged = 1 AND NULLIF(TRIM(f.carton_id), '') IS NOT NULL THEN 1 ELSE 0 END) AS damaged_cartons_count,
  SUM(CASE WHEN f.dossier_damaged = 1 THEN 1 ELSE 0 END) AS damaged_dossiers_count,
  SUM(CASE WHEN NULLIF(TRIM(f.carton_id), '') IS NOT NULL THEN 1 ELSE 0 END) + COUNT(*) AS total_points
FROM ceiba_inventory_forms f
LEFT JOIN ceiba_inventory_users u ON LOWER(u.login) = LOWER(f.created_by)
GROUP BY DATE(f.created_at), LOWER(COALESCE(f.created_by, 'inconnu')), COALESCE(u.full_name, f.created_by, 'Inconnu')
ON DUPLICATE KEY UPDATE
  agent_name = VALUES(agent_name),
  cartons_count = VALUES(cartons_count),
  dossiers_count = VALUES(dossiers_count),
  damaged_cartons_count = VALUES(damaged_cartons_count),
  damaged_dossiers_count = VALUES(damaged_dossiers_count),
  total_points = VALUES(total_points),
  updated_at = CURRENT_TIMESTAMP;

DROP VIEW IF EXISTS ceiba_inventory_agent_weekly_points;
CREATE VIEW ceiba_inventory_agent_weekly_points AS
SELECT
  agent_login,
  agent_name,
  DATE_FORMAT(production_day, '%Y-%u') AS week_key,
  MIN(production_day) AS week_start,
  MAX(production_day) AS week_end,
  SUM(cartons_count) AS cartons_count,
  SUM(dossiers_count) AS dossiers_count,
  SUM(damaged_cartons_count) AS damaged_cartons_count,
  SUM(damaged_dossiers_count) AS damaged_dossiers_count,
  SUM(total_points) AS total_points
FROM ceiba_inventory_agent_daily_points
GROUP BY agent_login, agent_name, DATE_FORMAT(production_day, '%Y-%u');

DROP VIEW IF EXISTS ceiba_inventory_agent_monthly_points;
CREATE VIEW ceiba_inventory_agent_monthly_points AS
SELECT
  agent_login,
  agent_name,
  DATE_FORMAT(production_day, '%Y-%m') AS month_key,
  MIN(production_day) AS month_start,
  MAX(production_day) AS month_end,
  SUM(cartons_count) AS cartons_count,
  SUM(dossiers_count) AS dossiers_count,
  SUM(damaged_cartons_count) AS damaged_cartons_count,
  SUM(damaged_dossiers_count) AS damaged_dossiers_count,
  SUM(total_points) AS total_points
FROM ceiba_inventory_agent_daily_points
GROUP BY agent_login, agent_name, DATE_FORMAT(production_day, '%Y-%m');

DROP VIEW IF EXISTS ceiba_inventory_dashboard_kpis;
CREATE VIEW ceiba_inventory_dashboard_kpis AS
SELECT
  DATE(CURDATE()) AS snapshot_day,
  SUM(cartons_count) AS total_cartons,
  SUM(dossiers_count) AS total_dossiers,
  SUM(damaged_cartons_count) AS total_damaged_cartons,
  SUM(damaged_dossiers_count) AS total_damaged_dossiers,
  COUNT(DISTINCT agent_login) AS active_agents
FROM ceiba_inventory_agent_daily_points
WHERE production_day = CURDATE();

-- Exemple d'utilisations de lecture :
-- SELECT * FROM ceiba_inventory_agent_daily_points ORDER BY production_day DESC, agent_login;
-- SELECT * FROM ceiba_inventory_agent_weekly_points ORDER BY week_start DESC, agent_login;
-- SELECT * FROM ceiba_inventory_agent_monthly_points ORDER BY month_start DESC, agent_login;
-- SELECT * FROM ceiba_inventory_dashboard_kpis;
