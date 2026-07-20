# Base de données MULCV GeoArchives

L'application utilise MySQL via `DATABASE_URL`.

Point important: l'application ne crée pas les tables au démarrage. Le schéma est fourni en SQL et doit être exécuté une seule fois par toi ou par l'administrateur base de données.

## Fichier SQL à lancer

```text
sql/001_create_schema.sql
```

Ce fichier contient les `CREATE TABLE`, `ENUM`, clés étrangères et index nécessaires.

Après exécution du SQL, l'application utilise les tables existantes:

- lecture pour le tableau de bord et la carte;
- insertion/mise à jour après soumission des formulaires;
- journalisation dans `audit_logs`.

## Tables principales

- `organizations`: ministère, directions, agences et structures rattachées.
- `administrative_territories`: districts, régions, départements, communes.
- `archive_sites`: registre national des sites avec GPS, statut, volume, risque, priorité et avancement.
- `site_contacts`: responsables, points focaux et validateurs.
- `archive_rooms`: locaux, magasins, bureaux et entrepôts d'archives.
- `archival_funds`: fonds documentaires, séries, supports, volumes et confidentialité.
- `site_evaluations`: diagnostic archivistique, scores et recommandations.
- `missions`, `mission_sites`, `teams`, `team_members`: mobilisation terrain.
- `equipment`, `vehicles`, `transfers`: logistique opérationnelle.
- `digitization_batches`, `quality_controls`, `operational_metrics`: production et contrôle qualité.
- `evidence_documents`: rapports, photos, inventaires, PV et certificats.
- `audit_logs`: journal d'audit et traçabilité.

## Mise en route normale

1. Créer une base MySQL vide, idéalement `mulcv_geoarchives`.
2. Exécuter `sql/001_create_schema.sql` une seule fois.
3. Créer `.env.local` à partir de `.env.example`.
4. Renseigner `DATABASE_URL`, par exemple `mysql://USER:PASSWORD@HOST:3306/mulcv_geoarchives`.
5. Lancer l'application.

```bash
copy .env.example .env.local
npm run dev
```

## Capture de données

L'écran `Registre des sites` contient une capture rapide. Chaque enregistrement écrit dans:

- `organizations` si la structure n'existe pas encore;
- `archive_sites` pour la fiche principale;
- `site_contacts` pour le point focal;
- `audit_logs` pour la trace de création ou mise à jour.

Le tableau de bord relit ensuite les données depuis l'API `/api/geoarchives`.
