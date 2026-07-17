# Base de données MULCV GeoArchives

L'application utilise PostgreSQL via `DATABASE_URL` et Drizzle. Le schéma est dans `db/schema.ts`; les données métier initiales sont dans `scripts/seed.mjs`.

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

## Mise en route

1. Créer `.env.local` à partir de `.env.example`.
2. Renseigner `DATABASE_URL`.
3. Générer la migration si le schéma change.
4. Appliquer les migrations.
5. Charger le seed initial.
6. Lancer l'application.

```bash
copy .env.example .env.local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Capture de données

L'écran `Registre des sites` contient une capture rapide. Chaque enregistrement écrit dans:

- `organizations` si la structure n'existe pas encore;
- `archive_sites` pour la fiche principale;
- `site_contacts` pour le point focal;
- `audit_logs` pour la trace de création ou mise à jour.

Le tableau de bord relit ensuite les données depuis l'API `/api/geoarchives`.
