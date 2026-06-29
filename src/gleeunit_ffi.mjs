import { readFileSync } from "node:fs";
import { Result$Ok, Result$Error } from "./gleam.mjs";
import * as reporting from "./gleeunit/internal/reporting.mjs";

export function read_file(path) {
  try {
    return Result$Ok(readFileSync(path));
  } catch {
    return Result$Error(undefined);
  }
}

async function* gleamFiles(directory) {
  for (let entry of await read_dir(directory)) {
    let path = join_path(directory, entry);
    if (path.endsWith(".gleam")) {
      yield path;
    } else {
      try {
        yield* gleamFiles(path);
      } catch (error) {
        // Could not read directory, assume it's a file
      }
    }
  }
}

async function readRootPackageName() {
  let toml = await async_read_file("gleam.toml", "utf-8");
  for (let line of toml.split("\n")) {
    let matches = line.match(/\s*name\s*=\s*"([a-z][a-z0-9_]*)"/); // Match regexp in compiler-cli/src/new.rs in validate_name()
    if (matches) return matches[1];
  }
  throw new Error("Could not determine package name from gleam.toml");
}

export async function main() {
  let state = reporting.new_state();
  let timeout = parseTimeout(readTimeoutEnv(), DEFAULT_TIMEOUT);

  let packageName = await readRootPackageName();
  let dist = `../${packageName}/`;

  for await (let path of await gleamFiles("test")) {
    let js_path = path.slice("test/".length).replace(".gleam", ".mjs");
    let module = await import(join_path(dist, js_path));
    for (let fnName of Object.keys(module)) {
      if (!fnName.endsWith("_test")) continue;
      try {
        await runWithTimeout(() => module[fnName](), timeout);
        state = reporting.test_passed(state);
      } catch (error) {
        let moduleName = js_path.slice(0, -4);
        if (isTimeout(error)) {
          state = reporting.test_timed_out(state, moduleName, fnName, timeout);
        } else {
          state = reporting.test_failed(state, moduleName, fnName, error);
        }
      }
    }
  }

  const status = reporting.finished(state);
  await exit(status);
}

export function crash(message) {
  throw new Error(message);
}

// Timeout sentinel — a unique object so `isTimeout` can identify it.
const TIMEOUT_SENTINEL = Object.freeze({ __gleeunit_timeout__: true });

/** Returns true if `error` is the timeout sentinel thrown by `runWithTimeout`. */
export function isTimeout(error) {
  return error === TIMEOUT_SENTINEL;
}

const DEFAULT_TIMEOUT = 5000;

function readTimeoutEnv() {
  try {
    if (globalThis.Deno) return Deno.env.get("GLEEUNIT_TIMEOUT");
    return process.env.GLEEUNIT_TIMEOUT;
  } catch {
    // Deno without --allow-env throws; fall back to the default.
    return undefined;
  }
}

/**
 * Parse a timeout value from `raw` (typically an env-var string).
 * Returns `def` when `raw` is absent, non-numeric, zero, or negative.
 * Fractional values are floored, and the result is clamped to the largest
 * delay `setTimeout` supports (values above this overflow to ~1ms).
 */
export function parseTimeout(raw, def) {
  if (raw == null) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), 2_147_483_647);
}

/**
 * Run `fn()` and resolve with its result, or throw the timeout sentinel if
 * it takes longer than `ms` milliseconds.
 */
export function runWithTimeout(fn, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(TIMEOUT_SENTINEL), ms);
    Promise.resolve()
      .then(() => fn())
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });
}

async function exit(code) {
  // A timed-out test can leave async work pending that keeps the runtime
  // alive, so we terminate the process explicitly. Exit synchronously without
  // yielding to the event loop: a hung test's lingering timers must not get
  // another tick to write over the final report. (Deno's stdout writes are
  // synchronous, so nothing is buffered by the time we get here.)
  if (globalThis.Deno) {
    Deno.exit(code);
  } else {
    // On Node, stdout to a pipe is buffered and `process.exit` would truncate
    // it, so wait for it to drain first. A TTY drains synchronously, so this
    // resolves on a microtask without letting any timer fire.
    await new Promise((resolve) => {
      if (process.stdout.writableLength === 0) resolve();
      else process.stdout.once("drain", resolve);
    });
    process.exit(code);
  }
}

async function read_dir(path) {
  if (globalThis.Deno) {
    let items = [];
    for await (let item of Deno.readDir(path, { withFileTypes: true })) {
      items.push(item.name);
    }
    return items;
  } else {
    let { readdir } = await import("node:fs/promises");
    return readdir(path);
  }
}

function join_path(a, b) {
  if (a.endsWith("/")) return a + b;
  return a + "/" + b;
}

async function async_read_file(path) {
  if (globalThis.Deno) {
    return Deno.readTextFile(path);
  } else {
    let { readFile } = await import("node:fs/promises");
    let contents = await readFile(path);
    return contents.toString();
  }
}
