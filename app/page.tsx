"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { renderFilm } from "./lib/film-render";

const durations = [1, 3, 5, 10, 30, 60];
const genres = ["Cinematic","Action","Romance","Drama","Sci-Fi","Horror","Comedy","Fantasy","Thriller","Mystery","Adventure"];
const steps = ["IDEA","AI STORY","CHARACTERS","STORYBOARD","AI VIDEO","AUDIO","MOVIE","TRAILER","SUBTITLES","EXPORT"];

type Scene = { id:number; prompt:string; subtitle?:string; dialogue?:string };
type Character = { id:string; name:string; role:string; prompt:string };
type Story = { title:string; logline:string; sceneCount:number; visibleScenes:number; scenes:Scene[]; note?:string };

export default function Home() {
  const [idea,setIdea]=useState("");
  const [genre,setGenre]=useState("Cinematic");
  const [minutes,setMinutes]=useState(1);
  const [aspect,setAspect]=useState("16:9");
  const [status,setStatus]=useState("Ready to create your movie.");
  const [story,setStory]=useState<Story|null>(null);
  const [active,setActive]=useState(0);
  const [selectedScene,setSelectedScene]=useState<Scene|null>(null);
  const [characters,setCharacters]=useState<Character[]>([]);
  const [selectedCharacterId,setSelectedCharacterId]=useState<string|null>(null);
  const [videoUrls,setVideoUrls]=useState<Record<number,string>>({});
  const [videoState,setVideoState]=useState<Record<number,string>>({});
  const [videoError,setVideoError]=useState<Record<number,string>>({});
  const [generatingScene,setGeneratingScene]=useState<number|null>(null);
  const [movieUrl,setMovieUrl]=useState("");
  const [trailerUrl,setTrailerUrl]=useState("");
  const [subtitleUrl,setSubtitleUrl]=useState("");
  const [rendering,setRendering]=useState(false);
  const [confirmCost,setConfirmCost]=useState(false);
  const [audio,setAudio]=useState({dialogue:true,narration:true,music:true,sfx:true});

  const selectedCharacter=characters.find(c=>c.id===selectedCharacterId)||null;
  const generatedCount=Object.keys(videoUrls).length;
  const orderedReadyUrls=useMemo(()=>story?.scenes.map(s=>videoUrls[s.id]).filter(Boolean) as string[] || [],[story,videoUrls]);
  const readyScenes=useMemo(()=>story?.scenes.filter(s=>videoUrls[s.id]) || [],[story,videoUrls]);
  const estimatedCredits=Math.max(1, Math.round((story?.sceneCount || minutes*12)*5));

  useEffect(()=>{ localStorage.setItem("viralmovie-last-project",JSON.stringify({idea,genre,minutes,aspect,story,characters,videoUrls})); },[idea,genre,minutes,aspect,story,characters,videoUrls]);

  function go(i:number){
    setActive(i);
    document.getElementById(`stage-${i}`)?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function generateStory(){
    if(!idea.trim()){setStatus("Write your movie idea first.");go(0);return;}
    setStatus("AI is building the screenplay and scene plan...");
    try{
      const r=await fetch("/api/story",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea,genre,minutes})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Story generation failed.");
      setStory(d); setVideoUrls({}); setMovieUrl(""); setTrailerUrl(""); setSubtitleUrl("");
      setStatus(`Story ready: ${d.sceneCount} scenes. Estimated video credits: ${estimatedCredits}.`);
      go(1);
    }catch(e){setStatus(e instanceof Error?e.message:"Story generation failed.");}
  }

  function openCharacters(){
    const cs:Character[]=[
      {id:"maya",name:"Maya",role:"Lead",prompt:"young female explorer, same face, same hairstyle, same outfit palette and body proportions in every scene"},
      {id:"orion",name:"Orion",role:"AI Companion",prompt:"sleek humanoid AI companion, consistent blue light accents, same body design in every scene"},
      {id:"guardian",name:"The Guardian",role:"Mystery",prompt:"ancient futuristic guardian, imposing silhouette, same armor, mask and proportions in every scene"}
    ];
    setCharacters(cs);
    setSelectedCharacterId(v=>v&&cs.some(c=>c.id===v)?v:cs[0].id);
    setStatus("Characters locked for continuity. The selected character is injected into every new scene prompt.");
    go(2);
  }

  function openStoryboard(){ if(!story){setStatus("Generate the story first.");go(1);return;} setStatus(`${story.sceneCount} scenes are ready.`);go(3); }
  function openAudio(){go(5);}

  async function submitScene(scene:Scene, character=selectedCharacter):Promise<string|null>{
    setSelectedScene(scene); setGeneratingScene(scene.id); setVideoState(x=>({...x,[scene.id]:"SUBMITTING"})); setVideoError(x=>({...x,[scene.id]:""}));
    try{
      const prompt=`${scene.prompt}\n\nCHARACTER BIBLE: ${characters.map(c=>`${c.name}: ${c.prompt}`).join(" | ")}\nACTIVE CHARACTER: ${character?.prompt||"Use the established movie character bible consistently."}\nAUDIO: cinematic dialogue, natural ambience and synchronized sound where supported.`;
      const r=await fetch("/api/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,aspect_ratio:aspect})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok) throw new Error(d.message||d.error?.message||"Video generation request failed.");
      const rid=d.requestId||d.data?.request_id||d.data?.requestId;
      if(!rid) throw new Error("No request ID returned by Vidu.");
      setVideoState(x=>({...x,[scene.id]:"IN_QUEUE"}));
      for(let i=0;i<90;i++){
        if(i>0) await new Promise(r=>setTimeout(r,4000));
        const sr=await fetch("/api/video/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:rid,action:"status"}),cache:"no-store"});
        const sd=await sr.json().catch(()=>({}));
        const st=String(sd?.data?.status||sd?.data?.state||"");
        if(st) setVideoState(x=>({...x,[scene.id]:st}));
        if(["COMPLETED","SUCCESS","SUCCEEDED"].includes(st.toUpperCase())){
          const rr=await fetch("/api/video/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:rid,action:"result"})});
          const rd=await rr.json().catch(()=>({}));
          const url=rd?.data?.video?.url||rd?.data?.data?.video?.url||rd?.video?.url;
          if(!url) throw new Error("Generation completed but Vidu returned no video URL.");
          setVideoUrls(x=>({...x,[scene.id]:url})); setVideoState(x=>({...x,[scene.id]:"READY"}));
          return url;
        }
        if(["FAILED","ERROR","CANCELLED"].includes(st.toUpperCase())){
          const detail=sd?.data?.error||sd?.data?.detail||sd?.error||"Vidu reported a generation failure.";
          throw new Error(typeof detail==="string"?detail:JSON.stringify(detail));
        }
      }
      throw new Error("Generation timed out. Try this scene again.");
    }catch(e){
      const msg=e instanceof Error?e.message:"Video generation failed.";
      setVideoState(x=>({...x,[scene.id]:"FAILED"})); setVideoError(x=>({...x,[scene.id]:msg})); setStatus(`Scene ${scene.id}: ${msg}`); return null;
    }finally{setGeneratingScene(v=>v===scene.id?null:v);}
  }

  async function generateScene(scene:Scene){
    if(generatingScene) return;
    setStatus(`Generating Scene ${scene.id}...`);
    await submitScene(scene);
  }

  async function generateFullFilm(){
    if(!story){setStatus("Generate the story first.");return;}
    if(!confirmCost){setConfirmCost(true);return;}
    setConfirmCost(false); setRendering(false);
    const scenes=story.scenes;
    const urls={...videoUrls};
    for(const scene of scenes){
      if(!urls[scene.id]){
        setStatus(`Generating film scene ${scene.id}/${scenes.length}...`);
        const url=await submitScene(scene);
        if(!url){setStatus(`Film stopped at Scene ${scene.id}. Fix the error and continue.`);return;}
        urls[scene.id]=url; setVideoUrls({...urls});
      }
    }
    await assemble(urls);
  }

  async function assemble(urlMap=videoUrls){
    if(!story) return;
    const urls=story.scenes.map(s=>urlMap[s.id]).filter(Boolean);
    if(!urls.length){setStatus("Generate at least one scene first.");return;}
    setRendering(true); setActive(6); setStatus("Rendering final movie, trailer and automatic subtitles on this device...");
    try{
      const result=await renderFilm(urls,story.scenes.filter(s=>urlMap[s.id]),m=>setStatus(m));
      setMovieUrl(result.movieUrl); setTrailerUrl(result.trailerUrl); setSubtitleUrl(result.subtitleUrl);
      try {
        const blob = await fetch(result.movieUrl).then(r=>r.blob());
        const db = await new Promise<IDBDatabase>((resolve,reject)=>{
          const req=indexedDB.open("viralmovie-local",1);
          req.onupgradeneeded=()=>req.result.createObjectStore("films");
          req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
        });
        await new Promise<void>((resolve,reject)=>{
          const tx=db.transaction("films","readwrite"); tx.objectStore("films").put(blob,"latest");
          tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
        });
        db.close();
      } catch {}

      setStatus(`Final movie ready: ${urls.length} scenes. Trailer + subtitles generated automatically.`);
      go(6);
    }catch(e){setStatus(e instanceof Error?e.message:"Final render failed. Try fewer scenes on mobile.");}
    finally{setRendering(false);}
  }

  function download(url:string,name:string){
    if(!url)return;
    const a=document.createElement("a");a.href=url;a.download=name;a.click();
  }

  return <main className="app-shell">
    <nav className="topbar">
      <Link href="/" className="brand"><div className="brand-icon">🎬</div><div><strong>ViralMovie <span>AI</span></strong><small>AI FILM STUDIO</small></div></Link>
      <div className="top-actions"><Link href="/movies-online">🎬 Movies Online</Link><Link href="/account">👤 Account</Link><Link href="/credits">🪙 Credits</Link><b>👑 Owner</b></div>
    </nav>
    <div className="layout">
      <aside className="sidebar"><div className="side-links">
        {[
          ["⌂","Dashboard","/"],["🎬","Create Film","/"],["▶","My Films","/my-films"],["🌐","Movies Online","/movies-online"],["👤","Characters","/characters"],["▣","Projects","/projects"],["⚙","Account","/account"]
        ].map(([icon,label,href])=><Link key={label} href={href} className={label==="Create Film"?"side-link active":"side-link"}>{icon} {label}</Link>)}
      </div><div className="premium-card"><div className="crown">👑</div><h3>ViralMovie AI</h3><p>Create films, trailers and subtitles from one idea.</p><Link href="/movies-online">Explore Movies</Link></div></aside>

      <section className="content">
        <div className="hero-image"><img src="/hero-dashboard.png" alt="AI cinematic film studio"/><div className="hero-overlay"/><div className="hero-copy"><div className="hero-kicker">AI FILM STUDIO • FULL PIPELINE</div><h1>AI Makes <span>Films</span> Online</h1><p>Idea → screenplay → characters → scenes → audio → final movie → trailer → subtitles.</p><button className="hero-cta" onClick={()=>go(0)}>✦ Start Creating</button></div></div>

        <div className="workspace">
          <div className="main-column">
            <section className="card create-card" id="stage-0"><div className="title-row"><div className="title-icon">🎬</div><div><h2>Create Film</h2><p>Choose genre, duration and format.</p></div></div>
              <textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Example: A young astronaut lands on Mars and discovers a mysterious underground city..."/>
              <div className="field-row"><select value={genre} onChange={e=>setGenre(e.target.value)}>{genres.map(g=><option key={g}>{g}</option>)}</select><select value={aspect} onChange={e=>setAspect(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></div>
              <div className="duration-line">Movie duration <div className="duration-pills">{durations.map(x=><button key={x} onClick={()=>setMinutes(x)} className={minutes===x?"selected":""}>{x} min</button>)}</div></div>
              <div className="cost-box">Estimated generation: <b>{estimatedCredits} scene-credits</b> • confirmation required before paid generation.</div>
              <button className="generate" onClick={generateStory}>✦ Generate Story & Storyboard</button>
              <div className="status-line">{status}</div>
            </section>

            <section className="card" id="stage-1"><div className="section-head"><h2>⚡ AI Story</h2><span>{story?"READY":"WAITING"}</span></div>{story?<><h3>{story.title}</h3><p className="muted">{story.logline}</p><div className="info-box">{story.sceneCount} planned scenes • {minutes} minute(s) • automatic scene order.</div></>:<div className="info-box">Your idea becomes a screenplay and scene plan here.</div>}</section>

            <section className="card" id="stage-2"><div className="section-head"><h2>👤 Characters</h2><span>{characters.length?"LOCKED":"READY"}</span></div><button className="secondary" onClick={openCharacters}>✦ Create Character Bible</button>{characters.length>0&&<div className="character-row">{characters.map(c=><button key={c.id} className={`character ${selectedCharacterId===c.id?"character-selected":""}`} onClick={()=>setSelectedCharacterId(c.id)}><div className="avatar">◉</div><b>{c.name}</b><span className="character-role">{c.role}</span><small>{selectedCharacterId===c.id?"✓ Selected":"Tap to select"}</small></button>)}</div>}</section>

            <section className="card" id="stage-3"><div className="section-head"><h2>▣ Storyboard</h2><span>{story?.sceneCount||0} SCENES</span></div>{story?<><button className="secondary scene-create" onClick={openStoryboard}>✦ Refresh Storyboard</button><div className="scene-grid">{story.scenes.map(s=><div key={s.id} className={`scene-card ${selectedScene?.id===s.id?"scene-selected":""}`}><div className="scene-thumb">{videoUrls[s.id]?"▶️":"🎞️"}</div><div><b>Scene {s.id}</b><p>{s.prompt}</p><button onClick={()=>{setSelectedScene(s);void generateScene(s)}} disabled={generatingScene===s.id}>{videoUrls[s.id]?"✓ Regenerate":"✦ Generate Scene"}</button></div></div>)}</div></>:<div className="info-box">Generate the story first.</div>}</section>

            <section className="card" id="stage-5"><div className="section-head"><h2>🔊 Audio & Subtitles</h2><span>AUTOMATIC</span></div><div className="audio-row">{Object.entries(audio).map(([k,v])=><button key={k} onClick={()=>setAudio(a=>({...a,[k]:!v}))}>{v?"✓":"○"} {k}</button>)}</div><p className="muted">The video model can provide audio where supported. Final rendering also creates an automatic SRT subtitle track from the screenplay/scene text.</p>{subtitleUrl&&<button className="secondary" onClick={()=>download(subtitleUrl,"viralmovie-subtitles.srt")}>Download Subtitles (.SRT)</button>}</section>

            <section className="card" id="stage-6"><div className="section-head"><h2>🎥 Final Movie</h2><span>{movieUrl?"READY":"WAITING"}</span></div>{movieUrl?<><video className="final-video" src={movieUrl} controls playsInline/><div className="preview-actions"><button className="download" onClick={()=>download(movieUrl,"viralmovie-final.mp4")}>⬇ Download Final MP4</button><button className="preview" onClick={()=>setActive(6)}>▶ Preview</button></div></>:<><div className="info-box">{generatedCount} / {story?.visibleScenes||0} scenes generated.</div><button className="generate" disabled={!story||rendering} onClick={generateFullFilm}>{rendering?"Rendering...":`🎬 Generate Entire Film Automatically`}</button>{confirmCost&&<div className="confirm-box"><b>Confirm generation</b><p>This can start many paid video generations. Estimated: about {estimatedCredits} scene-credits.</p><button className="generate" onClick={generateFullFilm}>I Confirm — Start Film</button><button className="secondary" onClick={()=>setConfirmCost(false)}>Cancel</button></div>}</>}</section>

            <section className="card" id="stage-7"><div className="section-head"><h2>🍿 Automatic Trailer</h2><span>{trailerUrl?"READY":"AUTO"}</span></div>{trailerUrl?<><video className="final-video" src={trailerUrl} controls playsInline/><button className="download" onClick={()=>download(trailerUrl,"viralmovie-trailer.mp4")}>⬇ Download Trailer MP4</button></>:<div className="info-box">After the final movie is rendered, the app automatically selects key scenes and creates a short trailer.</div>}</section>

            <section className="card" id="stage-9"><div className="section-head"><h2>🌐 Publish / Share</h2><span>MOVIES ONLINE</span></div><p className="muted">Your finished film can be added to the Movies Online catalog. Social share links can be used after the MP4 is downloaded or published to storage.</p><Link className="hero-cta inline-cta" href="/movies-online">Open Movies Online →</Link></section>
          </div>

          <aside className="right-column">
            <section className="card"><div className="section-head"><h2>Pipeline</h2><span>V5</span></div><div className="steps">{steps.map((s,i)=><button key={s} className={`step ${active===i?"active":""} ${i===6&&movieUrl?"done":""}`} onClick={()=>go(i)}><b>{i+1}. {s}</b><small>{["Idea","Screenplay & scenes","Character bible","Ordered scenes","AI video","Dialogue / music / SFX","Final MP4","Short promo","SRT track","Download & publish"][i]}</small></button>)}</div></section>
            <section className="card"><h3>Ready scenes</h3><div className="movie-tile"><strong>{generatedCount}</strong><span>of {story?.visibleScenes||0} generated</span></div>{readyScenes.length>0&&<button className="secondary" onClick={()=>assemble()}>🎬 Render Ready Scenes Now</button>}</section>
            <section className="card"><h3>Owner</h3><p className="muted">Owner tools are separated from public Movies Online. Credits and account controls stay in their own pages.</p><Link href="/account" className="secondary inline-cta">Open Account</Link></section>
          </aside>
        </div>
      </section>
    </div>
    <footer className="footer">ViralMovie AI • cinematic creation studio • FAL_KEY remains server-side • rendering is performed locally for the current prototype.</footer>
  </main>;
}
