import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type {
  CeibaInventoryRole,
  CeibaInventorySession,
  CeibaInventoryUserAccount,
  CeibaInventoryUserAccountsResponse,
} from "../lib/ceiba-inventory-auth-types";
import { hashPassword } from "../lib/password-hash";
import { getPool, isDatabaseConfigured } from "./index";

type UserStatus = "active" | "disabled";

type CeibaUserRow = RowDataPacket & {
  id: string;
  login: string;
  email: string | null;
  full_name: string;
  role: CeibaInventoryRole;
  password_hash: string;
  status: UserStatus;
  created_by: string | null;
  last_login_at: string | Date | null;
  created_at: string | Date;
};

export type CeibaInventoryUserWithPassword = CeibaInventoryUserAccount & {
  passwordHash: string;
};

export class CeibaInventoryUsersTableMissingError extends Error {
  constructor() {
    super("La table ceiba_inventory_users n'existe pas encore. Exécute sql/005_create_ceiba_inventory.sql une seule fois dans MySQL.");
    this.name = "CeibaInventoryUsersTableMissingError";
  }
}

const allowedRoles: CeibaInventoryRole[] = ["admin", "supervisor", "operator"];

export function isValidCeibaInventoryRole(value: unknown): value is CeibaInventoryRole {
  return typeof value === "string" && allowedRoles.includes(value as CeibaInventoryRole);
}

export async function listCeibaInventoryUsers(): Promise<CeibaInventoryUserAccountsResponse> {
  if (!isDatabaseConfigured()) {
    return {
      accounts: [],
      message: "DATABASE_URL n'est pas configuré pour les comptes CEIBA.",
      tableReady: false,
    };
  }

  const pool = getPool();
  try {
    const [rows] = await pool.query<CeibaUserRow[]>(`
      select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
      from ceiba_inventory_users
      order by field(role, 'admin', 'supervisor', 'operator'), full_name asc, login asc
    `);

    return {
      accounts: rows.map(toUserAccount),
      message: null,
      tableReady: true,
    };
  } catch (error) {
    if (isMissingUsersTableError(error)) {
      return {
        accounts: [],
        message: new CeibaInventoryUsersTableMissingError().message,
        tableReady: false,
      };
    }

    throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function findActiveCeibaInventoryUserByLogin(login: string): Promise<CeibaInventoryUserWithPassword | null> {
  if (!isDatabaseConfigured()) return null;

  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) return null;

  const pool = getPool();
  try {
    const [rows] = await pool.query<CeibaUserRow[]>(
      `select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
       from ceiba_inventory_users
       where lower(login) = ? and status = 'active'
       limit 1`,
      [normalizedLogin],
    );

    return rows[0] ? toUserWithPassword(rows[0]) : null;
  } catch (error) {
    if (isMissingUsersTableError(error)) return null;
    throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function touchCeibaInventoryUserLogin(id: string) {
  if (!isDatabaseConfigured()) return;

  const pool = getPool();
  try {
    await pool.execute("update ceiba_inventory_users set last_login_at = current_timestamp where id = ?", [id]);
  } catch (error) {
    if (!isMissingUsersTableError(error)) throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function upsertBootstrapCeibaInventoryUser(account: { login: string; name: string; password: string; role: CeibaInventoryRole }) {
  if (!isDatabaseConfigured()) return false;

  const login = normalizeLogin(account.login);
  if (!login || !account.password || !isValidCeibaInventoryRole(account.role)) return false;

  const pool = getPool();
  try {
    const passwordHash = await hashPassword(account.password);
    await pool.execute(
      `insert into ceiba_inventory_users (id, login, email, full_name, role, password_hash, status, created_by)
       values (?, ?, ?, ?, ?, ?, 'active', 'env-bootstrap')
       on duplicate key update
         email = values(email),
         full_name = values(full_name),
         role = values(role),
         password_hash = values(password_hash),
         status = 'active',
         updated_at = current_timestamp`,
      [randomUUID(), login, emailFromLogin(login), account.name.trim() || login, account.role, passwordHash],
    );
    return true;
  } catch (error) {
    if (isMissingUsersTableError(error)) return false;
    throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function createCeibaInventoryUserAccount(input: { login: string; name: string; password: string; role: CeibaInventoryRole }, actor: { login: string; name: string; role: string }) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL n'est pas configuré pour enregistrer les comptes CEIBA.");
  }

  const login = normalizeLogin(input.login);
  const name = input.name.trim();
  const password = input.password.trim();

  if (!login) throw new Error("Le login du compte est obligatoire.");
  if (!name) throw new Error("Le nom du compte est obligatoire.");
  if (!isValidCeibaInventoryRole(input.role)) throw new Error("Le rôle CEIBA demandé n'est pas valide.");
  if (password.length < 8) throw new Error("Le mot de passe provisoire doit contenir au moins 8 caractères.");

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    await connection.execute(
      `insert into ceiba_inventory_users (id, login, email, full_name, role, password_hash, status, created_by)
       values (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [id, login, emailFromLogin(login), name, input.role, passwordHash, actor.login],
    );

    await writeAccountAudit(connection, actor, id, login, input.role);
    await connection.commit();

    return await listCeibaInventoryUsers();
  } catch (error) {
    await connection.rollback();
    if (isMissingUsersTableError(error)) throw new CeibaInventoryUsersTableMissingError();
    if (isDuplicateLoginError(error)) throw new Error("Ce login CEIBA existe déjà.");
    throw error;
  } finally {
    connection.release();
    await pool.end().catch(() => undefined);
  }
}

export async function updateCeibaInventoryUserAccount(
  input: { id: string; role?: CeibaInventoryRole; status?: UserStatus },
  actor: { login: string; name: string; role: string },
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL n'est pas configuré pour mettre à jour les comptes CEIBA.");
  }

  if (!input.id.trim()) throw new Error("Identifiant utilisateur manquant.");
  if (input.role && !isValidCeibaInventoryRole(input.role)) throw new Error("Role CEIBA invalide.");
  if (input.status && input.status !== "active" && input.status !== "disabled") throw new Error("Statut utilisateur invalide.");

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<CeibaUserRow[]>(
      `select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
       from ceiba_inventory_users
       where id = ?
       limit 1`,
      [input.id],
    );

    const current = rows[0];
    if (!current) throw new Error("Compte CEIBA introuvable.");

    const nextRole = input.role ?? current.role;
    const nextStatus = input.status ?? current.status;

    await enforceLastAdminGuard(connection, {
      actorLogin: actor.login,
      targetLogin: current.login,
      currentRole: current.role,
      nextRole,
      currentStatus: current.status,
      nextStatus,
    });

    await connection.execute(
      `update ceiba_inventory_users
       set role = ?, status = ?, updated_at = current_timestamp
       where id = ?`,
      [nextRole, nextStatus, input.id],
    );

    await connection.execute(
      `insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, metadata)
       values (?, ?, ?, 'ceiba_inventory_user_updated', 'ceiba_inventory_user', ?, ?, ?)`,
      [
        randomUUID(),
        actor.name,
        actor.role,
        input.id,
        `Compte CEIBA ${current.login} mis a jour`,
        JSON.stringify({ previous: { role: current.role, status: current.status }, next: { role: nextRole, status: nextStatus } }),
      ],
    );

    await connection.commit();
    return await listCeibaInventoryUsers();
  } catch (error) {
    await connection.rollback();
    if (isMissingUsersTableError(error)) throw new CeibaInventoryUsersTableMissingError();
    throw error;
  } finally {
    connection.release();
    await pool.end().catch(() => undefined);
  }
}

export async function resetCeibaInventoryUserPassword(
  input: { id: string; password: string },
  actor: { login: string; name: string; role: string },
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL n'est pas configuré pour reinitialiser les mots de passe CEIBA.");
  }

  if (!input.id.trim()) throw new Error("Identifiant utilisateur manquant.");
  const password = input.password.trim();
  if (password.length < 8) throw new Error("Le nouveau mot de passe doit contenir au moins 8 caracteres.");

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<CeibaUserRow[]>(
      `select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
       from ceiba_inventory_users
       where id = ?
       limit 1`,
      [input.id],
    );
    const current = rows[0];
    if (!current) throw new Error("Compte CEIBA introuvable.");

    const passwordHash = await hashPassword(password);
    await connection.execute(
      `update ceiba_inventory_users
       set password_hash = ?, updated_at = current_timestamp
       where id = ?`,
      [passwordHash, input.id],
    );

    await connection.execute(
      `insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, metadata)
       values (?, ?, ?, 'ceiba_inventory_password_reset', 'ceiba_inventory_user', ?, ?, ?)`,
      [
        randomUUID(),
        actor.name,
        actor.role,
        input.id,
        `Mot de passe CEIBA reinitialise pour ${current.login}`,
        JSON.stringify({ login: current.login }),
      ],
    );

    await connection.commit();
    return { ok: true };
  } catch (error) {
    await connection.rollback();
    if (isMissingUsersTableError(error)) throw new CeibaInventoryUsersTableMissingError();
    throw error;
  } finally {
    connection.release();
    await pool.end().catch(() => undefined);
  }
}

function toUserAccount(row: CeibaUserRow): CeibaInventoryUserAccount {
  return {
    createdAt: toIso(row.created_at),
    createdBy: row.created_by,
    email: row.email,
    id: row.id,
    lastLoginAt: row.last_login_at ? toIso(row.last_login_at) : null,
    login: row.login,
    name: row.full_name,
    role: row.role,
    status: row.status,
  };
}

function toUserWithPassword(row: CeibaUserRow): CeibaInventoryUserWithPassword {
  return {
    ...toUserAccount(row),
    passwordHash: row.password_hash,
  };
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

function emailFromLogin(login: string) {
  return login.includes("@") ? login : null;
}

function toIso(value: string | Date) {
  return new Date(value).toISOString();
}

async function writeAccountAudit(connection: PoolConnection, actor: { login: string; name: string; role: string }, entityId: string, login: string, role: CeibaInventoryRole) {
  await connection.execute(
    `insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, metadata)
     values (?, ?, ?, 'ceiba_inventory_user_created', 'ceiba_inventory_user', ?, ?, ?)`,
    [
      randomUUID(),
      actor.name,
      actor.role,
      entityId,
      `Compte CEIBA ${login} créé avec le rôle ${role}`,
      JSON.stringify({ login, role }),
    ],
  );
}

async function enforceLastAdminGuard(
  connection: PoolConnection,
  input: {
    actorLogin: string;
    targetLogin: string;
    currentRole: CeibaInventoryRole;
    nextRole: CeibaInventoryRole;
    currentStatus: UserStatus;
    nextStatus: UserStatus;
  },
) {
  const isSelfTarget = input.actorLogin.trim().toLowerCase() === input.targetLogin.trim().toLowerCase();
  if (!isSelfTarget) return;

  const removesAdminRole = input.currentRole === "admin" && input.nextRole !== "admin";
  const disablesCurrentAdmin = input.currentRole === "admin" && input.currentStatus === "active" && input.nextStatus === "disabled";
  if (!removesAdminRole && !disablesCurrentAdmin) return;

  const [rows] = await connection.query<Array<RowDataPacket & { total: number }>>(
    `select count(*) as total from ceiba_inventory_users where role = 'admin' and status = 'active'`,
  );

  const activeAdminCount = Number(rows[0]?.total ?? 0);
  if (activeAdminCount <= 1) {
    throw new Error("Operation refusee: vous ne pouvez pas supprimer votre dernier acces administrateur.");
  }
}

function isMissingUsersTableError(error: unknown) {
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === "ER_NO_SUCH_TABLE" || candidate.errno === 1146;
}

function isDuplicateLoginError(error: unknown) {
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}
