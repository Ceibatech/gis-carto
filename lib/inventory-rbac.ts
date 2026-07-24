import type { CeibaInventoryRole, CeibaInventorySession } from "./ceiba-inventory-auth-types";

export const inventoryPermissions = [
  "inventory.dashboard.view",
  "inventory.record.create",
  "inventory.record.read_own",
  "inventory.record.read_all",
  "inventory.record.update_own",
  "inventory.record.update_all",
  "inventory.record.submit",
  "inventory.record.review",
  "inventory.record.approve",
  "inventory.record.reject",
  "inventory.record.export",
  "inventory.users.manage",
  "inventory.roles.manage",
  "inventory.audit.view",
] as const;

export type InventoryPermission = (typeof inventoryPermissions)[number];

export type InventoryAppRole = "AGENT" | "SUPERVISEUR" | "RESPONSABLE_CEIBA" | "ADMIN_CEIBA";

export const rolePermissionMatrix: Record<InventoryAppRole, InventoryPermission[]> = {
  AGENT: [
    "inventory.dashboard.view",
    "inventory.record.create",
    "inventory.record.read_own",
    "inventory.record.update_own",
    "inventory.record.submit",
  ],
  SUPERVISEUR: [
    "inventory.dashboard.view",
    "inventory.record.read_all",
    "inventory.record.review",
    "inventory.record.approve",
    "inventory.record.reject",
  ],
  RESPONSABLE_CEIBA: [
    "inventory.dashboard.view",
    "inventory.record.read_all",
    "inventory.record.update_all",
    "inventory.record.review",
    "inventory.record.approve",
    "inventory.record.reject",
    "inventory.record.export",
    "inventory.audit.view",
  ],
  ADMIN_CEIBA: [...inventoryPermissions],
};

export function mapSessionRoleToInventoryRole(role: CeibaInventoryRole | "root-admin"): InventoryAppRole {
  if (role === "root-admin") return "ADMIN_CEIBA";
  if (role === "admin") return "ADMIN_CEIBA";
  if (role === "supervisor") return "SUPERVISEUR";
  return "AGENT";
}

export function permissionsForRole(role: InventoryAppRole) {
  return rolePermissionMatrix[role];
}

export function permissionsForSession(session: CeibaInventorySession | null, isRootAdmin = false): InventoryPermission[] {
  if (!session && !isRootAdmin) return [];
  const mapped = mapSessionRoleToInventoryRole(isRootAdmin ? "root-admin" : (session?.role ?? "operator"));
  return permissionsForRole(mapped);
}

export function hasInventoryPermission(permissions: InventoryPermission[], permission: InventoryPermission) {
  return permissions.includes(permission);
}

export function hasAnyInventoryPermission(permissions: InventoryPermission[], required: InventoryPermission[]) {
  return required.some((permission) => permissions.includes(permission));
}

export type InventoryActor = {
  login: string;
  name: string;
  ceibaRole: CeibaInventoryRole | "root-admin";
  appRole: InventoryAppRole;
  permissions: InventoryPermission[];
};

export function buildInventoryActor(input: { login: string; name: string; role: CeibaInventoryRole | "root-admin" }): InventoryActor {
  const appRole = mapSessionRoleToInventoryRole(input.role);
  return {
    appRole,
    ceibaRole: input.role,
    login: input.login,
    name: input.name,
    permissions: permissionsForRole(appRole),
  };
}
