"use client";

import { useEffect, useState } from "react";

type Movie={slug:string;title:string;description:string;videoUrl:string;posterUrl?:string;trailerUrl?:string;publishedAt:string;aiGenerated?:boolean};

export default function MoviePage({params}:{params:Promise<{slug:string}>}){
  const [slug,setSlug]=useState("");
  const [movie,setMovie]=useState<Movie|null>(null);
  const [likes,setLikes]=useState(0);
  const [views,setViews]=useState(0);
  const [liked,setLiked]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{ params.then(({slug})=>setSlug(slug)); },[params]);
  useEffect(()=>{
    if(!slug)return;
    fetch(`/api/movies?slug=${encodeURIComponent(slug)}`,{cache:"no-store"}).then(async r=>{const d=await r.json(); if(!r.ok)throw new Error(d.error||"Movie unavailable."); const found=(d.movies||[]).find((m:Movie)=>m.slug===slug); if(!found)throw new Error("Movie not found."); setMovie(found);}).catch(e=>setError(e.message));
    fetch(`/api/movies/interaction?slug=${encodeURIComponent(slug)}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d?.ok){setLikes(d.likes||0);setViews(d.views||0);}}).catch(()=>{});
    fetch("/api/movies/interaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,action:"view"})}).then(r=>r.json()).then(d=>{if(d?.ok)setViews(d.count||0);}).catch(()=>{});
  },[slug]);

  async function like(){
    if(liked||!slug)return;
    setLiked(true);
    const r=await fetch("/api/movies/interaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,action:"like"})});
    const d=await r.json().catch(()=>({}));
    if(d?.ok)setLikes(d.count||likes+1); else setLiked(false);
  }
  function share(){
    const url=window.location.href;
    if(navigator.share){navigator.share({title:movie?.title||"ViralMovie AI",url}).catch(()=>{});} else navigator.clipboard?.writeText(url).then(()=>{});
  }

  if(error)return <main className="public-page"><section className="watch-page"><a href="/movies" className="watch">← Back to Movies</a><div className="error-box">{error}</div></section></main>;
  if(!movie)return <main className="public-page"><section className="watch-page"><div className="info-box">Loading movie...</div></section></main>;

  return <main className="public-page">
    <header className="public-nav"><a href="/movies" className="brand-link">🎬 ViralMovie <span>AI</span></a><nav><a href="/">Studio</a><a href="/movies">Movies</a></nav></header>
    <section className="watch-page">
      <span className="ai-badge">AI GENERATED · CURATED</span>
      <h1>{movie.title}</h1><p>{movie.description}</p>
      <div className="watch-stats"><span>👁️ {views.toLocaleString()} views</span><span>❤️ {likes.toLocaleString()} likes</span><span>• Published {new Date(movie.publishedAt).toLocaleDateString("en-US")}</span></div>
      <video controls playsInline preload="metadata" poster={movie.posterUrl||undefined} src={movie.videoUrl}/>
      {movie.trailerUrl && <div className="trailer-block"><b>🎞️ Official Trailer</b><video controls playsInline preload="metadata" src={movie.trailerUrl}/></div>}
      <div className="watch-actions"><a href="/movies" className="watch">← Back to Movies</a><button onClick={like} className={liked?"liked":""}>{liked?"♥ Liked":"♡ Like"}</button><button onClick={share}>↗ Share</button></div>
      <div className="watch-about"><h2>About this movie</h2><p>Created and curated with ViralMovie AI. Watch, share and discover original AI cinema.</p></div>
    </section>
  </main>
}
