# D?ploiement MULCV GeoArchives

## Architecture recommand?e

- Front public sur Vercel.
- API Node sur Contabo, derri?re Nginx ou Caddy.
- MySQL accessible uniquement depuis l'API Contabo.
- Le sch?ma SQL reste ex?cut? une seule fois avec `sql/001_create_schema.sql`, puis les scripts `002` et `003` si la base existait d?j? avant l'ajout des champs de recensement.

## Vercel front

Root Directory: `.`

Framework Preset: `Next.js`

Install Command:

```bash
npm install
```

Build Command:

```bash
npm run build:vercel
```

Le fichier `vercel.json` force cette commande pour ?viter que Vercel lance le build Contabo/Vinext (`npm run build`).

Variables Vercel ? configurer:

```text
NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL=https://api.ton-domaine.ci
GEOARCHIVES_API_BASE_URL=https://api.ton-domaine.ci
```

Ne mets pas `DATABASE_URL` sur Vercel si la base reste derri?re Contabo. Le front et le rendu serveur liront les donn?es via l'API HTTPS.

## Contabo API

Sur le serveur Contabo, installer Node.js 22+, cloner le repo, puis pr?parer l'application:

```bash
cd /var/www/gis-carto
npm ci
npm run build
```

Cr?er `/etc/geoarchives-api.env` ? partir de `deploy/contabo/geoarchives-api.env.example`.

Variables Contabo ? configurer:

```text
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/mulcv_geoarchives
GEOARCHIVES_ALLOWED_ORIGINS=https://mulcv-geoarchives.vercel.app,https://ton-domaine-front.ci
```

Lancer en service syst?me avec `deploy/contabo/geoarchives-api.service`, puis exposer HTTPS avec `deploy/contabo/nginx.conf.example`.

## V?rifications apr?s d?ploiement

```bash
curl https://api.ton-domaine.ci/api/geoarchives
curl -i -X OPTIONS https://api.ton-domaine.ci/api/sites \
  -H "Origin: https://mulcv-geoarchives.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Le premier appel doit renvoyer le dashboard JSON. Le second doit renvoyer les headers CORS avec ton domaine Vercel.
