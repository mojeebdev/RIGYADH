import type { Metadata } from "next";
import RigyadhClient from "../rigyadh-client";

export const metadata: Metadata = {
  title: "Play RIGYADH Practice — Pressure Control Drilling Game",
  description: "Practise RIGYADH without signing in or consuming a ranked attempt. Strike the pressure window, bank reserves, and decide when to MAX DRILL.",
  alternates: { canonical: "/practice" },
  openGraph: { url: "/practice", title: "Play RIGYADH Practice", description: "How deep can you drill in 45 seconds?" },
};

export default function PracticePage() {
  return <RigyadhClient view="practice" />;
}
