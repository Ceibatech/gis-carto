function normalizeCartonId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeReferenceToken(value, fallback = "BOX") {
  return String(value ?? fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

export function buildCeibaBoxReference(userLogin, cartonId) {
  const normalizedUser = normalizeReferenceToken(userLogin, "USER");
  const normalizedCarton = normalizeReferenceToken(cartonId, "BOX");
  return `${normalizedUser}-${normalizedCarton}`;
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

    const cartonId = normalizeCartonId(row?.carton_id ?? row?.cartonId);
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

export function normalizeCeibaReportStatus(report = {}) {
  const ok = Boolean(report?.ok);
  const reason = typeof report?.reason === "string" ? report.reason.trim() : "";

  if (ok) {
    return {
      status: "sent",
      label: "Envoyé",
      error: null,
      requiresRetry: false,
      isOperational: true,
    };
  }

  return {
    status: "failed",
    label: "Échec",
    error: reason || "Erreur d'envoi",
    requiresRetry: true,
    isOperational: true,
  };
}

export function buildCeibaProductionMetrics(rows = [], now = new Date()) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const baseDate = new Date(now);

  const startOfToday = new Date(baseDate);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(baseDate);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

  const byAgent = new Map();
  const activeAgents = new Set();

  for (const row of normalizedRows) {
    const createdAt = row?.createdAt ?? row?.created_at ?? null;
    const createdDate = createdAt ? new Date(createdAt) : null;
    if (!createdDate || Number.isNaN(createdDate.getTime())) continue;

    const agent = String(row?.agent ?? row?.createdBy ?? row?.created_by ?? row?.agentLogin ?? "inconnu").trim() || "inconnu";
    activeAgents.add(agent);

    const quantityValue = Number(row?.cartonsCount ?? row?.cartonCount ?? row?.quantity ?? row?.totalCartons ?? 0);
    const quantity = Number.isFinite(quantityValue) ? quantityValue : 0;
    const cartonId = normalizeCartonId(row?.cartonId ?? row?.carton_id);

    const current = byAgent.get(agent) ?? { agent, today: 0, week: 0, month: 0, total: 0, cartonIds: new Set() };

    if (quantity > 0) {
      if (cartonId && current.cartonIds.has(cartonId)) {
        byAgent.set(agent, current);
        continue;
      }

      if (cartonId) {
        current.cartonIds.add(cartonId);
      }

      current.total += quantity;
      if (createdDate >= startOfToday) current.today += quantity;
      if (createdDate >= startOfWeek) current.week += quantity;
      if (createdDate >= startOfMonth) current.month += quantity;
    } else if (cartonId) {
      if (!current.cartonIds.has(cartonId)) {
        current.cartonIds.add(cartonId);
        current.total += 1;
        if (createdDate >= startOfToday) current.today += 1;
        if (createdDate >= startOfWeek) current.week += 1;
        if (createdDate >= startOfMonth) current.month += 1;
      }
    }

    byAgent.set(agent, current);
  }

  const byAgentList = Array.from(byAgent.values())
    .sort((a, b) => b.total - a.total || a.agent.localeCompare(b.agent, "fr"))
    .map((item) => ({
      agent: item.agent,
      today: Number(item.today) || 0,
      week: Number(item.week) || 0,
      month: Number(item.month) || 0,
      total: Number(item.total) || 0,
    }));

  const todayProduction = byAgentList.reduce((sum, item) => sum + Number(item.today || 0), 0);
  const weekProduction = byAgentList.reduce((sum, item) => sum + Number(item.week || 0), 0);
  const monthProduction = byAgentList.reduce((sum, item) => sum + Number(item.month || 0), 0);
  const totalProduction = byAgentList.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return {
    todayProduction: Number(todayProduction) || 0,
    weekProduction: Number(weekProduction) || 0,
    monthProduction: Number(monthProduction) || 0,
    totalProduction: Number(totalProduction) || 0,
    activeAgents: Number(activeAgents.size) || 0,
    byAgent: byAgentList,
  };
}
