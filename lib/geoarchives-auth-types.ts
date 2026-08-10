export type AuthRole = "admin" | "executive" | "agent";
export type UserStartApplication = "geoarchives" | "inventory";

export type AuthSession = {
  startApplication: UserStartApplication;
  role: AuthRole;
  login: string;
  name: string;
  landingView: string;
  issuedAt: number;
  expiresAt: number;
};

export type UserAccount = {
  startApplication: UserStartApplication;
  id: string;
  login: string;
  email: string | null;
  name: string;
  role: AuthRole;
  status: "active" | "disabled";
  createdBy: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type UserAccountsResponse = {
  tableReady: boolean;
  accounts: UserAccount[];
  message: string | null;
};

export type LoginResponse =
  | { session: AuthSession }
  | { message: string };
