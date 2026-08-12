import type { Metadata } from "next";
import RigyadhClient from "./rigyadh-client";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "RIGYADH — 5,555 rigs. One field.",
  description: "Play RIGYADH, an independent competitive drilling game with open practice and 5,555 permanent ranked Operator identities.",
};

export default function Home() {
  return <RigyadhClient view="home" />;
}
