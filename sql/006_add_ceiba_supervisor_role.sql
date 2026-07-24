-- CEIBA Inventaire - ajout du profil superviseur dashboard en lecture seule
-- A executer une seule fois sur une base existante deja initialisee avec sql/005_create_ceiba_inventory.sql.

alter table ceiba_inventory_users
  modify column role enum('admin', 'supervisor', 'operator') not null default 'operator';
