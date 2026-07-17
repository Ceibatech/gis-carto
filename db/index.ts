import mysql from "mysql2/promise";

type MySqlPool = mysql.Pool;

let cachedPool: MySqlPool | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? "";
}

export function isDatabaseConfigured() {
  return getDatabaseUrl().trim().length > 0;
}

export function getPool() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL est manquant. Crée un fichier .env.local avec une URL MySQL avant de lancer l'app.",
    );
  }

  if (!cachedPool) {
    cachedPool = mysql.createPool({ uri: databaseUrl, disableEval: true });
  }

  return cachedPool;
}
