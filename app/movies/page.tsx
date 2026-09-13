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
      <a href="/" className="brand-link"><span className="brand-mark">▶</span><b>AI MOVIES</b><span>ONLINE</span></a>
      <nav><a href="/">Studio</a><a className="active" href="/movies">Filme AI</a><a href="/credits">Credits</a></nav>
    </header>

    <section className="public-hero">
      <div className="hero-glow" />
      <div className="hero-kicker">AI MOVIES • ONLINE CINEMA</div>
      <h1>Movies created with<br/><span>artificial intelligence.</span></h1>
      <p>Discover original stories, cinematic worlds and AI movies published online. A modern streaming experience built for the next generation of moviemaking.</p>
      <div className="hero-actions">
        <a className="hero-cta" href="/">✦ Create a movie</a>
        <span className="hero-note">AI originals • 4K-ready • cinematic stories</span>
      </div>
    </section>

    <section className="movie-catalog">
      <div className="section-head">
        <div><div className="section-kicker">LATEST PREMIERES</div><h2>AI Movies Online</h2></div>
        <span>{movies.length} {movies.length===1?'movie':'moviee'}</span>
      </div>

      {loading?<div className="info-box">Loading the cinema...</div>
      :error?<div className="error-box">{error}<br/><small>Connect Upstash Redis to enable the public catalog.</small></div>
      :movies.length===0?
        <div className="empty-catalog">
          <div className="empty-orb">✦</div>
          <div className="empty-kicker">FIRST LATEST PREMIERES</div>
          <h3>Următorul movie începe aici.</h3>
          <p>Finished movies can be published by the authenticated owner to the public catalog. Every new premiere will appear here.</p>
          <a className="watch" href="/">🎬 Creează primul movie</a>
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
            <div className="movie-meta">AI MOVIE <span>•</span> ONLINE</div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <a href={`/movie/${m.slug}`} className="watch">▶ Vezi movieul</a>
          </div>
        </article>)}
      </div>}
    </section>

    <footer>AI MOVIES ONLINE • Original cinema created with AI • <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/acceptable-use">Acceptable Use</a></footer>
  </main>
}
