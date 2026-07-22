import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthRole, AuthSession } from "./geoarchives-auth-types";

export const geoArchivesAuthCookieName = "geoarchives_session";

const localDevSecret = "geoarchives-local-dev-secret";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function sessionMaxAgeSeconds() {
  const configured = Number(process.env.GEOARCHIVES_SESSION_MAX_AGE_SECONDS ?? 60 * 60 * 12);
  return Number.isFinite(configured) && configured > 0 ? configured : 60 * 60 * 12;
}

function authSecret() {
  const configured = process.env.GEOARCHIVES_AUTH_SECRET?.trim();
  if (configured) return configured;
  return isProduction() ? "" : localDevSecret;
}

function landingViewForRole(role: AuthRole) {
  return role === "agent" ? "Registre des sites" : "Vue executive";
}

type ConfiguredAccount = {
  login: string;
  name: string;
  password: string;
  role: AuthRole;
};

type AgentAccountEnv = {
  login?: unknown;
  name?: unknown;
  password?: unknown;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unwrapQuotedEnvValue(value: string) {
  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isAgentAccountEnv(value: unknown): value is AgentAccountEnv {
  return typeof value === "object" && value !== null;
}

function agentAccountsFromJson(): ConfiguredAccount[] {
  const configured = unwrapQuotedEnvValue(process.env.GEOARCHIVES_AGENT_ACCOUNTS ?? "");
  if (!configured) return [];

  try {
    const parsed = JSON.parse(configured) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isAgentAccountEnv)
      .map((account) => ({
        login: cleanText(account.login),
        name: cleanText(account.name) || cleanText(account.login) || "Agent registre",
        password: typeof account.password === "string" ? account.password : "",
        role: "agent" as const,
      }))
      .filter((account) => account.login && account.password);
  } catch {
    return [];
  }
}

function configuredAccounts() {
  const useDevDefaults = !isProduction();
  const configuredAgentAccounts = agentAccountsFromJson();
  const legacyAgent = {
    login: process.env.GEOARCHIVES_AGENT_LOGIN?.trim() || (useDevDefaults && configuredAgentAccounts.length === 0 ? "agent" : ""),
    name: process.env.GEOARCHIVES_AGENT_NAME?.trim() || "Agent registre",
    password: process.env.GEOARCHIVES_AGENT_PASSWORD || (useDevDefaults && configuredAgentAccounts.length === 0 ? "agent-registre" : ""),
    role: "agent" as const,
  };

  return [
    {
      login: process.env.GEOARCHIVES_EXECUTIVE_LOGIN?.trim() || (useDevDefaults ? "executif" : ""),
      name: process.env.GEOARCHIVES_EXECUTIVE_NAME?.trim() || "Pilotage national",
      password: process.env.GEOARCHIVES_EXECUTIVE_PASSWORD || (useDevDefaults ? "executif-geoarchives" : ""),
      role: "executive" as const,
    },
    ...configuredAgentAccounts,
    legacyAgent,
  ].filter((account) => account.login && account.password);
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

export function authRuntimeReady() {
  const accounts = configuredAccounts();
  return (
    Boolean(authSecret()) &&
    accounts.some((account) => account.role === "executive") &&
    accounts.some((account) => account.role === "agent")
  );
}

export function authenticateGeoArchivesUser(login: string, password: string): AuthSession | null {
  if (!authRuntimeReady()) return null;

  const normalizedLogin = login.trim().toLowerCase();
  const account = configuredAccounts().find((item) => safeEqualText(item.login.toLowerCase(), normalizedLogin));

  if (!account || !safeEqualText(account.password, password)) {
    return null;
  }

  const issuedAt = Date.now();
  return {
    expiresAt: issuedAt + sessionMaxAgeSeconds() * 1000,
    issuedAt,
    landingView: landingViewForRole(account.role),
    login: account.login,
    name: account.name,
    role: account.role,
  };
}

export function signAuthSession(session: AuthSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signed = signature(payload);
  return signed ? payload + "." + signed : "";
}

export function verifyAuthSession(token?: string | null): AuthSession | null {
  if (!token || !authSecret()) return null;

  const [payload, signed] = token.split(".");
  if (!payload || !signed || !safeEqualText(signature(payload), signed)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (!session.role || !session.login || !session.expiresAt || session.expiresAt <= Date.now()) return null;
    if (session.role !== "agent" && session.role !== "executive") return null;
    return session;
  } catch {
    return null;
  }
}

export function geoArchivesAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds(),
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction(),
  };
}
