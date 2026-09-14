import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) || `movie-${Date.now()}`;
}

async function redis(command: string, args: string[] = []) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;
  const r = await fetch(`${base}/${command}/${args.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage HTTP ${r.status}`);
  return r.json();
}

export async function POST(request: Request) {
  const expected = process.env.OWNER_PUBLISH_TOKEN?.trim();
  const cookie = request.headers.get("cookie") || "";
  if (!expected || !cookie.includes(`vm_owner=${encodeURIComponent(expected)}`)) return NextResponse.json({ ok: false, error: "Owner access required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || "").trim().slice(0, 120);
  const description = String(body?.description || "").trim().slice(0, 2000);
  const videoUrl = String(body?.videoUrl || "").trim();
  const prompt = String(body?.prompt || "").trim();
  if (!title || !videoUrl) return NextResponse.json({ ok: false, error: "Title and video URL are required." }, { status: 400 });
  const safety = moderatePrompt(`${title}\n${description}\n${prompt}`);
  if (!safety.ok) return NextResponse.json({ ok: false, error: safety.reason }, { status: 400 });
  if (!/^https:\/\/(?:[^/]+\.)?(?:fal\.media|public\.blob\.vercel-storage\.com|blob\.vercel-storage\.com)\//i.test(videoUrl)) return NextResponse.json({ ok: false, error: "Only generated movie video storage URLs can be published." }, { status: 400 });
  const movie = { slug: `${slugify(title)}-${Date.now().toString(36)}`, title, description, videoUrl, posterUrl: String(body?.posterUrl || "").trim(), trailerUrl: String(body?.trailerUrl || "").trim(), publishedAt: new Date().toISOString(), aiGenerated: true, views: 0, likes: 0 };
  try {
    await redis("set", [`vm:movie:${movie.slug}`, JSON.stringify(movie)]);
    await redis("set", [`vm:movie:${movie.slug}:views`, "0"]);
    await redis("set", [`vm:movie:${movie.slug}:likes`, "0"]);
    await redis("lpush", ["vm:movies", movie.slug]);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not save movie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, movie });
}
