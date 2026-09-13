"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const categories=["Latest","Trending","AI Originals","Action","Sci-Fi","Drama","Short Films"];
const demo=[
 {id:"demo-mars",title:"Mars: The Forgotten City",genre:"Sci-Fi",duration:"01:00",tag:"AI Original",poster:"🚀"},
 {id:"demo-signal",title:"Last Signal",genre:"Thriller",duration:"00:45",tag:"Trending",poster:"📡"},
 {id:"demo-worlds",title:"Between Two Worlds",genre:"Drama",duration:"02:10",tag:"AI Original",poster:"🌌"},
 {id:"demo-chase",title:"Neon Chase",genre:"Action",duration:"00:58",tag:"Trending",poster:"🏎️"},
 {id:"demo-dawn",title:"The First Dawn",genre:"Short Film",duration:"00:30",tag:"New",poster:"🌅"},
 {id:"demo-love",title:"Love in the Future",genre:"Drama",duration:"01:20",tag:"AI Original",poster:"❤️"}
];

export default function MoviesOnline(){
 const [localUrl,setLocalUrl]=useState(""); const [title,setTitle]=useState("Your Latest Film"); const [active,setActive]=useState("Latest"); const [published,setPublished]=useState(""); const [publishMsg,setPublishMsg]=useState("");
 useEffect(()=>{
  let objectUrl="";
  try{
   const raw=localStorage.getItem("viralmovie-last-project"); if(raw){const p=JSON.parse(raw);setTitle(p.story?.title||"Your Latest Film");}
   const dbReq=indexedDB.open("viralmovie-local",1);
   dbReq.onsuccess=()=>{const db=dbReq.result; if(!db.objectStoreNames.contains("films"))return; const req=db.transaction("films","readonly").objectStore("films").get("latest"); req.onsuccess=()=>{if(req.result){objectUrl=URL.createObjectURL(req.result);setLocalUrl(objectUrl);}};};
  }catch{}
  return()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[]);
 const shown=useMemo(()=>active==="Latest"||active==="AI Originals"?demo:demo.filter(x=>x.genre===active||(active==="Short Films"&&x.genre==="Short Film")||(active==="Trending"&&x.tag==="Trending")),[active]);
 async function publish(){
  if(!localUrl){setPublishMsg("Generate a film first.");return;}
  setPublishMsg("Publishing film...");
  try{const r=await fetch("/api/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:localUrl,title})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||"Publish failed.");setPublished(d.url);setPublishMsg("Published successfully.");}catch(e){setPublishMsg(e instanceof Error?e.message:"Publish failed.");}
 }
 return <main className="stream-page">
  <header className="stream-top"><Link href="/" className="stream-brand">🎬 <b>ViralMovie <span>AI</span></b></Link><nav><Link href="/">Create Film</Link><Link href="/my-films">My Films</Link><Link href="/account">Account</Link></nav></header>
  <section className="stream-hero"><div><div className="hero-kicker">VIRALMOVIE AI • ORIGINALS</div><h1>Movies made with AI.<br/><span>Watch the next story.</span></h1><p>A cinematic home for films created with ViralMovie AI.</p><Link href="/" className="hero-cta">✦ Create a Film</Link></div></section>
  <section className="stream-content"><div className="category-row">{categories.map(c=><button key={c} onClick={()=>setActive(c)} className={active===c?"selected":``}>{c}</button>)}</div>
   {localUrl&&<section className="watch-player"><div className="stream-head"><h2>▶ {title}</h2><span>YOUR FILM</span></div><video src={localUrl} controls playsInline/><div className="button-row"><Link href="/film/latest" className="hero-cta">Open Film Page</Link><button className="secondary" onClick={publish}>🌐 Publish Publicly</button></div>{published&&<p className="publish-success">Public URL ready: <a href={published} target="_blank" rel="noreferrer">Open published film</a></p>}{publishMsg&&<p className="muted">{publishMsg}</p>}</section>}
   <div className="stream-head"><h2>{active}</h2><span>{shown.length} TITLES</span></div><div className="movie-grid">{shown.map(m=><article className="movie-card" key={m.id}><div className="movie-poster"><div className="poster-glow"/><strong>{m.poster}</strong><small>{m.tag}</small></div><div className="movie-meta"><h3>{m.title}</h3><p>{m.genre} • {m.duration}</p><button onClick={()=>alert("This demo title is a catalog placeholder. Create your own film to watch a real generated movie.")}>▶ Watch</button></div></article>)}</div>
   <div className="stream-head my-section"><h2>Publish your own AI film</h2><span>PUBLIC CATALOG</span></div><div className="empty-publish"><div>🌐</div><h3>From private render to public movie</h3><p>Generate your film, trailer and subtitles first. Then publish the final MP4 to permanent storage when Blob is configured. Without storage, the zero-cost prototype keeps your movie locally on your device.</p><Link href="/" className="secondary">Back to Film Studio</Link></div>
  </section><footer className="footer">ViralMovie AI • Movies Online • Watch, create and share AI films.</footer>
 </main>
}
