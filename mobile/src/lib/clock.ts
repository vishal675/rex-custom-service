/**
 * Server clock. Expiry is decided by the server; the device clock may be wrong.
 * Every response that carries `server_now` updates the offset so countdowns match the server.
 */
let offsetMs = 0;

/** `requestStartedAt`/`receivedAt` are device times around the request; the midpoint approximates when the server stamped it. */
export function syncServerClock(serverNowIso: string, requestStartedAt: number, receivedAt: number = Date.now()) {
  const server = Date.parse(serverNowIso);
  if (Number.isNaN(server)) return;
  offsetMs = server - (requestStartedAt + receivedAt) / 2;
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

/** For tests. */
export function resetServerClock() {
  offsetMs = 0;
}
