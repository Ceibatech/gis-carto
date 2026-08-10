-- Champs de rangement physique ajoutes a l'inventaire CEIBA.
-- A executer sur les bases deja initialisees avec 005_create_ceiba_inventory.sql.

ALTER TABLE ceiba_inventory_forms
  ADD COLUMN box_label VARCHAR(190) NULL AFTER id,
  ADD COLUMN barcode VARCHAR(190) NULL AFTER box_label,
  ADD KEY ceiba_inventory_barcode_idx (barcode);