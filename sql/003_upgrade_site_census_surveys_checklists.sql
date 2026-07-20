-- MULCV GeoArchives - upgrade site census survey checklists
-- A executer si 002_add_site_census_surveys.sql a deja ete applique auparavant

ALTER TABLE site_census_surveys
  ADD COLUMN IF NOT EXISTS checklist_vehicle_access BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_loading_area BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_site_signage BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_archives_separated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_shelving_available BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_humidity_observed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_pest_observed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_fire_extinguisher BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_backup_power BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checklist_immediate_risk_reported BOOLEAN NOT NULL DEFAULT FALSE;
