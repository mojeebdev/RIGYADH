import type { Metadata } from "next";
import RigyadhClient from "../rigyadh-client";

export const metadata: Metadata = {
  title: "Claim a RIGYADH Operator ID — 5,555 Permanent Identities",
  description: "Sign in with Google or an email magic link, receive one random permanent Operator number from 0001–5555, and choose a unique Field Alias.",
  alternates: { canonical: "/operator" },
  openGraph: { url: "/operator", title: "Claim a RIGYADH Operator ID", description: "One random number. One permanent field record. No wallet required." },
};

export default function OperatorPage() {
  return <RigyadhClient view="operator" />;
}
