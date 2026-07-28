import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT || "3000";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = resolve(repositoryRoot, "mainfile", "alab-system");
const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next", {
  paths: [appDirectory],
});
const child = spawn(
  process.execPath,
  [
    nextCli,
    "start",
    "--hostname",
    "0.0.0.0",
    "--port",
    port,
  ],
  {
    cwd: appDirectory,
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Unable to start the ALAB web server:", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
