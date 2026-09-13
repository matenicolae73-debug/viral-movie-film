"use client";
import "./theme.css";
import { useEffect, useState } from "react";

type Movie={slug:string;title:string;description:string;videoUrl:string;publishedAt:string;aiGenerated?:boolean};

export default function Movies(){
  const [movies,setMovies]=useState<Movie[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch('/api/movies',{cache:'no-store'})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Movies unavailable');setMovies(d.movies||[])})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  return <main className="public-page">
    <header className="public-nav">
      <a href="/" className="brand-link"><span className="brand-mark">▶</span><b>FILME AI</b><span>ONLINE</span></a>
      <nav><a href="/">Studio</a><a className="active" href="/movies">Filme AI</a><a href="/credits">Credits</a></nav>
    </header>

    <section className="public-hero">
      <div className="hero-glow" />
      <div className="hero-kicker">FILME AI • ONLINE CINEMA</div>
      <h1>Filme create cu<br/><span>inteligență artificială.</span></h1>
      <p>Descoperă povești originale, lumi cinematografice și filme AI publicate online. O experiență de cinema modernă, creată pentru generația AI.</p>
      <div className="hero-actions">
        <a className="hero-cta" href="/">✦ Creează un film</a>
        <span className="hero-note">AI originals • 4K-ready • cinematic stories</span>
      </div>
    </section>

    <section className="movie-catalog">
      <div className="section-head">
        <div><div className="section-kicker">PREMIERE</div><h2>Filme AI Online</h2></div>
        <span>{movies.length} {movies.length===1?'film':'filme'}</span>
      </div>

      {loading?<div className="info-box">Se încarcă cinematograful...</div>
      :error?<div className="error-box">{error}<br/><small>Conectează Upstash Redis pentru catalogul public.</small></div>
      :movies.length===0?
        <div className="empty-catalog">
          <div className="empty-orb">✦</div>
          <div className="empty-kicker">FIRST PREMIERE</div>
          <h3>Următorul film începe aici.</h3>
          <p>Filmele finalizate pot fi publicate de owner în cinematograful public. Fiecare nouă premieră va apărea aici.</p>
          <a className="watch" href="/">🎬 Creează primul film</a>
        </div>
      :<div className="catalog-grid">
        {movies.map(m=><article className="catalog-card" key={m.slug}>
          <div className="poster-wrap">
            <video muted playsInline preload="metadata" src={m.videoUrl}/>
            <div className="poster-shade" />
            <div className="poster-play">▶</div>
            <span className="ai-badge">AI ORIGINAL</span>
          </div>
          <div className="catalog-body">
            <div className="film-meta">AI FILM <span>•</span> ONLINE</div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <a href={`/movie/${m.slug}`} className="watch">▶ Vezi filmul</a>
          </div>
        </article>)}
      </div>}
    </section>

    <footer>FILME AI ONLINE • Cinema original creat cu AI • <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/acceptable-use">Acceptable Use</a></footer>
  </main>
}
