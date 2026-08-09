# Contabo root + SSL - MULCV GeoArchives

Ce guide part du principe que tu es connecte en root sur le VPS Contabo, avec Ubuntu/Debian.

## 1. DNS

Recommandation propre:

- Front Vercel: domaine public de l'application, par exemple `geoarchives.ton-domaine.ci` ou `www.ton-domaine.ci`.
- API Contabo: sous-domaine dedie, par exemple `api.ton-domaine.ci`.
- MySQL: reste local ou prive cote Contabo, jamais expose au navigateur.

Si tu veux utiliser le domaine racine pour l'API, remplace partout `api.ton-domaine.ci` par `ton-domaine.ci`. Dans ce cas, ne mets pas le front Vercel sur le meme host.

Dans le DNS du domaine, creer:

```text
A    api    <IP_PUBLIQUE_CONTABO>
```

Attendre la propagation, puis verifier depuis ton poste:

```bash
nslookup api.ton-domaine.ci
```

## 2. Paquets serveur

Sur Contabo, en root:

```bash
apt update
apt install -y git nginx certbot python3-certbot-nginx ufw mysql-client
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

Ouvrir seulement SSH, HTTP et HTTPS:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 3. Installer l'application

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Ceibatech/gis-carto.git
cd /var/www/gis-carto
npm ci
npm run build:contabo
```

Contabo utilise `next start` via `npm run start:contabo`, afin de servir correctement les routes `/api/auth`, `/api/geoarchives` et `/api/sites`.

## 4. Variables Contabo API

Creer le fichier d'environnement serveur:

```bash
nano /etc/geoarchives-api.env
```

Contenu a adapter:

```env
NODE_ENV=production
PORT=4100
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/mulcv_geoarchives
GEOARCHIVES_ALLOWED_ORIGINS=https://ton-front-vercel.vercel.app,https://www.ton-domaine.ci

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

Proteger le fichier:

```bash
chown root:root /etc/geoarchives-api.env
chmod 600 /etc/geoarchives-api.env
```

## 5. Schema MySQL

A executer une seule fois sur la base `mulcv_geoarchives`:

```bash
mysql -h HOST -u USER -p mulcv_geoarchives < /var/www/gis-carto/sql/001_create_schema.sql
mysql -h HOST -u USER -p mulcv_geoarchives < /var/www/gis-carto/sql/002_add_survey_fields.sql
mysql -h HOST -u USER -p mulcv_geoarchives < /var/www/gis-carto/sql/003_add_mission_fields.sql
```

Si la base est deja a jour, ne relance pas ces scripts au hasard. Pour ajouter seulement la table utilisateurs sur une base existante, execute `sql/004_create_users.sql` une fois. L'application lit et ecrit dans les tables existantes.

## 6. Service systemd

```bash
cp /var/www/gis-carto/deploy/contabo/geoarchives-api.service /etc/systemd/system/geoarchives-api.service
systemctl daemon-reload
systemctl enable --now geoarchives-api
systemctl status geoarchives-api --no-pager
```

Logs utiles:

```bash
journalctl -u geoarchives-api -f
```

Verifier localement sur le serveur:

```bash
curl http://127.0.0.1:4100/api/geoarchives
```

## 7. Nginx HTTP avant SSL

Installer le reverse proxy HTTP temporaire:

```bash
DOMAIN=api.ton-domaine.ci
cp /var/www/gis-carto/deploy/contabo/nginx.conf.example /etc/nginx/sites-available/geoarchives-api
sed -i "s/api.ton-domaine.ci/$DOMAIN/g" /etc/nginx/sites-available/geoarchives-api
ln -sf /etc/nginx/sites-available/geoarchives-api /etc/nginx/sites-enabled/geoarchives-api
nginx -t
systemctl reload nginx
```

Remplace `api.ton-domaine.ci` par ton vrai sous-domaine si besoin.

Verifier:

```bash
curl http://api.ton-domaine.ci/api/geoarchives
```

## 8. Activer SSL Let's Encrypt

Quand le DNS pointe bien vers Contabo:

```bash
certbot --nginx -d api.ton-domaine.ci --redirect
```

Puis verifier le renouvellement automatique:

```bash
certbot renew --dry-run
systemctl status certbot.timer --no-pager
```

Verifier HTTPS:

```bash
curl https://api.ton-domaine.ci/api/geoarchives
```

## 9. Variables Vercel apres SSL

Sur Vercel, mettre:

```env
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

Puis redeployer Vercel.

## 10. Tests finaux

Depuis ton poste:

```bash
curl https://api.ton-domaine.ci/api/geoarchives
curl -i -X OPTIONS https://api.ton-domaine.ci/api/sites \
  -H "Origin: https://ton-front-vercel.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Dans le navigateur:

- Se connecter avec `executif`: dashboard complet.
- Se connecter avec un login agent: arrivee directe sur `Registre des sites`.
- Capturer GPS + soumettre une fiche: la donnee doit aller en base MySQL Contabo.


Note: apres connexion avec `GEOARCHIVES_ADMIN_LOGIN`, les agents se creent depuis `Gestion des comptes`.

## 11. Mises a jour automatiques depuis GitHub

Le minuteur fourni verifie GitHub toutes les cinq minutes. Il suit uniquement la
branche configuree, refuse les modifications locales et les mises a jour non
lineaires, construit l'application avant de redemarrer le service, puis controle
l'API locale. Vercel reste deploye manuellement.

Pour le serveur de production actuel (branche
`codex/fix-low-connectivity-form`, API locale sur le port `4201`), faire une seule
fois en root:

```bash
cd /var/www/gis-carto
git fetch origin
git merge --ff-only origin/codex/fix-low-connectivity-form

cp deploy/contabo/geoarchives-update.service /etc/systemd/system/
cp deploy/contabo/geoarchives-update.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now geoarchives-update.timer
systemctl start geoarchives-update.service
```

Verifier le minuteur et le dernier deploiement:

```bash
systemctl status geoarchives-update.timer --no-pager
systemctl list-timers geoarchives-update.timer --no-pager
journalctl -u geoarchives-update.service -n 80 --no-pager
```

Le premier lancement memorise simplement le commit deja en production si l'API
repond correctement. Les lancements suivants ne reconstruisent que lorsqu'un
nouveau commit apparait sur la branche distante. Pour changer plus tard de
branche ou de port, modifier les variables `GEOARCHIVES_DEPLOY_BRANCH` et
`GEOARCHIVES_HEALTH_URL` dans
`/etc/systemd/system/geoarchives-update.service`, puis executer:

```bash
systemctl daemon-reload
systemctl restart geoarchives-update.timer
```
