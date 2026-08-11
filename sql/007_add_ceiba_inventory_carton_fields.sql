-- Champs de rangement physique et d'etat ajoutes a l'inventaire CEIBA.
-- A executer sur les bases deja initialisees avec 005_create_ceiba_inventory.sql.

ALTER TABLE ceiba_inventory_forms
  ADD COLUMN IF NOT EXISTS box_label VARCHAR(190) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS carton_id VARCHAR(190) NULL AFTER box_label,
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(190) NULL AFTER carton_id,
  ADD COLUMN IF NOT EXISTS carton_state ENUM('Bon', 'À vérifier', 'Dégradé', 'Mauvais état') NOT NULL DEFAULT 'Bon' AFTER case_nature,
  ADD COLUMN IF NOT EXISTS carton_damaged TINYINT(1) NOT NULL DEFAULT 0 AFTER carton_state,
  ADD COLUMN IF NOT EXISTS carton_damage_type VARCHAR(190) NULL AFTER carton_damaged,
  ADD COLUMN IF NOT EXISTS dossier_state ENUM('Bon', 'À vérifier', 'Dégradé', 'Mauvais état') NOT NULL DEFAULT 'Bon' AFTER carton_damage_type,
  ADD COLUMN IF NOT EXISTS dossier_damaged TINYINT(1) NOT NULL DEFAULT 0 AFTER dossier_state,
  ADD COLUMN IF NOT EXISTS dossier_damage_type VARCHAR(190) NULL AFTER dossier_damaged,
  ADD KEY IF NOT EXISTS ceiba_inventory_barcode_idx (barcode),
  ADD KEY IF NOT EXISTS ceiba_inventory_carton_id_idx (carton_id),
  ADD KEY IF NOT EXISTS ceiba_inventory_carton_state_idx (carton_state),
  ADD KEY IF NOT EXISTS ceiba_inventory_dossier_state_idx (dossier_state);