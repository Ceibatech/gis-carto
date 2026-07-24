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

function isMissingUsersTableError(error: unknown) {
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === "ER_NO_SUCH_TABLE" || candidate.errno === 1146;
}

function isDuplicateLoginError(error: unknown) {
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}
