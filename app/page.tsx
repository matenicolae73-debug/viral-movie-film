"use client";

import { useState } from "react";

const durations = [1,3,5,10,30,60];
const steps = [
  ["IDEA","Your concept"],["AI STORY","Plot, scenes and continuity"],
  ["CHARACTERS","Consistent characters"],["STORYBOARD","Automatic scene breakdown"],
  ["AI VIDEO","Generate cinematic scenes"],["AUDIO","Dialogue, narration, SFX and music"],
  ["MOVIE","Assemble the final timeline"],["EXPORT","Export your project"]
];

type Scene={id:number;prompt:string};
type Story={title:string;logline:string;sceneCount:number;visibleScenes:number;scenes:Scene[];note?:string};

export default function Home(){
  const[idea,setIdea]=useState(""); const[genre,setGenre]=useState("Cinematic");
  const[minutes,setMinutes]=useState(1); const[aspect,setAspect]=useState("16:9");
  const[status,setStatus]=useState("Ready to create your movie.");
  const[story,setStory]=useState<Story|null>(null); const[active,setActive]=useState(0);
  const[selectedScene,setSelectedScene]=useState<Scene|null>(null);
  const[generated,setGenerated]=useState<Record<number,string>>({});
  const[characters,setCharacters]=useState<string[]>([]);
  const[audio,setAudio]=useState({dialogue:true,narration:true,music:true,sfx:true});

  const go=(index:number)=>{
    setActive(index);
    setStatus(index===0?"Start with your movie idea.":index===1?"AI Story section opened.":
      index===2?"Characters section opened.":index===3?"Storyboard section opened.":
      index===4?"AI Video section opened.":index===5?"Audio section opened.":
      index===6?"Movie timeline opened.":"Export section opened.");
    setTimeout(()=>document.getElementById(`stage-${index}`)?.scrollIntoView({behavior:"smooth",block:"start"}),30);
  };

  async function generateStory(){
    if(!idea.trim()){setStatus("Write your movie idea first.");go(0);return;}
    setStatus("Building your movie plan...");
    try{
      const r=await fetch("/api/story",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea,genre,minutes})});
      const d=await r.json(); if(!r.ok)throw new Error(d.error);
      setStory(d);setActive(1);setStatus(`Movie plan ready: ${d.sceneCount} scenes for ${minutes} minute(s).`);
      setTimeout(()=>document.getElementById("stage-1")?.scrollIntoView({behavior:"smooth"}),30);
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Something went wrong.");}
  }

  function openCharacters(){setCharacters(["Maya — Lead Explorer","Orion — AI Companion","The Guardian — Mystery"]);go(2);}
  function openStoryboard(){if(!story){setStatus("Generate the Movie Plan first, then open Storyboard.");go(1);return;}go(3);}
  function openVideo(){if(!story){setStatus("Generate the Movie Plan first, then open AI Video.");go(1);return;}go(4);}

  async function generateScene(scene:Scene){
    setSelectedScene(scene);setActive(4);setStatus(`Submitting Scene ${scene.id} to the video engine...`);
    try{
      const r=await fetch("/api/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:scene.prompt,aspect_ratio:aspect})});
      const d=await r.json();
      if(d?.ok){setGenerated(x=>({...x,[scene.id]:JSON.stringify(d.data)}));setStatus(`Scene ${scene.id} submitted successfully.`);}
      else setStatus(d?.message||d?.error?.message||"Video generation needs FAL_KEY.");
    }catch{setStatus("Video request failed.");}
  }

  function exportProject(){
    const payload={product:"ViralMovie AI",idea,genre,durationMinutes:minutes,aspectRatio:aspect,story,characters,generatedScenes:generated,audio};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download="viralmovie-project.json";a.click();URL.revokeObjectURL(url);
    setStatus("Project JSON exported successfully.");
  }

  return <main className="wrap">
    <nav className="nav"><div className="logo">🎬 ViralMovie AI</div><div className="pill">V4 • Interactive Movie Studio</div></nav>
    <section className="hero"><h1>Turn one idea into a movie.</h1>
      <p>Every pipeline stage is now clickable: idea, story, characters, storyboard, AI video, audio, movie and export.</p>
    </section>

    <section className="grid"><div>
      <div className="card" id="stage-0"><h2>1. Create Movie</h2>
        <label className="label">Movie idea</label>
        <textarea className="textarea" value={idea} onChange={e=>setIdea(e.target.value)}
          placeholder="Example: A young astronaut lands on Mars and discovers a mysterious underground city..."/>
        <div className="row"><div><label className="label">Genre</label>
          <select className="select" value={genre} onChange={e=>setGenre(e.target.value)}>
            {["Cinematic","Action","Drama","Sci-Fi","Horror","Comedy","Fantasy","Thriller"].map(x=><option key={x}>{x}</option>)}
          </select></div><div><label className="label">Aspect ratio</label>
          <select className="select" value={aspect} onChange={e=>setAspect(e.target.value)}>
            {["16:9","9:16","1:1"].map(x=><option key={x}>{x}</option>)}
          </select></div></div>
        <label className="label">Movie duration</label>
        <div className="durations">{durations.map(x=><button type="button" key={x} className={`duration ${minutes===x?"active":""}`} onClick={()=>setMinutes(x)}>{x} min</button>)}</div>
        <button type="button" className="primary" onClick={generateStory}>Generate Movie Plan</button>
        <div className="status">{status}</div>
      </div>

      <div className="card panel" id="stage-1"><h2>2. AI Story</h2>
        {story?<><h3>{story.title}</h3><p>{story.logline}</p><div className="notice">{story.sceneCount} planned scenes • {minutes*60} seconds • 5 seconds per scene</div><p className="mini">{story.note}</p></>:
        <div className="notice">Press Generate Movie Plan to create the story structure.</div>}
      </div>

      <div className="card panel" id="stage-2"><h2>3. Characters</h2>
        <p className="mini">Test character module.</p><button type="button" className="secondary" onClick={openCharacters}>Create Characters</button>
        {characters.length>0&&<div className="character-grid panel">{characters.map(c=><div className="character" key={c}><b>{c}</b><div className="mini">Consistency reference ready</div></div>)}</div>}
      </div>

      <div className="card panel" id="stage-3"><h2>4. Storyboard</h2>
        {!story?<div className="notice">Generate the Movie Plan first.</div>:
        <div className="scene-grid">{story.scenes.map(scene=><div className="scene" key={scene.id}>
          <h3>Scene {scene.id}</h3><p>{scene.prompt}</p>
          <button type="button" onClick={()=>{setSelectedScene(scene);go(4)}}>{generated[scene.id]?"Submitted ✓":"Open Scene"}</button>
        </div>)}</div>}
      </div>

      <div className="card panel" id="stage-4"><h2>5. AI Video</h2>
        {selectedScene?<><div className="notice">Selected Scene {selectedScene.id}<br/><span className="mini">{selectedScene.prompt}</span></div>
          <button type="button" className="primary" onClick={()=>generateScene(selectedScene)}>{generated[selectedScene.id]?"Generate Again":"Generate Scene"}</button></>:
          <div className="notice">Choose a scene from Storyboard first.</div>}
      </div>

      <div className="card panel" id="stage-5"><h2>6. Audio</h2>
        <div className="toolbar">{(["dialogue","narration","sfx","music"] as const).map(k=><button type="button" key={k} onClick={()=>setAudio(a=>({...a,[k]:!a[k]}))}>{audio[k]?"✓ ":"○ "}{k.toUpperCase()}</button>)}</div>
        <p className="mini">Audio switches are interactive. Real voice/music generation can be connected next.</p>
      </div>

      <div className="card panel" id="stage-6"><h2>7. Movie</h2>
        <div className="notice"><div className="big-number">{minutes} min</div><div>{story?.sceneCount||0} planned scenes • {Object.keys(generated).length} submitted scenes</div></div>
        <p className="mini">Timeline foundation is ready. Final automatic stitching is the next production step.</p>
      </div>

      <div className="card panel" id="stage-7"><h2>8. Export</h2>
        <p>Export the current project plan, settings and generated scene responses as a JSON file.</p>
        <button type="button" className="primary" onClick={exportProject}>Export Project JSON</button>
      </div>
    </div>

    <aside className="card"><h2>Movie Pipeline</h2><div className="steps">
      {steps.map(([name,desc],i)=><button type="button" key={name}
        className={`step ${active===i?"active":""} ${i<active?"done":""}`}
        onClick={()=>i===2?openCharacters():i===3?openStoryboard():i===4?openVideo():go(i)}>
        <div className="step-top"><b>{i+1}. {name}</b><span className="badge">{i<active?"✓":i===active?"ACTIVE":"OPEN"}</span></div>
        <div className="mini">{desc}</div>
      </button>)}
    </div><div className="panel notice">{status}</div></aside></section>
    <footer className="footer">ViralMovie AI V4 • All 8 pipeline buttons are interactive • FAL/Vidu uses private FAL_KEY server-side.</footer>
  </main>;
}