# MULCV GeoArchives

Application web de gouvernance archivistique pour localiser, recenser, évaluer, prioriser et suivre les sites d'archives du MULCV.

## Démarrage

```bash
npm install
copy .env.example .env.local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

La variable `DATABASE_URL` est obligatoire pour afficher et capturer les données métier.

## Modules

- Carte SIG nationale alimentée par les sites en base.
- Registre national avec capture rapide de fiches site.
- Questionnaire d'évaluation et calcul de scores.
- Planification des missions.
- Espace documentaire et journal d'audit.

Voir `docs/database.md` pour le schéma détaillé.
