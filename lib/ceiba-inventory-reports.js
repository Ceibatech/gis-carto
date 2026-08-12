function normalizeCartonId(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function countDistinctCartons(rows = []) {
  const uniqueCartons = new Set();
  const degradedCartons = new Set();

  for (const row of rows) {
    const cartonId = normalizeCartonId(row?.carton_id);
    if (!cartonId) continue;

    uniqueCartons.add(cartonId);
    const isDamaged = row?.carton_damaged === 1 || row?.carton_damaged === true || row?.carton_damaged === "1";
    if (isDamaged) {
      degradedCartons.add(cartonId);
    }
  }

  return {
    uniqueCartons: uniqueCartons.size,
    degradedCartons: degradedCartons.size,
  };
}

export function summarizeCeibaInventorySnapshot(rows = []) {
  const totalRecords = Array.isArray(rows) ? rows.length : 0;
  const cartonMetrics = countDistinctCartons(rows);
  const degradedDossiers = rows.filter((row) => row?.dossier_damaged === 1 || row?.dossier_damaged === true || row?.dossier_damaged === "1").length;

  return {
    totalRecords,
    uniqueCartons: cartonMetrics.uniqueCartons,
    degradedCartons: cartonMetrics.degradedCartons,
    degradedDossiers,
  };
}

function getPeriodBucket(dateValue, period = "day") {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return { key: "unknown", label: "Inconnu" };
  }

  if (period === "week") {
    const localDate = new Date(date);
    const day = (localDate.getDay() + 6) % 7;
    localDate.setDate(localDate.getDate() - day);
    localDate.setHours(0, 0, 0, 0);
    const start = localDate.toISOString().slice(0, 10);
    const end = new Date(localDate);
    end.setDate(end.getDate() + 6);
    return { key: start, label: `Semaine du ${start}` };
  }

  if (period === "month") {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date) };
  }

  const key = date.toISOString().slice(0, 10);
  return { key, label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date) };
}

export function buildCeibaInventoryReportSeries(rows = [], period = "day") {
  const agentBuckets = new Map();

  for (const row of rows) {
    const createdAt = row?.created_at ?? row?.createdAt ?? null;
    if (!createdAt) continue;

    const agentLogin = String(row?.agentLogin ?? row?.created_by ?? row?.login ?? "inconnu").trim() || "inconnu";
    const agentName = String(row?.agentName ?? row?.created_by ?? row?.name ?? agentLogin).trim() || agentLogin;
    const bucket = getPeriodBucket(createdAt, period);
    const key = `${agentLogin}::${bucket.key}`;

    if (!agentBuckets.has(key)) {
      agentBuckets.set(key, {
        agentLogin,
        agentName,
        periodKey: bucket.key,
        label: bucket.label,
        records: 0,
        uniqueCartons: new Set(),
        degradedCartons: new Set(),
        dossiers: 0,
        degradedDossiers: 0,
      });
    }

    const bucketState = agentBuckets.get(key);
    bucketState.records += 1;

    const cartonId = normalizeCartonId(row?.carton_id);
    if (cartonId) {
      bucketState.uniqueCartons.add(cartonId);
      const isDamaged = row?.carton_damaged === 1 || row?.carton_damaged === true || row?.carton_damaged === "1";
      if (isDamaged) bucketState.degradedCartons.add(cartonId);
    }

    const isDossierDamaged = row?.dossier_damaged === 1 || row?.dossier_damaged === true || row?.dossier_damaged === "1";
    if (isDossierDamaged) {
      bucketState.degradedDossiers += 1;
    }
    bucketState.dossiers += 1;
  }

  return Array.from(agentBuckets.values())
    .map((item) => ({
      agentLogin: item.agentLogin,
      agentName: item.agentName,
      periodKey: item.periodKey,
      label: item.label,
      records: item.records,
      uniqueCartons: item.uniqueCartons.size,
      degradedCartons: item.degradedCartons.size,
      dossiers: item.dossiers,
      degradedDossiers: item.degradedDossiers,
    }))
    .sort((a, b) => {
      if (a.periodKey === b.periodKey) return a.agentLogin.localeCompare(b.agentLogin, "fr");
      return a.periodKey.localeCompare(b.periodKey);
    });
}
