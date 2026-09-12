"use client";

import { useEffect, useState } from "react";

const durations = [1, 3, 5, 10, 30, 60];
const steps = [
  ["IDEA", "Your concept"], ["AI STORY", "Plot, scenes and continuity"],
  ["CHARACTERS", "Consistent characters"], ["STORYBOARD", "Automatic scene breakdown"],
  ["AI VIDEO", "Generate cinematic scenes"], ["AUDIO", "Dialogue, narration, SFX and music"],
  ["MOVIE", "Build the final timeline"], ["EXPORT", "Download and share"]
];

type Scene = { id: number; prompt: string };
type Character = { id: string; name: string; role: string; prompt: string };
type Story = { title: string; logline: string; sceneCount: number; visibleScenes: number; scenes: Scene[]; note?: string };

export default function Home() {
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("Cinematic");
  const [minutes, setMinutes] = useState(1);
  const [aspect, setAspect] = useState("16:9");
  const [status, setStatus] = useState("Ready to create your movie.");
  const [story, setStory] = useState<Story | null>(null);
  const [active, setActive] = useState(0);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [generated, setGenerated] = useState<Record<number, boolean>>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [audio, setAudio] = useState({ dialogue: true, narration: true, music: true, sfx: true });
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
  const [videoState, setVideoState] = useState<Record<number, string>>({});
  const [generatingScene, setGeneratingScene] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<Record<number, string>>({});
  const [falConfigured, setFalConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/video/health", { cache: "no-store" })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        setFalConfigured(Boolean(r.ok && d?.falConfigured));
      })
      .catch(() => setFalConfigured(false));
  }, []);

  const go = (index: number) => {
    setActive(index);
    setStatus(index === 0 ? "Start with your movie idea." : `${steps[index][0]} section opened.`);
    setTimeout(() => document.getElementById(`stage-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  async function generateStory() {
    if (!idea.trim()) { setStatus("Write your movie idea first."); go(0); return; }
    setStatus("Building your movie plan...");
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, genre, minutes }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setStory(d); setActive(1); setStatus(`Movie plan ready: ${d.sceneCount} scenes for ${minutes} minute(s).`);
      setTimeout(() => document.getElementById("stage-1")?.scrollIntoView({ behavior: "smooth" }), 30);
    } catch (e: unknown) { setStatus(e instanceof Error ? e.message : "Something went wrong."); }
  }

  function openCharacters() {
    const nextCharacters: Character[] = [
      { id: "maya", name: "Maya", role: "Lead Explorer", prompt: "young female explorer, cinematic sci-fi wardrobe, determined expression, consistent appearance" },
      { id: "orion", name: "Orion", role: "AI Companion", prompt: "sleek humanoid AI companion, subtle blue light accents, calm expression, consistent appearance" },
      { id: "guardian", name: "The Guardian", role: "Mystery", prompt: "ancient mysterious guardian, imposing silhouette, detailed futuristic armor, consistent appearance" }
    ];
    setCharacters(nextCharacters);
    setSelectedCharacterId(current => current && nextCharacters.some(c => c.id === current) ? current : nextCharacters[0].id);
    setActive(2);
    setStatus("Characters created. Tap a character card to select who appears in the next scene.");
    setTimeout(() => document.getElementById("stage-2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function openStoryboard() {
    if (!story) { setStatus("Generate the Movie Plan first, then create your scenes."); go(1); return; }
    setActive(3);
    setStatus(`${story.sceneCount} scenes are ready in your storyboard.`);
    setTimeout(() => document.getElementById("stage-3")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function openVideo() {
    if (!story) { setStatus("Generate the Movie Plan first, then open AI Video."); go(1); return; }
    setActive(4);
    setStatus(selectedScene ? `Scene ${selectedScene.id} is selected for video generation.` : "Select a storyboard scene to generate video.");
    setTimeout(() => document.getElementById("stage-4")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function selectCharacter(character: Character) {
    setSelectedCharacterId(character.id);
    setStatus(`${character.name} selected — ${character.role}. This character will be included in the next generated scene.`);
  }

  function selectScene(scene: Scene) {
    setSelectedScene(scene);
    setActive(4);
    setStatus(`Scene ${scene.id} selected. You can generate the video now.`);
    setTimeout(() => document.getElementById("stage-4")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  async function generateScene(scene: Scene) {
    if (generatingScene === scene.id) return;
    setSelectedScene(scene); setActive(4); setGeneratingScene(scene.id);
    setVideoError(x => ({ ...x, [scene.id]: "" }));
    setVideoState(x => ({ ...x, [scene.id]: "SUBMITTING" }));
    setStatus(`Scene ${scene.id}: connecting to Vidu Q3 Turbo...`);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      let r: Response;
      try {
        r = await fetch("/api/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `${scene.prompt}\n\nCharacter continuity: ${selectedCharacter ? selectedCharacter.prompt : "Use the established movie characters consistently."}`, aspect_ratio: aspect }), signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
      const contentType = r.headers.get("content-type") || "";
      const d = contentType.includes("application/json") ? await r.json().catch(() => ({})) : { message: await r.text().catch(() => "Non-JSON response from server.") };
      if (!r.ok || !d?.ok) {
        const raw = d?.error?.message || d?.error?.detail || d?.message || (typeof d?.error === "string" ? d.error : "Video generation request was rejected.");
        setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
        setVideoError(x => ({ ...x, [scene.id]: raw }));
        setStatus(`Scene ${scene.id} error: ${raw}`);
        return;
      }
      const rid = d.requestId || d.data?.request_id || d.data?.requestId;
      if (!rid) {
        setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
        setVideoError(x => ({ ...x, [scene.id]: "Vidu accepted the request but returned no request ID. Try again." }));
        setStatus("Vidu accepted the request but returned no request ID. Try again.");
        return;
      }
      setGenerated(x => ({ ...x, [scene.id]: true }));
      setVideoState(x => ({ ...x, [scene.id]: "IN_QUEUE" }));
      setStatus(`Scene ${scene.id}: IN_QUEUE — Vidu is generating your 5-second video...`);
      await pollScene(scene.id, rid);
    } catch (e: unknown) {
      setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
      const message = e instanceof DOMException && e.name === "AbortError" ? "The video server took too long to respond. Check Vercel deployment and FAL_KEY." : e instanceof Error ? e.message : "Video request failed.";
      setVideoError(x => ({ ...x, [scene.id]: message }));
      setStatus(`Scene ${scene.id} error: ${message}`);
    } finally {
      setGeneratingScene(current => current === scene.id ? null : current);
    }
  }

  async function pollScene(sceneId: number, rid: string) {
    for (let i = 0; i < 90; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 4000));
      try {
        const r = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "status" }), cache: "no-store" });
        const contentType = r.headers.get("content-type") || "";
        const d = contentType.includes("application/json") ? await r.json().catch(() => ({})) : { message: await r.text().catch(() => "Non-JSON response from server.") };
        if (!r.ok || !d?.ok) {
          const raw = d?.error?.message || d?.error?.detail || d?.message || "Status check failed.";
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: raw }));
          setStatus(`Scene ${sceneId} status error: ${raw}`);
          return;
        }
        const st = String(d?.data?.status || d?.data?.state || d?.status || "");
        if (st) {
          setVideoState(x => ({ ...x, [sceneId]: st }));
          setStatus(`Scene ${sceneId}: ${st}`);
        }
        if (["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(st.toUpperCase())) {
          const rr = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "result" }) });
          const rd = await rr.json().catch(() => ({}));
          if (!rr.ok || !rd?.ok) {
            const raw = rd?.error?.message || rd?.error?.detail || rd?.message || "Could not retrieve the finished video.";
            setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
            setVideoError(x => ({ ...x, [sceneId]: raw }));
            setStatus(`Scene ${sceneId} result error: ${raw}`);
            return;
          }
          const url = rd?.data?.video?.url || rd?.data?.data?.video?.url || rd?.video?.url;
          if (url) { setVideoUrls(x => ({ ...x, [sceneId]: url })); setVideoState(x => ({ ...x, [sceneId]: "READY" })); setStatus(`Scene ${sceneId} is READY — Preview, Download and Share.`); }
          else { setVideoState(x => ({ ...x, [sceneId]: "FAILED" })); setStatus("Generation finished, but Vidu returned no video URL."); }
          return;
        }
        if (["FAILED", "ERROR", "CANCELLED"].includes(st.toUpperCase())) {
          const detail = d?.data?.error || d?.data?.detail || d?.data?.message || d?.error || "Vidu reported a generation failure.";
          const errorType = d?.data?.error_type ? ` (${d.data.error_type})` : "";
          const logs = Array.isArray(d?.data?.logs) ? d.data.logs.map((x: any) => x?.message).filter(Boolean).slice(-2).join(" | ") : "";
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: `FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}` }));
          setStatus(`Scene ${sceneId} FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}`);
          return;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Network error while checking video status.";
        setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
        setVideoError(x => ({ ...x, [sceneId]: message }));
        setStatus(`Scene ${sceneId} status error: ${message}`);
        return;
      }
    }
    setVideoState(x => ({ ...x, [sceneId]: "TIMEOUT" })); setStatus("Generation is taking longer than expected.");
  }

  async function shareVideo(platform: string, sceneId: number) {
    const url = videoUrls[sceneId]; if (!url) { setStatus("Generate the video first."); return; }
    if (platform === "share" && navigator.share) { try { await navigator.share({ title: "ViralMovie AI", text: "My AI movie scene 🎬", url }); } catch {} return; }
    const u = encodeURIComponent(url);
    const links: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      instagram: "https://www.instagram.com/",
      tiktok: "https://www.tiktok.com/upload?lang=en",
      youtube: "https://studio.youtube.com/"
    };
    if (platform === "share") { try { await navigator.clipboard.writeText(url); setStatus("Video link copied."); } catch { setStatus("Copy failed. Use the video URL from the preview."); } return; }
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  function downloadVideo(sceneId: number) {
    const url = videoUrls[sceneId];
    if (!url) { setStatus("Video is not ready yet."); return; }
    window.location.href = `/api/video/download?url=${encodeURIComponent(url)}`;
  }

  function previewVideo(sceneId: number) {
    const url = videoUrls[sceneId];
    const scene = story?.scenes.find(s => s.id === sceneId) || selectedScene;
    if (!url || !scene) { setStatus("Generate the scene first. Preview will appear here automatically."); return; }
    setSelectedScene(scene);
    setActive(4);
    setStatus(`Preview ready for Scene ${sceneId}. Press play to watch.`);
    setTimeout(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId) || null;

  function exportProject() {
    const payload = { product: "ViralMovie AI", idea, genre, durationMinutes: minutes, aspectRatio: aspect, story, characters, selectedCharacter, generatedScenes: generated, audio, videoUrls };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "viralmovie-project.json"; a.click(); URL.revokeObjectURL(url); setStatus("Project exported successfully.");
  }

  const readyUrl = selectedScene ? videoUrls[selectedScene.id] : "";

  return <main className="app-shell">
    <nav className="topbar"><div className="brand"><div className="brand-icon">🎬</div><div><strong>ViralMovie <span>AI</span></strong><small>Turn Your Ideas Into Viral Movies</small></div></div><div className="top-actions"><button>👑 Go Premium</button><span>🪙 Credits: 250</span><div className="profile">👤 Nicu Mate⌄</div></div></nav>
    <div className="layout">
      <aside className="sidebar"><div className="side-links">
        {["⌂ Dashboard", "🎬 Create Movie", "▣ Create Scene", "▶ My Videos", "☆ Viral Templates", "↗ Social Media", "◉ Credits & Plans", "⚙ Settings"].map((x, i) => <button key={x} className={i === 1 ? "side-link active" : "side-link"} onClick={() => i === 1 ? go(0) : setStatus(`${x.replace(/^\S+\s/, "")} is coming next.`)}>{x}</button>)}
      </div><div className="premium-card"><div className="crown">👑</div><h3>Go Premium</h3><p>More videos, more features, more viral content!</p><button>Upgrade Now</button><div className="film-art">🎥</div></div></aside>
      <section className="content">
        <div className="hero-image"><img src="/hero-dashboard.png" alt="ViralMovie AI cinematic studio"/><div className="hero-overlay"></div><div className="hero-copy"><div className="hero-kicker">AI FILM STUDIO</div><h1>AI Makes <span>Films</span> Online</h1><p>Turn one idea into a cinematic movie with AI — story, characters, scenes, video and social sharing.</p><button type="button" className="hero-cta" onClick={() => go(0)}>✦ Start Creating</button></div></div>
        <div className="workspace">
          <div className="main-column">
            <section className="card create-card" id="stage-0"><div className="title-row"><div className="title-icon">🎬</div><div><h2>Create Movie</h2><p>Describe your idea and let AI bring it to life!</p></div></div>
              <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="Enter your movie idea...\n\nExample: A young astronaut lands on Mars and discovers a mysterious underground city built by an ancient civilization..."/>
              <div className="field-row"><select value={genre} onChange={e => setGenre(e.target.value)}><option>Cinematic</option>{["Action","Drama","Sci-Fi","Horror","Comedy","Fantasy","Thriller","Romance"].map(x => <option key={x}>{x}</option>)}</select><select value={aspect} onChange={e => setAspect(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></div>
              <div className="duration-line">Movie duration <div className="duration-pills">{durations.map(x => <button type="button" key={x} className={minutes === x ? "selected" : ""} onClick={() => setMinutes(x)}>{x} min</button>)}</div></div>
              <button type="button" className="generate" onClick={generateStory}>✦ Generate Movie</button><div className="status-line">{status}</div>
            </section>

            <section className="card" id="stage-1"><div className="section-head"><h2>⚡ AI Story</h2><span>{story ? "READY" : "WAITING"}</span></div>{story ? <><h3>{story.title}</h3><p className="muted">{story.logline}</p><div className="info-box">{story.sceneCount} planned scenes • {minutes * 60} seconds • 5 seconds per scene</div></> : <div className="info-box">Press Generate Movie to create the story structure.</div>}</section>

            <section className="card" id="stage-2"><div className="section-head"><h2>👤 Characters</h2><span>{selectedCharacter ? `SELECTED: ${selectedCharacter.name.toUpperCase()}` : "CONSISTENCY"}</span></div><button type="button" className="secondary" onClick={openCharacters}>✦ {characters.length ? "Refresh Characters" : "Create Characters"}</button>{characters.length > 0 && <><p className="muted character-help">Choose the character you want to appear in the next generated scene.</p><div className="character-row">{characters.map(c => <button type="button" className={`character ${selectedCharacterId === c.id ? "character-selected" : ""}`} key={c.id} onClick={() => selectCharacter(c)} aria-pressed={selectedCharacterId === c.id}><div className="avatar">◉</div><b>{c.name}</b><span className="character-role">{c.role}</span><small>{selectedCharacterId === c.id ? "✓ Selected for next scene" : "Tap to select"}</small></button>)}</div>{selectedCharacter && <div className="selected-character"><b>Selected character:</b> {selectedCharacter.name} — {selectedCharacter.role}<span>{selectedCharacter.prompt}</span></div>}</>}</section>

            <section className="card" id="stage-3"><div className="section-head"><h2>▣ Storyboard</h2><span>{story?.sceneCount || 0} SCENES</span></div>{!story ? <div className="info-box">Generate the Movie first.</div> : <>
              <button type="button" className="secondary scene-create" onClick={openStoryboard}>✦ Create / Refresh Scenes</button>
              <div className="scene-grid">{story.scenes.map(scene => <div className={`scene-card ${selectedScene?.id === scene.id ? "scene-selected" : ""}`} key={scene.id}><div className="scene-thumb">🎞️</div><div><b>Scene {scene.id}</b><p>{scene.prompt}</p><button type="button" onClick={() => { selectScene(scene); if (!generated[scene.id]) void generateScene(scene); }}>{generated[scene.id] ? "✓ Generated / Open" : "✦ Open & Generate"}</button></div></div>)}</div>
            </> }</section>

            <section className="card" id="stage-4"><div className="section-head"><h2>🎥 AI Video</h2><span>{selectedScene && videoState[selectedScene.id] ? videoState[selectedScene.id] : falConfigured === false ? "FAL OFFLINE" : "READY"}</span></div>{selectedScene ? <><div className="info-box"><b>Scene {selectedScene.id}</b><br/><span>{selectedScene.prompt}</span>{selectedCharacter && <><br/><small className="character-context">Character: {selectedCharacter.name} — {selectedCharacter.role}</small></>}</div>{falConfigured === false && <div className="error-box"><b>Vidu connection is not ready.</b><br/>The deployed server cannot see FAL_KEY. Add it to Vercel Production and redeploy.</div>}{videoError[selectedScene.id] && <div className="error-box"><b>Generation error</b><br/>{videoError[selectedScene.id]}</div>}<button type="button" className="generate" disabled={generatingScene === selectedScene.id} onClick={() => generateScene(selectedScene)}>{generatingScene === selectedScene.id ? `⏳ Generating Scene ${selectedScene.id}...` : generated[selectedScene.id] ? "↻ Generate Again" : "✦ Generate Scene"}</button>{readyUrl && <div className="video-box"><video controls playsInline src={readyUrl}/><div className="video-actions"><button className="download" onClick={() => downloadVideo(selectedScene.id)}>⇩ Download Video</button><button className="preview" onClick={() => previewVideo(selectedScene.id)}>◉ Preview</button></div><div className="share-title">Send your video to</div><div className="socials"><button onClick={() => shareVideo("facebook", selectedScene.id)}>f <span>Facebook</span></button><button onClick={() => shareVideo("instagram", selectedScene.id)}>◎ <span>Instagram</span></button><button onClick={() => shareVideo("tiktok", selectedScene.id)}>♪ <span>TikTok</span></button><button onClick={() => shareVideo("youtube", selectedScene.id)}>▶ <span>YouTube</span></button><button onClick={() => shareVideo("share", selectedScene.id)}>↗ <span>Share</span></button></div><p className="share-note">For Instagram, TikTok and YouTube, the platform may ask you to upload the downloaded MP4.</p></div>}</> : <div className="info-box">Choose a scene from Storyboard first.</div>}</section>

            <section className="card" id="stage-5"><div className="section-head"><h2>🔊 Audio</h2><span>STUDIO</span></div><div className="audio-row">{(["dialogue","narration","sfx","music"] as const).map(k => <button key={k} onClick={() => setAudio(a => ({ ...a, [k]: !a[k] }))}>{audio[k] ? "✓" : "○"} {k.toUpperCase()}</button>)}</div><p className="muted">Audio controls are ready. Vidu can return sound with generated video.</p></section>

            <section className="card" id="stage-6"><div className="section-head"><h2>🎞️ Movie</h2><span>WORKSPACE</span></div><div className="movie-tile"><strong>{minutes} min</strong><span>{story?.sceneCount || 0} planned scenes • {Object.keys(generated).length} submitted</span></div>{selectedScene && videoError[selectedScene.id] && <div className="error-box"><b>Last video error:</b> {videoError[selectedScene.id]}</div>}<p className="muted">The timeline is ready for multi-scene assembly. Download currently saves each generated scene.</p></section>

            <section className="card" id="stage-7"><div className="section-head"><h2>⇩ Export</h2><span>SHARE</span></div><button className="generate" onClick={exportProject}>Export Project</button></section>
          </div>

          <aside className="right-column" id="preview"><section className="card preview-card"><div className="section-head"><h2>▶ Movie Preview</h2><span>LIVE</span></div>{readyUrl ? <video id="movie-preview-video" controls playsInline preload="metadata" src={readyUrl}/> : <div className="preview-empty"><img src="/hero-dashboard.png" alt="Movie preview"/><span className="play">▶</span><strong>{selectedScene ? `Scene ${selectedScene.id} — press Generate Scene below` : "Select a scene to create your preview"}</strong></div>}<div className="preview-actions">{selectedScene && !readyUrl && <button type="button" className="preview" disabled={generatingScene === selectedScene.id} onClick={() => generateScene(selectedScene)}>{generatingScene === selectedScene.id ? "⏳ Generating..." : "✦ Generate Scene"}</button>}<button className="download" disabled={!readyUrl} onClick={() => selectedScene && downloadVideo(selectedScene.id)}>⇩ Download Video</button><button className="preview" disabled={!readyUrl} onClick={() => selectedScene && previewVideo(selectedScene.id)}>◉ Preview</button></div>{readyUrl && selectedScene && <><div className="share-title">Send your video to</div><div className="socials"><button onClick={() => shareVideo("facebook", selectedScene.id)}>f <span>Facebook</span></button><button onClick={() => shareVideo("instagram", selectedScene.id)}>◎ <span>Instagram</span></button><button onClick={() => shareVideo("tiktok", selectedScene.id)}>♪ <span>TikTok</span></button><button onClick={() => shareVideo("youtube", selectedScene.id)}>▶ <span>YouTube</span></button><button onClick={() => shareVideo("share", selectedScene.id)}>↗ <span>Share</span></button></div><p className="share-note">Social buttons open the platform upload/share page. Download the MP4 first when a platform requires a file upload.</p></>}</section>
            <section className="card pipeline"><div className="section-head"><h2>Movie Pipeline</h2><span>V4</span></div><div className="steps">{steps.map(([name, desc], i) => <button type="button" key={name} className={`step ${active === i ? "active" : ""} ${i < active ? "done" : ""}`} onClick={() => i === 2 ? openCharacters() : i === 3 ? openStoryboard() : i === 4 ? openVideo() : go(i)}><b>{i + 1}. {name}</b><span>{i < active ? "✓" : i === active ? "ACTIVE" : "OPEN"}</span><small>{desc}</small></button>)}</div></section>
            <section className="card my-movies"><div className="section-head"><h2>🎞️ My Movies</h2><span>View all →</span></div><div className="movie-item"><div className="mini-art">🌌</div><div><b>{story?.title || "Your next movie"}</b><small>{story ? `${minutes}:00 • Project ready` : "Start a new project"}</small></div><button onClick={() => go(0)}>Play</button></div></section>
          </aside>
        </div>
      </section>
    </div>
    <footer>ViralMovie AI • AI Makes Films Online • FAL_KEY stays server-side. <span className="footer-links"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/acceptable-use">Acceptable Use</a> · <a href="/security">Security</a></span></footer>
  </main>;
}
