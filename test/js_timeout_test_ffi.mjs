import { parseTimeout, runWithTimeout, isTimeout } from "./gleeunit_ffi.mjs";

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function assertParseTimeout() {
  const def = 5000;
  const cases = [
    [undefined, 5000, "undefined falls back to default"],
    [null, 5000, "null falls back to default"],
    ["10000", 10000, "numeric string is parsed"],
    ["abc", 5000, "non-numeric string falls back"],
    ["-5", 5000, "negative value falls back"],
    ["0", 5000, "zero falls back"],
    ["2500.9", 2500, "fractional value is floored"],
    ["99999999999", 2147483647, "huge value clamps to setTimeout max"],
  ];
  for (const [raw, expected, label] of cases) {
    const got = parseTimeout(raw, def);
    if (got !== expected) {
      throw new Error(`${label}: expected ${expected}, got ${got}`);
    }
  }
}

export async function assertFastTestPasses() {
  // Resolves well within the timeout, so it must NOT throw.
  const result = await runWithTimeout(() => delay(1, "ok"), 1000);
  if (result !== "ok") {
    throw new Error(`expected "ok", got ${String(result)}`);
  }
}

export async function assertSlowTestTimesOut() {
  try {
    await runWithTimeout(() => delay(1000, "late"), 5);
  } catch (error) {
    if (isTimeout(error)) return; // expected
    throw new Error(`expected timeout sentinel, got ${String(error)}`);
  }
  throw new Error("expected runWithTimeout to time out, but it resolved");
}
