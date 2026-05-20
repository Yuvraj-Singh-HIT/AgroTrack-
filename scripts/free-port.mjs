/**
 * Frees a TCP port before starting the dev server (fixes EADDRINUSE on Windows/macOS/Linux).
 * Usage: node scripts/free-port.mjs 9002
 */
import { execSync } from "node:child_process";

const port = Number(process.argv[2] ?? "9002");
if (!Number.isFinite(port)) {
  console.error("Usage: node scripts/free-port.mjs <port>");
  process.exit(1);
}

function freeOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed port ${port} (stopped PID ${pid})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port not in use */
  }
}

function freeOnUnix() {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" });
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
        console.log(`Freed port ${port} (stopped PID ${pid})`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* port not in use */
  }
}

if (process.platform === "win32") {
  freeOnWindows();
} else {
  freeOnUnix();
}
