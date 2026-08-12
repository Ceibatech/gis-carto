import assert from "node:assert/strict";
import test from "node:test";
import { buildCeibaProductionMetrics } from "../lib/ceiba-inventory-reports.js";

test("buildCeibaProductionMetrics uses unique cartons and real time windows", () => {
  const now = new Date("2026-08-12T12:00:00Z");

  const rows = [
    { createdAt: "2026-08-12T09:00:00Z", createdBy: "alice", cartonId: "C-001" },
    { createdAt: "2026-08-12T09:30:00Z", createdBy: "alice", cartonId: "C-001" },
    { createdAt: "2026-08-12T14:00:00Z", createdBy: "alice", cartonId: "C-002" },
    { createdAt: "2026-08-10T11:00:00Z", createdBy: "bob", cartonId: "C-003" },
    { createdAt: "2026-08-09T16:00:00Z", createdBy: "bob", cartonId: "C-004" },
    { createdAt: "2026-07-29T08:00:00Z", createdBy: "bob", cartonId: "C-005" },
  ];

  const metrics = buildCeibaProductionMetrics(rows, now);

  assert.equal(metrics.todayProduction, 2);
  assert.equal(metrics.weekProduction, 3);
  assert.equal(metrics.monthProduction, 4);
  assert.equal(metrics.totalProduction, 5);
  assert.equal(metrics.activeAgents, 2);
  assert.equal(metrics.byAgent[0].agent, "bob");
  assert.equal(metrics.byAgent[0].total, 3);
  assert.equal(metrics.byAgent[1].agent, "alice");
  assert.equal(metrics.byAgent[1].today, 2);
});

test("buildCeibaProductionMetrics does not double count the same carton when quantities are present", () => {
  const now = new Date("2026-08-12T12:00:00Z");

  const rows = [
    { createdAt: "2026-08-12T08:00:00Z", createdBy: "alice", cartonId: "C-001", cartonsCount: 1 },
    { createdAt: "2026-08-12T09:00:00Z", createdBy: "alice", cartonId: "C-001", cartonsCount: 1 },
    { createdAt: "2026-08-12T09:30:00Z", createdBy: "alice", cartonId: "C-002", cartonsCount: 1 },
    { createdAt: "2026-08-10T10:00:00Z", createdBy: "bob", cartonId: "C-003", cartonsCount: 1 },
  ];

  const metrics = buildCeibaProductionMetrics(rows, now);

  assert.equal(metrics.todayProduction, 2);
  assert.equal(metrics.weekProduction, 3);
  assert.equal(metrics.monthProduction, 3);
  assert.equal(metrics.totalProduction, 3);
  assert.equal(metrics.byAgent[0].agent, "alice");
  assert.equal(metrics.byAgent[0].today, 2);
});
