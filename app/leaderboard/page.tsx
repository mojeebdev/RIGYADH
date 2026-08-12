import type { Metadata } from "next";
import RigyadhClient from "../rigyadh-client";

export const metadata: Metadata = {
  title: "RIGYADH Daily Leaderboard — Top Operators",
  description: "View the verified RIGYADH daily field leaderboard ranked by drilling depth and secured reserves.",
  alternates: { canonical: "/leaderboard" },
  openGraph: { url: "/leaderboard", title: "RIGYADH Daily Field Board", description: "The deepest verified Operators in today's field." },
};

export default function LeaderboardPage() {
  return <RigyadhClient view="leaderboard" />;
}
