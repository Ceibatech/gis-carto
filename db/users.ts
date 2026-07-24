import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuthRole, AuthSession, UserAccount, UserAccountsResponse } from "../lib/geoarchives-auth-types";
import { hashPassword } from "../lib/password-hash";
import { getPool, isDatabaseConfigured } from "./index";

type UserStatus = "active" | "disabled";

type UserRow = RowDataPacket & {
  id: string;
  login: string;
  email: string | null;
  full_name: string;
  role: AuthRole;
  password_hash: string;
  status: UserStatus;
  created_by: string | null;
  last_login_at: string | Date | null;
  created_at: string | Date;
};

export type GeoArchiveUserWithPassword = UserAccount & {
  passwordHash: string;
};

export class GeoArchiveUsersTableMissingError extends Error {
  constructor() {
    super("La table geoarchive_users n'existe pas encore. Exécute sql/004_create_users.sql une seule fois dans MySQL.");
    this.name = "GeoArchiveUsersTableMissingError";
  }
}

const allowedRoles: AuthRole[] = ["admin", "executive", "agent"];

export function isValidUserRole(value: unknown): value is AuthRole {
  return typeof value === "string" && allowedRoles.includes(value as AuthRole);
}

export async function listGeoArchiveUsers(): Promise<UserAccountsResponse> {
  if (!isDatabaseConfigured()) {
    return {
      accounts: [],
      message: "DATABASE_URL n'est pas configuré pour la gestion des comptes.",
      tableReady: false,
    };
  }

  const pool = getPool();
  try {
    const [rows] = await pool.query<UserRow[]>(`
      select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
      from geoarchive_users
      order by field(role, 'admin', 'executive', 'agent'), full_name asc, login asc
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
        message: new GeoArchiveUsersTableMissingError().message,
        tableReady: false,
      };
    }

    throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function findActiveGeoArchiveUserByLogin(login: string): Promise<GeoArchiveUserWithPassword | null> {
  if (!isDatabaseConfigured()) return null;

  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) return null;

  const pool = getPool();
  try {
    const [rows] = await pool.query<UserRow[]>(
      `select id, login, email, full_name, role, password_hash, status, created_by, last_login_at, created_at
       from geoarchive_users
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

export async function touchGeoArchiveUserLogin(id: string) {
  if (!isDatabaseConfigured()) return;

  const pool = getPool();
  try {
    await pool.execute("update geoarchive_users set last_login_at = current_timestamp where id = ?", [id]);
  } catch (error) {
    if (!isMissingUsersTableError(error)) throw error;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function upsertBootstrapGeoArchiveUser(account: { login: string; name: string; password: string; role: AuthRole }) {
  if (!isDatabaseConfigured()) return false;

  const login = normalizeLogin(account.login);
  if (!login || !account.password || !isValidUserRole(account.role)) return false;

  const pool = getPool();
  try {
    const passwordHash = await hashPassword(account.password);
    await pool.execute(
      `insert into geoarchive_users (id, login, email, full_name, role, password_hash, status, created_by)
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

export async function createGeoArchiveUserAccount(input: { login: string; name: string; password: string; role: AuthRole }, actor: AuthSession) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL n'est pas configuré pour enregistrer les comptes utilisateurs.");
  }

  const login = normalizeLogin(input.login);
  const name = input.name.trim();
  const password = input.password.trim();

  if (!login) throw new Error("Le login du compte est obligatoire.");
  if (!name) throw new Error("Le nom du compte est obligatoire.");
  if (!isValidUserRole(input.role)) throw new Error("Le rôle demandé n'est pas valide.");
  if (password.length < 8) throw new Error("Le mot de passe provisoire doit contenir au moins 8 caractères.");

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    await connection.execute(
      `insert into geoarchive_users (id, login, email, full_name, role, password_hash, status, created_by)
       values (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [id, login, emailFromLogin(login), name, input.role, passwordHash, actor.login],
    );

    await writeAccountAudit(connection, actor, id, login, input.role);
    await connection.commit();

    return {
      created: {
        createdAt: new Date().toISOString(),
        createdBy: actor.login,
        email: emailFromLogin(login),
        id,
        lastLoginAt: null,
        login,
        name,
        role: input.role,
        status: "active" as const,
      },
      list: await listGeoArchiveUsers(),
    };
  } catch (error) {
    await connection.rollback();
    if (isMissingUsersTableError(error)) throw new GeoArchiveUsersTableMissingError();
    if (isDuplicateLoginError(error)) throw new Error("Ce login existe déjà dans la base utilisateurs.");
    throw error;
  } finally {
    connection.release();
    await pool.end().catch(() => undefined);
  }
}

function toUserAccount(row: UserRow): UserAccount {
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

function toUserWithPassword(row: UserRow): GeoArchiveUserWithPassword {
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

async function writeAccountAudit(connection: PoolConnection, actor: AuthSession, entityId: string, login: string, role: AuthRole) {
  await connection.execute(
    `insert into audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, description, metadata)
     values (?, ?, ?, 'user_account_created', 'geoarchive_user', ?, ?, ?)`,
    [
      randomUUID(),
      actor.name,
      actor.role,
      entityId,
      `Compte ${login} créé avec le rôle ${role}`,
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
