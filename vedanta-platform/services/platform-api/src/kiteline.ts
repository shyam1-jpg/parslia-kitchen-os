/**
 * For the time being, guest-book writes are also kept on Kiteline
 * (https://kiteline.uk — vedanta-store audit log). Rota, clock and PINs
 * stay in Kiteline's own staff collections; this file only appends guest events.
 */
const BASE = (process.env.KITELINE_URL ?? "https://kiteline.uk").replace(/\/$/, "");

export function kitelineBackupOn(): boolean {
  return process.env.KITELINE_BACKUP !== "false";
}

export async function backupGuestEvent(event: { id: string; kind: string; [k: string]: unknown }): Promise<void> {
  if (!kitelineBackupOn()) return;
  const body = {
    ops: [{
      c: "audit_log",
      id: event.id,
      data: {
        id: event.id,
        at: new Date().toISOString(),
        source: "vedanta-guest-book",
        ...event,
      },
    }],
  };
  try {
    const res = await fetch(`${BASE}/api/vedanta/patch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn("kiteline backup failed", res.status);
  } catch (e) {
    console.warn("kiteline backup unreachable", (e as Error).message);
  }
}
