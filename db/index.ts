import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? "";
}

function isPlaceholderDatabaseUrl(databaseUrl: string) {
  const trimmed = databaseUrl.trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.trim().toUpperCase();
    const username = decodeURIComponent(parsed.username || "").trim().toUpperCase();
    const password = decodeURIComponent(parsed.password || "").trim().toUpperCase();

    return host === "HOST" || username === "USER" || password === "PASSWORD";
  } catch {
    return false;
  }
}

export function isDatabaseConfigured() {
  const databaseUrl = getDatabaseUrl();
  return databaseUrl.trim().length > 0 && !isPlaceholderDatabaseUrl(databaseUrl);
}

function isLocalHost(databaseUrl: string) {
  try {
    const host = new URL(databaseUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

// La base peut vivre sur un autre hebergeur que l'application: le trafic MySQL
// traverse alors l'internet public et doit etre chiffre. TLS est donc actif par
// defaut des que l'hote n'est pas local, et ne peut etre coupe qu'explicitement
// via DATABASE_SSL=disabled.
function sslOptions(databaseUrl: string): PoolOptions["ssl"] | undefined {
  const mode = (process.env.DATABASE_SSL ?? "").trim().toLowerCase();
  if (mode === "disabled" || mode === "false") return undefined;
  if (mode !== "required" && mode !== "true" && isLocalHost(databaseUrl)) return undefined;

  const ca = process.env.DATABASE_SSL_CA?.trim();
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }

  // Sans CA fournie, MySQL presente generalement un certificat auto-signe:
  // la connexion reste chiffree mais le serveur n'est pas authentifie.
  // Renseigner DATABASE_SSL_CA des que possible pour fermer cette faille.
  return { rejectUnauthorized: false };
}

let cachedPool: Pool | null = null;
let cachedPoolUrl = "";

// Un seul pool par processus. Chaque appelant ouvrait auparavant son propre
// pool puis le fermait, ce qui refait la poignee de main TCP + TLS +
// authentification a chaque requete HTTP: negligeable sur une base locale,
// couteux des que la base est distante.
export function getPool(): Pool {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl || isPlaceholderDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Le service n'est pas encore disponible.",
    );
  }

  if (cachedPool && cachedPoolUrl === databaseUrl) {
    return cachedPool;
  }

  void cachedPool?.end().catch(() => undefined);
  cachedPool = mysql.createPool({
    uri: databaseUrl,
    disableEval: true,
    ssl: sslOptions(databaseUrl),
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 8),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  });
  cachedPoolUrl = databaseUrl;

  return cachedPool;
}
