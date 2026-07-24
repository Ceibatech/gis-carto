import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;
const passwordHashPrefix = "scrypt";

export async function hashPassword(password: string) {
  const salt = randomBytes(18).toString("base64url");
  const derived = await scryptAsync(password, salt, 64);
  return [passwordHashPrefix, salt, derived.toString("base64url")].join("$");
}

export async function verifyPasswordHash(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== passwordHashPrefix || !salt || !hash) return false;

  const derived = await scryptAsync(password, salt, 64);
  const stored = Buffer.from(hash, "base64url");
  if (derived.length !== stored.length) return false;

  return timingSafeEqual(derived, stored);
}
