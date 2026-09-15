export default function Credits(){
  return <main className="public-page">
    <header className="public-nav"><a href="/" className="brand-link">🎬 ViralMovie <span>AI</span></a><nav><a href="/">Studio</a><a href="/movies">Movies</a><a className="active" href="/credits">Credits</a></nav></header>
    <section className="public-hero compact"><div className="hero-kicker">CREDITS & PLANS</div><h1>Simple plans. Pay for what you generate.</h1><p>Credits are prepared for the future customer billing system. During beta, generation uses the configured AI provider balance. Stripe can be connected later without exposing the server-side AI key.</p></section>
    <section className="credit-balance"><div><span className="credit-label">CURRENT BALANCE</span><strong>0 credits</strong></div><div className="credit-ready">● CREDIT SYSTEM READY</div></section>
    <section className="pricing-grid">
      <article><h3>Starter</h3><strong>100 credits</strong><p>€9</p><button disabled>Stripe checkout — Coming soon</button></article>
      <article className="featured"><h3>Pro</h3><strong>500 credits</strong><p>€29</p><button disabled>Stripe checkout — Coming soon</button></article>
      <article><h3>Business</h3><strong>2,000 credits</strong><p>€99</p><button disabled>Stripe checkout — Coming soon</button></article>
    </section>
    <section className="credit-info"><h2>How credits work</h2><div className="credit-rules"><div><b>540p</b><span>1 credit / second</span></div><div><b>720p</b><span>3 credits / second</span></div><div><b>1080p</b><span>4 credits / second</span></div><div><b>Example</b><span>5-second 540p scene = 5 credits</span></div></div></section>
    <p className="muted center">No payment is taken by this beta page yet. Customer credits and Stripe checkout can be activated when billing is connected.</p>
  </main>
}