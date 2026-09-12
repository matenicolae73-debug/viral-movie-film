import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = moderatePrompt(body?.prompt);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
