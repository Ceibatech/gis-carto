import type { CeibaInventoryDashboard } from "./ceiba-inventory-types";
import { hasInventoryPermission, type InventoryActor } from "./inventory-rbac";

// Restreint le dashboard CEIBA aux fiches visibles par l'acteur.
// A appliquer cote serveur avant toute serialisation vers le client:
// le filtrage cote navigateur laisserait les fiches des autres agents
// dans la charge utile RSC.
export function filterCeibaDashboardForActor(
  dashboard: CeibaInventoryDashboard,
  actor: InventoryActor,
): CeibaInventoryDashboard {
  if (hasInventoryPermission(actor.permissions, "inventory.record.read_all")) {
    return dashboard;
  }

  const login = actor.login.toLowerCase();
  const ownRecords = hasInventoryPermission(actor.permissions, "inventory.record.read_own")
    ? dashboard.recentRecords.filter((record) => record.createdBy?.toLowerCase() === login)
    : [];

  const byStatus = ownRecords.reduce(
    (acc, record) => {
      if (record.status === "Nouveau") acc.newRecords += 1;
      if (record.status === "En revue") acc.reviewedRecords += 1;
      if (record.status === "Traité") acc.processedRecords += 1;
      if (record.status === "Bloqué") acc.blockedRecords += 1;
      return acc;
    },
    { newRecords: 0, reviewedRecords: 0, processedRecords: 0, blockedRecords: 0 },
  );

  const communeCounts = new Map<string, number>();
  for (const record of ownRecords) {
    if (!record.commune) continue;
    communeCounts.set(record.commune, (communeCounts.get(record.commune) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecords = ownRecords.filter((record) => new Date(record.createdAt).getTime() >= today.getTime()).length;

  return {
    ...dashboard,
    // Les compteurs par commune sont recalcules sur les seules fiches de
    // l'acteur: reutiliser les agregats globaux revelerait le volume produit
    // par les autres agents.
    activityByCommune: Array.from(communeCounts, ([commune, count]) => ({ commune, count })).sort(
      (left, right) => right.count - left.count || left.commune.localeCompare(right.commune, "fr"),
    ),
    blockedRecords: byStatus.blockedRecords,
    newRecords: byStatus.newRecords,
    processedRecords: byStatus.processedRecords,
    recentRecords: ownRecords,
    reviewedRecords: byStatus.reviewedRecords,
    todayRecords,
    totalRecords: ownRecords.length,
    uniqueCommunes: communeCounts.size,
  };
}
