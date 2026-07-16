import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2] ?? "dev";
const args = process.argv.slice(3);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const cli = join(root, "node_modules", "vinext", "dist", "cli.js");

const child = spawn(process.execPath, [cli, command, ...args], {
  cwd: root,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 0);
});
