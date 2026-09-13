import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function timecode(total: number) { const ms = Math.max(0, Math.round(total * 1000)); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); const x = ms % 1000; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(x).padStart(3,"0")}`; }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const audioUrl = String(body?.audio_url || "").trim();
    const start = Number(body?.start_seconds || 0);
    const key = process.env.FAL_KEY?.trim();
    if (!audioUrl) return NextResponse.json({ ok: false, message: "audio_url is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, message: "The service is temporarily unavailable." }, { status: 500 });
    const r = await fetch("https://fal.run/fal-ai/speech-to-text", { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ audio_url: audioUrl }), cache: "no-store" });
    const raw = await r.text().catch(() => ""); let d: any = {}; try { d = raw ? JSON.parse(raw) : {}; } catch {}
    if (!r.ok) return NextResponse.json({ ok: false, message: d?.detail || d?.message || `Transcription failed (HTTP ${r.status}).` }, { status: r.status });
    const text = String(d?.output || d?.text || d?.data?.output || "").trim();
    if (!text) return NextResponse.json({ ok: true, srt: "" });
    const srt = `1\n${timecode(start)} --> ${timecode(start + 5)}\n${text}\n`;
    return NextResponse.json({ ok: true, srt });
  } catch (e) { return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Subtitle generation failed." }, { status: 500 }); }
}
