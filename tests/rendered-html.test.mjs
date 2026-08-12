import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCeibaProductionMetrics } from "../lib/ceiba-inventory-reports.js";

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

test("server-renders GeoArchives login shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MULCV GeoArchives<\/title>/i);
  assert.match(html, /GeoArchives/);
  assert.match(html, /Connexion s\u00e9curis\u00e9e/);
  assert.match(html, /Acc\u00e8s agent registre/);
  assert.match(html, /Pilotage ex\u00e9cutif/);
  assert.match(html, /Registre des sites/);
  assert.doesNotMatch(html, /DATABASE_URL est manquant|Configuration requise|db:seed|seed/i);
});

test("buildCeibaProductionMetrics uses real production quantities by agent", () => {
  const metrics = buildCeibaProductionMetrics([
    { agent: "Alice", createdAt: "2026-08-12T08:00:00Z", cartonsCount: 12, dossiersCount: 10 },
    { agent: "Alice", createdAt: "2026-08-12T10:00:00Z", cartonsCount: 8, dossiersCount: 6 },
    { agent: "Bob", createdAt: "2026-08-10T09:00:00Z", cartonsCount: 5, dossiersCount: 4 },
  ], new Date("2026-08-12T12:00:00Z"));

  assert.equal(metrics.todayProduction, 20);
  assert.equal(metrics.weekProduction, 25);
  assert.equal(metrics.monthProduction, 25);
  assert.equal(metrics.totalProduction, 25);
  assert.equal(metrics.activeAgents, 2);
  assert.deepEqual(metrics.byAgent.map((item) => ({ agent: item.agent, today: item.today, week: item.week, month: item.month, total: item.total })), [
    { agent: "Alice", today: 20, week: 20, month: 20, total: 20 },
    { agent: "Bob", today: 0, week: 5, month: 5, total: 5 },
  ]);
});

test("keeps the database contract on MySQL tables", async () => {
  const [sql, packageJson, dbIndex, app, auth, envExample] = await Promise.all([
    readFile(new URL("../sql/001_create_schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/GeoArchivesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/geoarchives-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS archive_sites/i);
  assert.match(sql, /ENUM\('low', 'internal', 'confidential', 'critical'\)/i);
  assert.match(sql, /mulcv_geoarchives/);
  assert.doesNotMatch(sql, /CREATE TYPE|"public"|public\./i);

  assert.match(packageJson, /"mysql2"/);
  assert.doesNotMatch(packageJson, /drizzle-orm|drizzle-kit|@neondatabase\/serverless|db:seed/);
  assert.match(dbIndex, /disableEval: true/);
  assert.match(app, /Capturer GPS/);
  assert.match(app, /LoginScreen/);
  assert.match(app, /landingViewForSession/);
  assert.match(app, /Dashboard inventaire/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /httpOnly: true/);
  assert.match(envExample, /GEOARCHIVES_AUTH_SECRET/);
  assert.match(envExample, /GEOARCHIVES_AGENT_ACCOUNTS/);
  assert.match(envExample, /GEOARCHIVES_AGENT_LOGIN/);
  assert.match(envExample, /GEOARCHIVES_EXECUTIVE_LOGIN/);
  assert.match(auth, /GEOARCHIVES_AGENT_ACCOUNTS/);
  assert.match(auth, /unwrapQuotedEnvValue/);
  assert.match(app, /deriveCaptureScores/);
  assert.doesNotMatch(app, /PostgreSQL|migrations|db:seed|lance le seed/i);
  assert.doesNotMatch(app, /<label>[^<]*<input value=\{capture\.(risk|priority|progress)\}/i);
});
