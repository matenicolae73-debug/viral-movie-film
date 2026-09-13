"use client";
import Link from "next/link";
import { useEffect,useState } from "react";

const categories=["Latest","Trending","AI Originals","Action","Sci-Fi","Drama","Short Films"];
const demo=[
 {title:"Mars: The Forgotten City",genre:"Sci-Fi",duration:"01:00",tag:"AI Original",poster:"🚀"},
 {title:"Last Signal",genre:"Thriller",duration:"00:45",tag:"Trending",poster:"📡"},
 {title:"Between Two Worlds",genre:"Drama",duration:"02:10",tag:"AI Original",poster:"🌌"},
 {title:"Neon Chase",genre:"Action",duration:"00:58",tag:"Trending",poster:"🏎️"},
 {title:"The First Dawn",genre:"Short Film",duration:"00:30",tag:"New",poster:"🌅"},
 {title:"Love in the Future",genre:"Drama",duration:"01:20",tag:"AI Original",poster:"❤️"}
];

export default function MoviesOnline(){
 const [localUrl,setLocalUrl]=useState("");
 useEffect(()=>{(async()=>{try{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open("viralmovie-local",1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});const tx=db.transaction("films","readonly");const req=tx.objectStore("films").get("latest");req.onsuccess=()=>{if(req.result)setLocalUrl(URL.createObjectURL(req.result));};}catch{}})();return()=>{if(localUrl)URL.revokeObjectURL(localUrl)}},[]);
 return <main className="stream-page">
  <header className="stream-top"><Link href="/" className="stream-brand">🎬 <b>ViralMovie <span>AI</span></b></Link><nav><Link href="/">Create Film</Link><Link href="/movies-online">Movies Online</Link><Link href="/account">Account</Link></nav></header>
  <section className="stream-hero"><div><div className="hero-kicker">VIRALMOVIE AI • ORIGINALS</div><h1>Movies made with AI.<br/><span>Watch the next story.</span></h1><p>A cinematic home for films created with ViralMovie AI.</p><Link href="/" className="hero-cta">✦ Create a Film</Link></div></section>
  <section className="stream-content">
   <div className="category-row">{categories.map(c=><button key={c}>{c}</button>)}</div>
   {localUrl&&<section className="watch-player"><div className="stream-head"><h2>▶ Your Latest Film</h2><span>LOCAL PREVIEW</span></div><video src={localUrl} controls playsInline/><p>This is your latest rendered film stored locally on this device.</p></section>}
   <div className="stream-head"><h2>Featured</h2><span>AI CINEMA</span></div>
   <div className="movie-grid">{demo.map(m=><article className="movie-card" key={m.title}><div className="movie-poster"><div className="poster-glow"/><strong>{m.poster}</strong><small>{m.tag}</small></div><div className="movie-meta"><h3>{m.title}</h3><p>{m.genre} • {m.duration}</p><button>▶ Watch</button></div></article>)}</div>
   <div className="stream-head my-section"><h2>Public Publishing</h2><span>READY FOR STORAGE</span></div>
   <div className="empty-publish"><div>🌐</div><h3>Publish your films for everyone</h3><p>The catalog UI is ready. For permanent public playback, connect Vercel Blob or another persistent video storage so the final MP4 gets a public URL.</p><Link href="/" className="secondary">Go to Film Studio</Link></div>
  </section>
  <footer className="footer">ViralMovie AI • Movies Online • Watch, share and discover AI films.</footer>
 </main>
}
