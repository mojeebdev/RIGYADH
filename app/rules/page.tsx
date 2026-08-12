import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../site-chrome";

export const metadata: Metadata = {
  title: "How to Play RIGYADH — Rules, Ranked Attempts and Operator IDs",
  description: "Learn RIGYADH rules: pressure strikes, reserve banking, MAX DRILL, blowouts, daily ranked attempts, Operator identities and optional profile wallets.",
  alternates: { canonical: "/rules" },
  openGraph: { url: "/rules", title: "How to Play RIGYADH", description: "The complete field rules for practice and ranked drilling." },
};

const faqs = [
  ["What is RIGYADH?", "RIGYADH is an independent 45-second competitive drilling game created for The Saudis community."],
  ["Does practice require an account?", "No. Practice is open and unlimited. It does not consume a ranked attempt."],
  ["How many Operator IDs exist?", "Exactly 5,555 permanent Operator IDs exist, numbered from 0001 to 5555."],
  ["How are Operator numbers assigned?", "After Neon authentication, the server randomly reserves one available number. Numbers cannot be rerolled."],
  ["How many ranked attempts are available?", "Each Operator receives three ranked attempts in every daily field."],
  ["Is a crypto wallet required?", "No. Google or email authentication establishes the account. An Operator may optionally add a public wallet address manually from the authenticated profile."],
];

export default function RulesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
  };
  return (
    <main className="site-shell content-page">
      <div className="scanlines" aria-hidden="true" />
      <SiteHeader />
      <article className="content-article">
        <p className="eyebrow"><span /> FIELD MANUAL</p>
        <h1>How to play RIGYADH</h1>
        <p className="content-lead">Hit the moving pressure window, secure reserves at checkpoints, and decide whether the next kilometre is worth the risk.</p>
        <section><h2>Practice and ranked play</h2><p>Practice is unlimited and needs no account. Ranked play requires a permanent Operator ID and allows three verified attempts per daily field.</p></section>
        <section><h2>Pressure strikes</h2><p>Every clean strike increases depth, reserves and combo. Missing the green pressure window damages rig integrity and leaks unbanked reserves. Three misses cause a blowout.</p></section>
        <section><h2>Bank or MAX DRILL</h2><p>At each reserve checkpoint, an Operator can bank the current reserve or choose MAX DRILL. Banking protects the reserve. MAX DRILL increases the multiplier and narrows the pressure window.</p></section>
        <section><h2>Daily ranking</h2><p>The field board ranks each Operator’s best verified run by depth, then reserve, then earliest submission time. Daily fields reset at 00:00 UTC.</p></section>
        <section className="faq-section"><h2>Frequently asked questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      </article>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
