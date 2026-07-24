import { createHmac, timingSafeEqual } from "node:crypto";
import { findActiveCeibaInventoryUserByLogin, touchCeibaInventoryUserLogin, upsertBootstrapCeibaInventoryUser } from "../db/ceiba-users";
import type { CeibaInventoryRole, CeibaInventorySession } from "./ceiba-inventory-auth-types";
import { verifyPasswordHash } from "./password-hash";

export const ceibaInventoryAuthCookieName = "ceiba_inventory_session";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function sessionMaxAgeSeconds() {
  const configured = Number(process.env.CEIBA_INVENTORY_SESSION_MAX_AGE_SECONDS ?? 60 * 60 * 12);
  return Number.isFinite(configured) && configured > 0 ? configured : 60 * 60 * 12;
}

function authSecret() {
  const configured = process.env.GEOARCHIVES_AUTH_SECRET?.trim();
  return configured || (!isProduction() ? "ceiba-inventory-local-dev-secret" : "");
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(payload: string) {
  const secret = authSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSession(account: { login: string; name: string; role: CeibaInventoryRole }): CeibaInventorySession {
  const issuedAt = Date.now();
  return {
    expiresAt: issuedAt + sessionMaxAgeSeconds() * 1000,
    issuedAt,
    login: account.login,
    name: account.name,
    role: account.role,
  };
}

function configuredAdminAccount() {
  const useDevDefaults = !isProduction();
  return {
    login: process.env.CEIBA_INVENTORY_ADMIN_LOGIN?.trim() || (useDevDefaults ? "ceibac-admin" : ""),
    name: process.env.CEIBA_INVENTORY_ADMIN_NAME?.trim() || "Administration CEIBAC",
    password: process.env.CEIBA_INVENTORY_ADMIN_PASSWORD || (useDevDefaults ? "ceibac-admin-2026" : ""),
    role: "admin" as const,
  };
}

export async function authenticateCeibaInventoryUser(login: string, password: string): Promise<CeibaInventorySession | null> {
  if (!authSecret()) return null;

  const normalizedLogin = login.trim().toLowerCase();
  if (!normalizedLogin || !password) return null;

  const dbUser = await findActiveCeibaInventoryUserByLogin(normalizedLogin);
  if (dbUser && await verifyPasswordHash(password, dbUser.passwordHash)) {
    await touchCeibaInventoryUserLogin(dbUser.id).catch(() => undefined);
    return createSession({ login: dbUser.login, name: dbUser.name, role: dbUser.role });
  }

  const admin = configuredAdminAccount();
  if (admin.login && admin.password && safeEqualText(admin.login.toLowerCase(), normalizedLogin) && safeEqualText(admin.password, password)) {
    await upsertBootstrapCeibaInventoryUser(admin).catch(() => undefined);
    return createSession(admin);
  }

  return null;
}

export function signCeibaInventorySession(session: CeibaInventorySession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signed = signature(payload);
  return signed ? payload + "." + signed : "";
}

export function verifyCeibaInventorySession(token?: string | null): CeibaInventorySession | null {
  if (!token || !authSecret()) return null;

  const [payload, signed] = token.split(".");
  if (!payload || !signed || !safeEqualText(signature(payload), signed)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CeibaInventorySession;
    if (!session.role || !session.login || !session.expiresAt || session.expiresAt <= Date.now()) return null;
    if (session.role !== "admin" && session.role !== "operator" && session.role !== "supervisor") return null;
    return session;
  } catch {
    return null;
  }
}

export function ceibaInventoryAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds(),
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction(),
  };
}
