/**
 * utils/id.ts
 * Tiny wrapper around nanoid so the rest of the engine has one import point.
 * Keeps the engine decoupled from the nanoid version used by the app shell.
 */

// Use the browser's crypto.randomUUID if available (fastest), else fallback.
export function nanoid(length = 21): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
