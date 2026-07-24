export type CeibaInventoryRole = "admin" | "operator" | "supervisor";

export type CeibaInventorySession = {
  role: CeibaInventoryRole;
  login: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
};

export type CeibaInventoryUserAccount = {
  id: string;
  login: string;
  email: string | null;
  name: string;
  role: CeibaInventoryRole;
  status: "active" | "disabled";
  createdBy: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type CeibaInventoryUserAccountsResponse = {
  tableReady: boolean;
  accounts: CeibaInventoryUserAccount[];
  message: string | null;
};

export type CeibaInventoryLoginResponse =
  | { session: CeibaInventorySession }
  | { message: string };
