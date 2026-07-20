import mysql, { type Pool } from "mysql2/promise";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? "";
}

export function isDatabaseConfigured() {
  return getDatabaseUrl().trim().length > 0;
}

export function getPool(): Pool {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "Le service n'est pas encore disponible.",
    );
  }

  return mysql.createPool({ uri: databaseUrl, disableEval: true });
}
