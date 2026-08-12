import assert from "node:assert/strict";
import test from "node:test";
import { buildCeibaInventoryReportSeries, countDistinctCartons, summarizeCeibaInventorySnapshot } from "../lib/ceiba-inventory-reports.js";

test("countDistinctCartons counts unique carton IDs and marks degraded status", () => {
  const rows = [
    { carton_id: "C-001", carton_damaged: 1, dossier_damaged: 0 },
    { carton_id: "C-001", carton_damaged: 1, dossier_damaged: 0 },
    { carton_id: "C-002", carton_damaged: 0, dossier_damaged: 1 },
    { carton_id: "", carton_damaged: 1, dossier_damaged: 0 },
    { carton_id: "C-003", carton_damaged: 0, dossier_damaged: 0 },
  ];

  const result = countDistinctCartons(rows);
  assert.equal(result.uniqueCartons, 3);
  assert.equal(result.degradedCartons, 2);
});

test("buildCeibaInventoryReportSeries groups totals by agent and period", () => {
  const rows = [
    { created_by: "alice", created_at: "2026-08-12T09:00:00Z", carton_id: "C-001", carton_damaged: 1, dossier_damaged: 0, status: "processed", commune: "Abidjan" },
    { created_by: "alice", created_at: "2026-08-12T15:00:00Z", carton_id: "C-002", carton_damaged: 0, dossier_damaged: 1, status: "review", commune: "Yamoussoukro" },
    { created_by: "bob", created_at: "2026-08-05T10:00:00Z", carton_id: "C-003", carton_damaged: 1, dossier_damaged: 0, status: "new", commune: "Daloa" },
    { created_by: "bob", created_at: "2026-08-09T11:00:00Z", carton_id: "C-001", carton_damaged: 1, dossier_damaged: 0, status: "processed", commune: "Abidjan" },
  ];

  const daily = buildCeibaInventoryReportSeries(rows, "day");
  const weekly = buildCeibaInventoryReportSeries(rows, "week");
  const monthly = buildCeibaInventoryReportSeries(rows, "month");

  assert.ok(daily.length >= 2);
  assert.ok(weekly.some((item) => item.agentLogin === "alice"));
  assert.ok(monthly.some((item) => item.agentLogin === "bob"));
  assert.equal(summarizeCeibaInventorySnapshot(rows).totalRecords, 4);
});
