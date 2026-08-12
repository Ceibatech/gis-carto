import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCeibaReportStatus } from "../lib/ceiba-inventory-reports.js";

test("normalizeCeibaReportStatus keeps failure details and retryability without deleting production data", () => {
  const result = normalizeCeibaReportStatus({ ok: false, reason: "Resend timeout" });

  assert.equal(result.status, "failed");
  assert.equal(result.label, "Échec");
  assert.equal(result.error, "Resend timeout");
  assert.equal(result.requiresRetry, true);
  assert.equal(result.isOperational, true);
});

test("normalizeCeibaReportStatus marks successful delivery cleanly for supervised admin views", () => {
  const result = normalizeCeibaReportStatus({ ok: true, reason: "Email envoyé" });

  assert.equal(result.status, "sent");
  assert.equal(result.label, "Envoyé");
  assert.equal(result.error, null);
  assert.equal(result.requiresRetry, false);
  assert.equal(result.isOperational, true);
});
