# MULCV GeoArchives

Application web de gouvernance archivistique pour localiser, recenser, évaluer, prioriser et suivre les sites d'archives du MULCV.

## Principe base de données

Les tables ne sont pas créées par l'application à chaque lancement.

Le schéma SQL est fourni dans:

```text
sql/001_create_schema.sql
```

Tu l'exécutes une seule fois sur une base PostgreSQL vide. Ensuite l'application utilise uniquement les tables existantes: elle lit les données pour les tableaux de bord et injecte les données après soumission des formulaires.

## Démarrage

```bash
npm install
copy .env.example .env.local
# renseigner DATABASE_URL dans .env.local
# exécuter sql/001_create_schema.sql une seule fois dans PostgreSQL
npm run dev
```

Seed optionnel, seulement si tu veux charger des données de départ:

```bash
npm run db:seed
```

## Modules

- Carte SIG nationale alimentée par les sites en base.
- Registre national avec capture rapide de fiches site.
- Questionnaire d'évaluation et calcul de scores.
- Planification des missions.
- Espace documentaire et journal d'audit.

Voir `docs/database.md` et `sql/README.md` pour le schéma et le flow SQL.
