import Link from "next/link";
import type { ReactNode } from "react";

export function Brand() {
  return (
    <Link className="wordmark" href="/" aria-label="RIGYADH home">
      <span className="wordmark-mark"><i /><i /><i /></span>
      <span>RIGYADH</span>
    </Link>
  );
}

export function SiteHeader({ status }: { status?: ReactNode }) {
  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/practice">Practice</Link>
        <Link href="/leaderboard">Field board</Link>
        <Link href="/operator">Operator</Link>
        <Link href="/rules">Rules</Link>
      </nav>
      {status ?? (
        <Link className="status-button" href="/operator">
          <span className="status-light" />Ranked access
        </Link>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Brand />
      <p>
        AN INDEPENDENT COMMUNITY GAME BY{" "}
        <a className="studio-credit" href="https://blindspotlab.xyz" target="_blank" rel="noreferrer">BLINDSPOTLAB</a>.
        <br />NOT AFFILIATED WITH ROBINHOOD OR THE SAUDIS.
      </p>
      <div>
        <Link href="/practice">PRACTICE</Link>
        <Link href="/leaderboard">FIELD BOARD</Link>
        <Link href="/operator">OPERATOR</Link>
        <Link href="/rules">RULES</Link>
        <Link href="/about">ABOUT</Link>
      </div>
    </footer>
  );
}
