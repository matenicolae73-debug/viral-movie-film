import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    falConfigured: Boolean(process.env.FAL_KEY),
    model: "fal-ai/vidu/q3/text-to-video/turbo",
  });
}
