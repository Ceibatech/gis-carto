import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type GeoArchivesDb = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: GeoArchivesDb | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
}

export function isDatabaseConfigured() {
  return getDatabaseUrl().trim().length > 0;
}

export function getDb() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL est manquant. Crée un fichier .env.local à partir de .env.example ou exporte DATABASE_URL avant de lancer l'app.",
    );
  }

  if (!cachedDb) {
    cachedDb = drizzle(neon(databaseUrl), { schema });
  }

  return cachedDb;
}
