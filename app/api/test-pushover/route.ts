import { NextResponse } from "next/server";
import { sendPushover } from "../../../pipeline/notify-pushover";

export async function GET(): Promise<NextResponse> {
  const result = await sendPushover(
    "Compliance Copilot: test",
    `Test notification at ${new Date().toISOString()}`,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
