import mysql, { type Pool } from "mysql2/promise";

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

export function getPool(): Pool {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl || isPlaceholderDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Le service n'est pas encore disponible.",
    );
  }

  return mysql.createPool({ uri: databaseUrl, disableEval: true });
}
