-- Destination apres connexion pour les comptes du portail GeoArchives.
-- A executer une seule fois sur une base existante ayant deja geoarchive_users.

ALTER TABLE geoarchive_users
  ADD COLUMN start_application ENUM('geoarchives', 'inventory') NOT NULL DEFAULT 'geoarchives' AFTER role;

CREATE INDEX geoarchive_users_start_application_idx
  ON geoarchive_users (start_application);