# Déploiement MULCV GeoArchives

## Architecture recommandée

- Front public sur Vercel.
- API Node sur un serveur backend séparé — Contabo ou Render selon le déploiement (voir plus bas).
- MySQL accessible uniquement depuis ce backend, jamais depuis Vercel ni depuis le navigateur.
- Le schéma SQL reste exécuté une seule fois avec `sql/001_create_schema.sql`, puis les scripts `002` et `005` (recensement terrain et module CEIBA). `003`, `004` et `006` ne servent qu'à mettre à jour une base plus ancienne — ne pas les rejouer sur une base déjà à jour.

Le navigateur ne parle jamais qu'au front Vercel. Les routes `/api/geoarchives`, `/api/sites` et `/api/users` relaient elles-mêmes, côté serveur, vers le backend distant quand ce front n'a pas d'accès direct à MySQL (`lib/geoarchives-server-proxy.ts`, même principe que le module CEIBA). Ça évite tout appel cross-origin depuis le navigateur: pas de CORS à faire fonctionner pour l'utilisateur final, et le cookie de session reste posé sur le seul domaine que le navigateur connaît.

Une conséquence à ne pas perdre de vue: `GEOARCHIVES_AUTH_SECRET` doit être **identique** sur Vercel et sur le backend. Les sessions sont signées d'un côté et vérifiées de l'autre; un secret différent invalide silencieusement toutes les connexions.

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
GEOARCHIVES_API_BASE_URL=https://api.ton-domaine.ci
GEOARCHIVES_AUTH_SECRET=<secret-long-et-aleatoire, identique au backend>
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

`NEXT_PUBLIC_GEOARCHIVES_API_BASE_URL` n'est plus utilisée: le client ne parle plus jamais au backend en direct, elle peut rester absente.

Ne mets pas `DATABASE_URL` sur Vercel si la base reste derrière un backend séparé. Le front et le rendu serveur liront les données via l'API distante (`GEOARCHIVES_API_BASE_URL`).

Les comptes bootstrap (`GEOARCHIVES_ADMIN_LOGIN` etc.) configurés sur Vercel ne sont en pratique plus utilisés une fois `GEOARCHIVES_API_BASE_URL` renseigné: le relais interroge systématiquement le backend, seuls les comptes qui y sont configurés (ou stockés dans sa base) répondent. Les garder identiques des deux côtés évite les surprises si `GEOARCHIVES_API_BASE_URL` est retiré temporairement.

## Backend API

Le backend expose les routes `/api/*` et parle à MySQL. Deux hébergements documentés: Contabo (VPS, contrôle total) et Render (PaaS, plus simple à opérer). Les deux utilisent le même code, `npm run build:contabo` / `npm run start:contabo` — le nom du script date du premier hébergement retenu, il n'a rien de spécifique à Contabo.

### Option Contabo (VPS)

Installer Node.js 22+, cloner le repo, puis préparer l'application:

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
GEOARCHIVES_AUTH_SECRET=<secret-long-et-aleatoire, identique au front Vercel>
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

### Option Render (PaaS)

`render.yaml` à la racine du dépôt décrit le service (web service Node, build `npm ci && npm run build:contabo`, démarrage `npm run start:contabo`). Render lit `PORT` lui-même au démarrage: ne pas le fixer en dur.

Variables à saisir dans le tableau de bord Render (celles marquées `sync: false` dans `render.yaml` ne sont pas commitées et doivent être créées à la main):

```text
DATABASE_URL=mysql://compte_utilisateur:MOTDEPASSE@srvXXX.hebergeur.com:3306/compte_base
DATABASE_SSL=disabled
GEOARCHIVES_ALLOWED_ORIGINS=https://mulcv-geoarchives.vercel.app
GEOARCHIVES_ADMIN_LOGIN=...
GEOARCHIVES_ADMIN_PASSWORD=...
GEOARCHIVES_ADMIN_NAME=...
GEOARCHIVES_EXECUTIVE_LOGIN=...
GEOARCHIVES_EXECUTIVE_PASSWORD=...
GEOARCHIVES_EXECUTIVE_NAME=...
GEOARCHIVES_AGENT_ACCOUNTS=[...]
CEIBA_INVENTORY_ADMIN_LOGIN=...
CEIBA_INVENTORY_ADMIN_PASSWORD=...
CEIBA_INVENTORY_ADMIN_NAME=...
```

`GEOARCHIVES_AUTH_SECRET` est généré automatiquement par `render.yaml` (`generateValue: true`) au premier déploiement. Copier ensuite sa valeur (Render → service → Environment) vers la variable de même nom sur Vercel: sans ça, les sessions signées par le backend ne seront jamais reconnues par le relais du front.

Spécificités d'une base MySQL cPanel distante, fréquentes hors VPS dédié:

- `DATABASE_SSL=disabled` si la base ne supporte pas TLS. Vérifier avec `SHOW VARIABLES LIKE 'have_ssl';` dans phpMyAdmin — `DISABLED` confirme l'absence de support, tenter TLS échouerait purement et simplement à se connecter. Le trafic MySQL circule alors en clair sur l'internet public: mot de passe long, droits limités à `SELECT, INSERT, UPDATE` sur l'utilisateur applicatif, jamais `ALL PRIVILEGES`.
- **Remote MySQL**: dans cPanel, autoriser les IP sortantes du service Render (tableau de bord Render → Settings → Outbound IPs, disponibles une fois le service créé) — jamais `%`, qui ouvrirait la base à tout l'internet.
- `DATABASE_POOL_SIZE` à réduire (3 à 5) si l'hébergeur mutualisé plafonne `max_user_connections`.

## Ordre de déploiement

Le front et le backend restent couplés sur un point: `GEOARCHIVES_AUTH_SECRET` doit être identique des deux côtés pour que les sessions signées par le backend soient acceptées par le relais Vercel. En dehors de ce secret partagé, le relais gère lui-même la compatibilité de version — il n'y a plus de contrainte de bascule simultanée liée au CORS credentialed.

`GEOARCHIVES_ALLOWED_ORIGINS` ne conditionne plus l'usage normal de l'application (le navigateur ne fait plus d'appel cross-origin vers le backend); elle reste utile pour un appel manuel direct (curl, débogage) et peut rester restrictive.

## Vérifications après déploiement

Contrôle direct du backend, à faire d'abord:

```bash
curl -i https://api.ton-domaine.ci/api/geoarchives
```

Doit renvoyer **401** avec `{"message":"Session GeoArchives requise."}`. Un 200 avec le dashboard signifie une version antérieure au durcissement des routes encore en ligne: les données nationales seraient alors exposées sans authentification.

Contrôle du relais, depuis le front:

```bash
curl -i https://mulcv-geoarchives.vercel.app/api/geoarchives
```

Même réponse attendue (401 sans cookie) — cette fois en passant par Vercel, qui relaie server-to-server vers le backend. Un timeout ou une 500 signale généralement `GEOARCHIVES_API_BASE_URL` mal renseignée côté Vercel, ou le backend injoignable.

Contrôle applicatif à faire ensuite: se connecter avec un compte agent CEIBA depuis le navigateur et vérifier dans DevTools que la réponse de `/inventaire/registre` ne contient que les fiches de cet agent, et que la connexion aboutit avec un compte créé depuis `Gestion des comptes` (pas seulement les comptes bootstrap) — c'est le scénario que le relais corrige.


Note: apres connexion avec `GEOARCHIVES_ADMIN_LOGIN`, les agents se creent depuis `Gestion des comptes`.
