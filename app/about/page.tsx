import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../site-chrome";

export const metadata: Metadata = {
  title: "About RIGYADH — Created by Mojeeb Titilayo and BlindspotLab",
  description: "RIGYADH is an independent community game created by Mojeeb Titilayo and published by BlindspotLab. It is not affiliated with The Saudis or Robinhood.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "About RIGYADH", description: "The independent community experiment behind the 5,555-rig field." },
};

export default function AboutPage() {
  return (
    <main className="site-shell content-page">
      <div className="scanlines" aria-hidden="true" />
      <SiteHeader />
      <article className="content-article">
        <p className="eyebrow"><span /> ORIGIN TRANSMISSION</p>
        <h1>Built for participation, not observation.</h1>
        <p className="content-lead">RIGYADH is an independent community activation created by product engineer and strategist Mojeeb Titilayo and published by BlindspotLab.</p>
        <section><h2>Creator’s note</h2><blockquote>“I built RIGYADH to give The Saudis community something competitive to do together—not just something new to watch. Practice stays open, while 5,555 authenticated Operators can establish permanent identities and daily field records.”<cite>— Mojeeb Titilayo</cite></blockquote></section>
        <section><h2>Independent by design</h2><p>RIGYADH uses original interface artwork and game mechanics. It is not affiliated with, endorsed by, or operated by The Saudis or Robinhood.</p></section>
        <section><h2>About BlindspotLab</h2><p>BlindspotLab is a product and strategy studio building useful experiments across AI, developer tools, SaaS and Web3.</p><a className="primary-button" href="https://blindspotlab.xyz" target="_blank" rel="noreferrer">Visit BlindspotLab →</a></section>
      </article>
      <SiteFooter />
    </main>
  );
}
