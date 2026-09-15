import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim().slice(0, 2000);
    const safety = moderatePrompt(prompt);
    if (!safety.ok) return NextResponse.json({ ok: false, message: safety.reason, blocked: true, category: safety.category }, { status: 400 });
    const aspect_ratio = ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(String(body?.aspect_ratio)) ? String(body.aspect_ratio) : "16:9";
    if (body?.adultConfirmed !== true) return NextResponse.json({ ok: false, message: "You must confirm that you are 18+ and agree to the ViralMovie safety rules." }, { status: 400 });
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ ok: false, message: "FAL_KEY is missing on this Vercel deployment." }, { status: 500 });
    const response = await fetch(`https://queue.fal.run/${MODEL}`, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json", "X-Fal-Store-IO": "1" }, body: JSON.stringify({ input: { prompt, aspect_ratio, duration: 5, resolution: "540p", audio: true } }), cache: "no-store" });
    const raw = await response.text().catch(() => "");
    let data: any = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
    if (!response.ok) return NextResponse.json({ ok: false, message: data?.detail || data?.message || data?.error || `fal.ai returned HTTP ${response.status}.`, falStatus: response.status }, { status: response.status });
    const requestId = data?.request_id || data?.requestId;
    if (!requestId) return NextResponse.json({ ok: false, message: "fal.ai responded without a request ID.", data }, { status: 502 });
    return NextResponse.json({ ok: true, requestId, responseUrl: data?.response_url || data?.responseUrl || null, statusUrl: data?.status_url || data?.statusUrl || null, data });
  } catch (e) { return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Video request failed." }, { status: 500 }); }
}
