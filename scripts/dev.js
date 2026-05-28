import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const shell = isWindows;

function run(name, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell,
    env: { ...process.env },
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`\n${name} exited with code ${code}.`);
    }
  });

  return child;
}

console.log("Starting School Manager backend on http://localhost:5001 ...");
// Use nodemon in dev so the server auto-restarts when any server file changes.
const nodemonArgs = [
  "nodemon",
  "--watch", "server",
  "--ext",   "js,json",
  "--delay", "300ms",
  "server/server.js",
];
const backend = run("backend", isWindows ? "npx.cmd" : "npx", nodemonArgs);

setTimeout(() => {
  console.log("Starting School Manager frontend on http://localhost:5173 ...");
  run("frontend", isWindows ? "npx.cmd" : "npx", ["vite", "--config", "client/vite.config.js"]);
}, 1500);

function shutdown() {
  backend.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
