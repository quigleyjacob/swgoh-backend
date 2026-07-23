// solverRunner.js
// Spawns the Python solver as a child process and returns the result.

import { spawn } from "child_process";
import { once } from "events";
import path from "path";
import { fileURLToPath } from "url";

/**
 * @param {object} payload - same shape as OptimizeParams
 * @returns {Promise<object>} solver result JSON
 */
export const runSolver = async (payload) => {
  const dir = path.dirname(fileURLToPath(import.meta.url))

  const proc = spawn("python3", ["solver.py"], {
    cwd: dir
  });

  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  // Catch broken pipe errors on stdin safely
  proc.stdin.on("error", (err) => {
    console.error("Stdin pipe error:", err.message);
  });

  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();

  const closePromise = once(proc, "close");
  const errorPromise = once(proc, "error").then(([err]) => {
    throw err;
  });

  const [code] = await Promise.race([closePromise, errorPromise]);

  if (code !== 0) {
    throw new Error(`solver.py exited with code ${code}: ${stderr}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse solver output: ${e.message}\n${stdout}`);
  }
};
