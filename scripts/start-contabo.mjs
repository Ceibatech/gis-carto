import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const port = process.env.PORT?.trim() || "4100";
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 0);
});
