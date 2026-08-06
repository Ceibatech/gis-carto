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
CEIBA_INVENTORY_ADMIN_LOGIN=ceibac-admin
CEIBA_INVENTORY_ADMIN_PASSWORD=<mot-de-passe-admin-ceibac>
CEIBA_INVENTORY_ADMIN_NAME=Administration CEIBAC
CEIBA_INVENTORY_SESSION_MAX_AGE_SECONDS=43200
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
CEIBA_INVENTORY_ADMIN_LOGIN=ceibac-admin
CEIBA_INVENTORY_ADMIN_PASSWORD=<mot-de-passe-admin-ceibac>
CEIBA_INVENTORY_ADMIN_NAME=Administration CEIBAC
CEIBA_INVENTORY_SESSION_MAX_AGE_SECONDS=43200
RESEND_API_KEY=<cle-resend>
RESEND_FROM_EMAIL=support@ceiba-analytics.com
PASSWORD_RESET_REDIRECT_URL=https://geoarchiv.ceiba-analytics.com/reset-password
```

Guide detaille root + SSL: `docs/contabo-ssl-root.md`.

Lancer en service système avec `deploy/contabo/geoarchives-api.service`, puis exposer HTTPS avec `deploy/contabo/nginx.conf.example`.

## Ordre de déploiement

Le front et l'API sont couplés en version: `/api/geoarchives` et `/api/sites` exigent un cookie de session, et le front l'envoie via `credentials: "include"` sur des réponses CORS credentialed.

Une version dépareillée ne fonctionne pas:

- front à jour + API ancienne: l'API ne renvoie pas `Access-Control-Allow-Credentials`, le navigateur bloque la réponse;
- front ancien + API à jour: le front n'envoie pas le cookie, l'API répond 401.

Déployer l'API Contabo d'abord, puis Vercel immédiatement après. La bascule laisse une courte fenêtre d'indisponibilité, à prévoir hors heures de collecte.

`GEOARCHIVES_ALLOWED_ORIGINS` doit contenir l'origine exacte du front, protocole compris et sans slash final. Une réponse credentialed ne peut pas utiliser `*`: si l'origine appelante n'est pas dans la liste, l'API renvoie la première de la liste et le navigateur rejette toutes les réponses.

## Vérifications après déploiement

```bash
curl -i https://api.ton-domaine.ci/api/geoarchives
curl -i -X OPTIONS https://api.ton-domaine.ci/api/sites \
  -H "Origin: https://mulcv-geoarchives.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Le premier appel doit renvoyer **401** avec `{"message":"Session GeoArchives requise."}`. Un 200 avec le dashboard signifie que l'ancienne version est encore en ligne: les données nationales sont alors exposées sans authentification.

Le second doit renvoyer `access-control-allow-credentials: true`, `access-control-allow-methods` incluant `PATCH`, et `access-control-allow-origin` égal au domaine Vercel exact envoyé dans `Origin`.

Contrôle applicatif à faire ensuite: se connecter avec un compte agent CEIBA et vérifier dans DevTools que la réponse de `/inventaire/registre` ne contient que les fiches de cet agent.


Note: apres connexion avec `GEOARCHIVES_ADMIN_LOGIN`, les agents se creent depuis `Gestion des comptes`.
