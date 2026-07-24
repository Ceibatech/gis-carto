# SQL MULCV GeoArchives

`001_create_schema.sql` est le schéma initial MySQL de l'application.

Important:

- À exécuter une seule fois sur une base vide.
- À ne pas lancer au démarrage de l'application.
- Les formulaires de l'application injectent ensuite les données dans les tables existantes.
- L'application ne fait pas de `CREATE TABLE` à l'exécution.

Ordre normal:

```bash
# 1. Créer la base MySQL mulcv_geoarchives
# 2. Exécuter sql/001_create_schema.sql dans la base via phpMyAdmin ou MySQL
# 3. Renseigner DATABASE_URL dans .env.local, ex: mysql://USER:PASSWORD@HOST:3306/mulcv_geoarchives
# 4. Lancer l'application
npm run dev
```


## Comptes utilisateurs

- Pour une base neuve, la table `geoarchive_users` est incluse dans `001_create_schema.sql`.
- Pour une base deja en production, executer seulement `sql/004_create_users.sql` une fois.
- Le premier administrateur peut etre amorce via `.env` avec `GEOARCHIVES_ADMIN_LOGIN`, `GEOARCHIVES_ADMIN_PASSWORD` et `GEOARCHIVES_ADMIN_NAME`.
- Ensuite, les comptes agents et executifs se creent dans l'application via `Gestion des comptes`.

## Inventaire CEIBA

- Pour activer le module separe de suivi des fiches MCLU / guichet foncier, executer `sql/005_create_ceiba_inventory.sql`.
- Une fois la table creee, la page `/inventaire-ceiba` permet de saisir les fiches et de suivre l'activite dans un dashboard dedie.
- Le meme script cree aussi `ceiba_inventory_users`, table dediee aux comptes du module CEIBA uniquement.
