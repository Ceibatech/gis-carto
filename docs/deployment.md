# Déploiement MULCV GeoArchives

## Architecture recommandée

- Front public sur Vercel.
- API Node sur Contabo, derrière Nginx ou Caddy.
- MySQL accessible uniquement depuis l'API Contabo.
- Le schéma SQL reste exécuté une seule fois avec `sql/001_create_schema.sql`, puis les scripts `002` et `003` si la base existait déjà avant l'ajout des champs de recensement.

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

Le fichier `vercel.json` force cette commande pour éviter que Vercel lance le build Contabo/Vinext (`npm run build:contabo`).

Variables Vercel à configurer:

```text
NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL=https://api.ton-domaine.ci
GEOARCHIVES_API_BASE_URL=https://api.ton-domaine.ci
GEOARCHIVES_AUTH_SECRET=<secret-long-et-aleatoire>
GEOARCHIVES_ADMIN_LOGIN=dac01@ceiba-analytics.com
GEOARCHIVES_ADMIN_PASSWORD=<mot-de-passe-admin>
GEOARCHIVES_ADMIN_NAME=Administrateur national
GEOARCHIVES_EXECUTIVE_LOGIN=executif
GEOARCHIVES_EXECUTIVE_PASSWORD=<mot-de-passe-executif>
GEOARCHIVES_EXECUTIVE_NAME=Pilotage national
GEOARCHIVES_AGENT_ACCOUNTS=[{"login":"agent-abidjan","password":"<mot-de-passe-agent-abidjan>","name":"Agent Abidjan"}]
RESEND_API_KEY=<cle-resend>
RESEND_FROM_EMAIL=support@ceiba-analytics.com
PASSWORD_RESET_REDIRECT_URL=https://geoarchiv.ceiba-analytics.com/reset-password
```

Ne mets pas `DATABASE_URL` sur Vercel si la base reste derrière Contabo. Le front et le rendu serveur liront les données via l'API HTTPS.

## Contabo API

Sur le serveur Contabo, installer Node.js 22+, cloner le repo, puis préparer l'application:

```bash
cd /var/www/gis-carto
npm ci
npm run build:contabo
```

Créer `/etc/geoarchives-api.env` à partir de `deploy/contabo/geoarchives-api.env.example`.

Variables Contabo à configurer:

```text
NODE_ENV=production
PORT=4100
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/mulcv_geoarchives
GEOARCHIVES_ALLOWED_ORIGINS=https://mulcv-geoarchives.vercel.app,https://ton-domaine-front.ci
GEOARCHIVES_AUTH_SECRET=<secret-long-et-aleatoire>
GEOARCHIVES_ADMIN_LOGIN=dac01@ceiba-analytics.com
GEOARCHIVES_ADMIN_PASSWORD=<mot-de-passe-admin>
GEOARCHIVES_ADMIN_NAME=Administrateur national
GEOARCHIVES_EXECUTIVE_LOGIN=executif
GEOARCHIVES_EXECUTIVE_PASSWORD=<mot-de-passe-executif>
GEOARCHIVES_EXECUTIVE_NAME=Pilotage national
GEOARCHIVES_AGENT_ACCOUNTS=[{"login":"agent-abidjan","password":"<mot-de-passe-agent-abidjan>","name":"Agent Abidjan"}]
RESEND_API_KEY=<cle-resend>
RESEND_FROM_EMAIL=support@ceiba-analytics.com
PASSWORD_RESET_REDIRECT_URL=https://geoarchiv.ceiba-analytics.com/reset-password
```

Guide detaille root + SSL: `docs/contabo-ssl-root.md`.

Lancer en service système avec `deploy/contabo/geoarchives-api.service`, puis exposer HTTPS avec `deploy/contabo/nginx.conf.example`.

## Vérifications après déploiement

```bash
curl https://api.ton-domaine.ci/api/geoarchives
curl -i -X OPTIONS https://api.ton-domaine.ci/api/sites \
  -H "Origin: https://mulcv-geoarchives.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Le premier appel doit renvoyer le dashboard JSON. Le second doit renvoyer les headers CORS avec ton domaine Vercel.


Note: apres connexion avec `GEOARCHIVES_ADMIN_LOGIN`, les agents se creent depuis `Gestion des comptes`.
