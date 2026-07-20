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
