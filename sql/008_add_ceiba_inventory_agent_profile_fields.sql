-- Informations operationnelles des comptes CEIBA.
-- A executer une seule fois sur une base deja initialisee avec sql/005_create_ceiba_inventory.sql.

ALTER TABLE ceiba_inventory_users
  ADD COLUMN employee_id VARCHAR(80) NULL AFTER full_name,
  ADD COLUMN phone VARCHAR(80) NULL AFTER employee_id,
  ADD COLUMN job_title VARCHAR(190) NULL AFTER phone,
  ADD COLUMN assigned_room VARCHAR(190) NULL AFTER job_title,
  ADD KEY ceiba_inventory_users_room_idx (assigned_room);