export type AuthRole = "executive" | "agent";

export type AuthSession = {
  role: AuthRole;
  login: string;
  name: string;
  landingView: string;
  issuedAt: number;
  expiresAt: number;
};

export type LoginResponse =
  | { session: AuthSession }
  | { message: string };
