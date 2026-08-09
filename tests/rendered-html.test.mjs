import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { databaseCodeMaxLength, makeDatabaseCode } from "../lib/database-code.js";

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

test("keeps the database contract on MySQL tables", async () => {
  const [sql, packageJson, dbIndex, geoarchivesDb, app, apiUrl, auth, envExample, serverProxy] = await Promise.all([
    readFile(new URL("../sql/001_create_schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/geoarchives.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/GeoArchivesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/api-url.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/geoarchives-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../lib/geoarchives-server-proxy.ts", import.meta.url), "utf8"),
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
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /httpOnly: true/);
  assert.match(envExample, /GEOARCHIVES_AUTH_SECRET/);
  assert.match(envExample, /GEOARCHIVES_AGENT_ACCOUNTS/);
  assert.match(envExample, /GEOARCHIVES_AGENT_LOGIN/);
  assert.match(envExample, /GEOARCHIVES_EXECUTIVE_LOGIN/);
  assert.match(auth, /GEOARCHIVES_AGENT_ACCOUNTS/);
  assert.match(auth, /unwrapQuotedEnvValue/);
  assert.match(app, /deriveCaptureScores/);
  assert.match(
    geoarchivesDb,
    /insert into administrative_territories[\s\S]*?on duplicate key update/i,
  );
  const siteUpsert = geoarchivesDb.match(/insert into archive_sites[\s\S]*?on duplicate key update/i)?.[0];
  assert.ok(siteUpsert, "L'enregistrement des fiches doit rester idempotent.");
  assert.equal(siteUpsert.match(/\?/g)?.length, 40, "L'UPSERT archive_sites doit fournir exactement 40 valeurs.");
  assert.match(
    apiUrl,
    /defaultGeoArchivesApiBaseUrl\s*=\s*"https:\/\/api\.geoarchiv\.ceiba-analytics\.com"/,
  );
  assert.match(serverProxy, /requestUrl\.host\s*===\s*new URL\(baseUrl\)\.host/);
  assert.doesNotMatch(app, /PostgreSQL|migrations|db:seed|lance le seed/i);
  assert.doesNotMatch(app, /<label>[^<]*<input value=\{capture\.(risk|priority|progress)\}/i);
});

test("keeps generated MySQL codes within VARCHAR(40)", () => {
  const parentId = "6a832e5e-1423-4932-b9bc-9081abcdef01";

  for (const prefix of ["ORG", "DISTRICT", "REGION", "DEPARTMENT", "SUB_PREFECTURE", "COMMUNE"]) {
    const code = makeDatabaseCode(prefix, `${parentId}-Abobo`);
    assert.ok(code.length <= databaseCodeMaxLength, `${prefix} produit un code trop long: ${code}`);
  }

  assert.equal(
    makeDatabaseCode("DEPARTMENT", `${parentId}-Abobo`),
    "DEPARTMENT-6A832E5E-1423-4932-B9BC-9081A",
  );
});
