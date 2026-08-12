import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicResult } from "@/lib/public-result";
import { SiteFooter, SiteHeader } from "../../site-chrome";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getPublicResult((await params).id);
  if (!result) return { title: "Field Report Not Found", robots: { index: false, follow: false } };
  const operator = String(result.operatorNumber).padStart(4, "0");
  const title = `Operator #${operator} drilled ${result.depth.toLocaleString()}m — RIGYADH`;
  const description = `${result.alias} banked ${result.reserve.toLocaleString()} reserves in a verified RIGYADH daily field.`;
  return {
    title,
    description,
    alternates: { canonical: `/result/${result.id}` },
    openGraph: { title, description, url: `/result/${result.id}` },
    twitter: { title, description },
  };
}

export default async function ResultPage({ params }: Props) {
  const result = await getPublicResult((await params).id);
  if (!result) notFound();
  const operator = String(result.operatorNumber).padStart(4, "0");
  const text = `RIGYADH field report // Operator #${operator}\n\nDepth: ${result.depth.toLocaleString()}m\nReserves: ${result.reserve.toLocaleString()}\n\nI banked the signal. Can you drill deeper?\n\n#RIGYADH`;
  const url = `https://rigyadh.buzz/result/${result.id}`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `RIGYADH verified field report for Operator #${operator}`,
    url,
    description: `${result.depth} metres deep with ${result.reserve} reserves.`,
  };

  return <main className="site-shell content-page">
    <div className="scanlines" aria-hidden="true" />
    <SiteHeader />
    <article className="content-article result-report">
      <p className="eyebrow"><span /> VERIFIED FIELD REPORT</p>
      <h1>Operator #{operator}</h1>
      <p className="content-lead">{result.alias} completed ranked attempt {result.attemptNumber} in the {result.fieldDate} UTC field.</p>
      <dl className="report-grid">
        <div><dt>Depth</dt><dd>{result.depth.toLocaleString()}m</dd></div>
        <div><dt>Reserve</dt><dd>{result.reserve.toLocaleString()}</dd></div>
        <div><dt>Best combo</dt><dd>{result.bestCombo}</dd></div>
        <div><dt>Strikes</dt><dd>{result.strikes}</dd></div>
      </dl>
      <div className="report-actions"><a className="primary-button" href={shareUrl} target="_blank" rel="noreferrer">Challenge on X →</a><Link className="secondary-button" href="/practice">Enter the field</Link></div>
      <small>Server-replayed result submitted {result.submittedAt.toISOString()}.</small>
    </article>
    <SiteFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
  </main>;
}
