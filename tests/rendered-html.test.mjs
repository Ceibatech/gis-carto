import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders GeoArchives with MySQL setup guidance", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MULCV GeoArchives<\/title>/i);
  assert.match(html, /GeoArchives/);
  assert.match(html, /Base à initialiser/);
  assert.match(html, /DATABASE_URL est manquant/);
  assert.match(html, /URL MySQL/);
  assert.match(html, /sql\/001_create_schema\.sql/);
  assert.match(html, /Registre des sites/);
  assert.match(html, /Carte SIG nationale/);
});

test("keeps the database contract on MySQL tables", async () => {
  const [sql, packageJson, dbIndex, app] = await Promise.all([
    readFile(new URL("../sql/001_create_schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/GeoArchivesApp.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS archive_sites/i);
  assert.match(sql, /ENUM\('low', 'internal', 'confidential', 'critical'\)/i);
  assert.match(sql, /mulcv_geoarchives/);
  assert.doesNotMatch(sql, /CREATE TYPE|"public"|public\./i);

  assert.match(packageJson, /"mysql2"/);
  assert.doesNotMatch(packageJson, /drizzle-orm|drizzle-kit|@neondatabase\/serverless/);
  assert.match(dbIndex, /process\.env\.DATABASE_URL \?\? process\.env\.MYSQL_URL/);
  assert.match(app, /MySQL connecté/);
  assert.doesNotMatch(app, /PostgreSQL|migrations/i);
});
