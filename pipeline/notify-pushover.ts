const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

export async function sendPushover(
  title: string,
  message: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const user = process.env["PUSHOVER_USER"];
  const token = process.env["PUSHOVER_TOKEN"];

  if (!user || !token) {
    const reason = "missing PUSHOVER_USER or PUSHOVER_TOKEN";
    console.warn(`[pushover] ${reason} — skipping notification`);
    return { ok: false, reason };
  }

  const body = new URLSearchParams({ token, user, title, message });

  const res = await fetch(PUSHOVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    const reason = `Pushover ${res.status}: ${text}`;
    console.error(`[pushover] ${reason}`);
    return { ok: false, reason };
  }

  return { ok: true };
}
