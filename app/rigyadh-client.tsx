"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "checkpoint" | "ended";
type AuthStep = "options" | "email" | "sent" | "alias" | "claimed";
type Flash = "success" | "miss" | "";

type RunStats = {
  depth: number;
  banked: number;
  unbanked: number;
  integrity: number;
  combo: number;
  bestCombo: number;
  multiplier: number;
  strikes: number;
};

const EMPTY_RUN: RunStats = {
  depth: 0,
  banked: 0,
  unbanked: 0,
  integrity: 100,
  combo: 0,
  bestCombo: 0,
  multiplier: 1,
  strikes: 0,
};

const LEADERS = [
  { rank: "01", operator: "#3606", alias: "NIGHTFALCON", depth: "6,840m", reserve: "28,420" },
  { rank: "02", operator: "#1102", alias: "SANDSIGNAL", depth: "6,510m", reserve: "26,880" },
  { rank: "03", operator: "#5551", alias: "GREENWATCH", depth: "6,240m", reserve: "24,910" },
  { rank: "04", operator: "#2839", alias: "DEEPFIELD", depth: "5,960m", reserve: "22,740" },
  { rank: "05", operator: "#0417", alias: "DESERTMO", depth: "5,720m", reserve: "21,330" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function Icon({ name }: { name: "arrow" | "x" | "sound" | "copy" | "wallet" | "google" | "mail" }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    x: <path d="M5 4l14 16M19 4 5 20" />,
    sound: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9c1.2 1.5 1.2 4.5 0 6M19 6c3.5 3.5 3.5 8.5 0 12" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    wallet: <><path d="M4 7h15v12H4z" /><path d="M4 7l2-3h10l3 3M15 12h5v4h-5z" /></>,
    google: <path d="M20 12.2c0-.7-.1-1.4-.2-2.2H12v4h4.5a4 4 0 0 1-1.7 2.6v2.7h3.4c2-1.8 3.1-4.3 3.1-7.1Z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 7 8 6 8-6" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function RigyadhClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stats, setStats] = useState<RunStats>(EMPTY_RUN);
  const [timeLeft, setTimeLeft] = useState(45);
  const [needle, setNeedle] = useState(0.05);
  const needleRef = useRef(0.05);
  const [target, setTarget] = useState({ start: 0.36, width: 0.2 });
  const targetRef = useRef(target);
  const [feedback, setFeedback] = useState("AWAITING INPUT");
  const [flash, setFlash] = useState<Flash>("");
  const [soundOn, setSoundOn] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("options");
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("DESERTMO");
  const [operator, setOperator] = useState<{ number: string; alias: string } | null>(null);
  const [walletLinked, setWalletLinked] = useState(false);
  const [toast, setToast] = useState("");
  const checkpointDepth = useRef(1000);
  const statsRef = useRef(stats);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        const next = Math.max(0, current - 0.1);
        if (next <= 0) {
          window.clearInterval(timer);
          setStats((run) => ({ ...run, banked: run.banked + run.unbanked, unbanked: 0 }));
          setFeedback("SHIFT COMPLETE // RESERVES SECURED");
          setPhase("ended");
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    const draw = (now: number) => {
      const speed = 0.00052 + statsRef.current.multiplier * 0.00008;
      const wave = (Math.sin(now * speed * Math.PI * 2) + 1) / 2;
      needleRef.current = wave;
      setNeedle(wave);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const chirp = (good: boolean) => {
    if (!soundOn || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = good ? "square" : "sawtooth";
      oscillator.frequency.setValueAtTime(good ? 480 : 110, context.currentTime);
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch {
      // Audio is an optional enhancement and never blocks gameplay.
    }
  };

  const startRun = () => {
    setStats(EMPTY_RUN);
    statsRef.current = EMPTY_RUN;
    setTimeLeft(45);
    setTarget({ start: 0.36, width: 0.2 });
    checkpointDepth.current = 1000;
    setFeedback("PRESSURE WINDOW ACQUIRED");
    setFlash("");
    setPhase("playing");
  };

  const finishBlowout = () => {
    setStats((run) => ({ ...run, unbanked: 0, integrity: 0 }));
    setFeedback("BLOWOUT // UNBANKED RESERVES LOST");
    setPhase("ended");
  };

  const drill = () => {
    if (phase !== "playing") return;
    const position = needleRef.current;
    const zone = targetRef.current;
    const hit = position >= zone.start && position <= zone.start + zone.width;
    chirp(hit);

    if (hit) {
      setFlash("success");
      window.setTimeout(() => setFlash(""), 160);
      setStats((run) => {
        const combo = run.combo + 1;
        const depthGain = Math.round(105 + combo * 19 * run.multiplier);
        const reserveGain = Math.round((90 + combo * 24) * run.multiplier);
        const depth = run.depth + depthGain;
        const next = {
          ...run,
          depth,
          unbanked: run.unbanked + reserveGain,
          integrity: Math.min(100, run.integrity + 3),
          combo,
          bestCombo: Math.max(run.bestCombo, combo),
          strikes: run.strikes + 1,
        };
        statsRef.current = next;
        if (depth >= checkpointDepth.current) {
          checkpointDepth.current += 1000;
          setFeedback("RESERVE POCKET DETECTED");
          window.setTimeout(() => setPhase("checkpoint"), 150);
        } else {
          setFeedback(combo >= 5 ? `CLEAN STRIKE // COMBO ${combo}` : "RESERVE CONTACT");
        }
        return next;
      });
      const nextWidth = Math.max(0.075, zone.width - 0.007);
      const nextStart = 0.08 + Math.random() * (0.84 - nextWidth);
      setTarget({ start: nextStart, width: nextWidth });
    } else {
      setFlash("miss");
      window.setTimeout(() => setFlash(""), 220);
      setStats((run) => {
        const integrity = Math.max(0, run.integrity - 34);
        const next = {
          ...run,
          integrity,
          combo: 0,
          unbanked: Math.round(run.unbanked * 0.68),
        };
        statsRef.current = next;
        if (integrity <= 0) window.setTimeout(finishBlowout, 80);
        return next;
      });
      setFeedback("PRESSURE LOSS // RESERVE LEAK");
    }
  };

  const bankReserve = () => {
    setStats((run) => ({ ...run, banked: run.banked + run.unbanked, unbanked: 0 }));
    setFeedback("RESERVES BANKED // DRILLING RESUMED");
    setPhase("playing");
  };

  const maxDrill = () => {
    setStats((run) => ({ ...run, multiplier: Math.min(4, run.multiplier + 0.5) }));
    setTarget((zone) => ({ ...zone, width: Math.max(0.065, zone.width - 0.02) }));
    setFeedback("MAX DRILL ENGAGED // PRESSURE RISING");
    setPhase("playing");
  };

  const handleGameKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    if (phase === "idle" || phase === "ended") startRun();
    else if (phase === "playing") drill();
  };

  const totalReserve = stats.banked + stats.unbanked;
  const estimatedRank = Math.max(1, 5555 - Math.round(totalReserve / 5.25));

  const shareResult = () => {
    const identity = operator ? `Operator #${operator.number}` : "Unranked driller";
    const text = `RIGYADH field report // ${identity}\n\nDepth: ${formatNumber(stats.depth)}m\nReserves: ${formatNumber(totalReserve)}\n\nI banked the signal. Can you drill deeper?\n\n#RIGYADH`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const copyResult = async () => {
    const result = `RIGYADH // ${formatNumber(stats.depth)}m deep // ${formatNumber(totalReserve)} reserves`;
    await navigator.clipboard?.writeText(result);
    setToast("FIELD REPORT COPIED");
  };

  const openClaim = () => {
    setAuthStep(operator ? "claimed" : "options");
    setClaimOpen(true);
  };

  const sendMagicLink = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setAuthStep("sent");
  };

  const completeClaim = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = alias.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 16);
    if (cleaned.length < 3) return;
    setOperator({ number: "0417", alias: cleaned });
    setAuthStep("claimed");
    setToast("OPERATOR #0417 IS ONLINE");
  };

  return (
    <main className={`site-shell ${flash ? `is-${flash}` : ""}`}>
      <div className="scanlines" aria-hidden="true" />
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="RIGYADH home">
          <span className="wordmark-mark"><i /><i /><i /></span><span>RIGYADH</span>
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#game">Practice</a><a href="#leaderboard">Field board</a><a href="#profile">Operator</a>
        </nav>
        <button className="status-button" onClick={openClaim}>
          <span className="status-light" />{operator ? `#${operator.number}` : "0 / 5,555 ONLINE"}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> FIELD TRANSMISSION // 001</p>
          <h1><span>5,555 rigs.</span><br />One field.</h1>
          <p className="hero-subtitle">Strike the pressure window. Secure your reserves. Or push past safe depth and <strong>MAX DRILL.</strong></p>
          <div className="hero-actions">
            <a className="primary-button" href="#game">Enter practice <Icon name="arrow" /></a>
            <button className="text-button" onClick={openClaim}>Claiming protocol <span>↗</span></button>
          </div>
          <div className="hero-meta">
            <div><span>FIELD</span><strong>RIGYADH-01</strong></div>
            <div><span>SHIFT</span><strong>45 SECONDS</strong></div>
            <div><span>ACCESS</span><strong>OPEN PRACTICE</strong></div>
          </div>
        </div>

        <div className="rig-scene" aria-label="Animated oil rig field illustration">
          <div className="sun-disc" /><div className="dune dune-back" /><div className="dune dune-front" />
          <div className="rig-tower">
            <span className="rig-tip" /><span className="rig-leg left" /><span className="rig-leg right" />
            <span className="rig-cross c1" /><span className="rig-cross c2" /><span className="rig-cross c3" /><span className="rig-cross c4" /><span className="rig-deck" />
          </div>
          <div className="pumpjack"><span className="pump-head" /><span className="pump-arm" /><span className="pump-post" /></div>
          <div className="signal-column"><span /><span /><span /></div>
          <p className="scene-code">RESERVE SIGNAL<br /><strong>BELOW 0000M</strong></p>
        </div>
      </section>

      <section className="game-section" id="game">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> LIVE SIMULATION</p><h2>Pressure control</h2></div>
          <p>Tap inside the extraction window. Miss three times and the unbanked reserve is gone.</p>
        </div>

        <div className="game-layout">
          <div className="game-terminal" tabIndex={0} onKeyDown={handleGameKey} aria-label="RIGYADH drilling game. Use space or enter to drill.">
            <div className="terminal-bar">
              <span><i className={phase === "playing" ? "live" : ""} /> FIELD SIMULATION</span>
              <div><span>SEED: RYD-0812</span><button onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Mute sound" : "Enable sound"}><Icon name="sound" /> {soundOn ? "ON" : "OFF"}</button></div>
            </div>
            <div className="telemetry-row">
              <div><span>DEPTH</span><strong>{formatNumber(stats.depth)}<small>M</small></strong></div>
              <div><span>RESERVE</span><strong>{formatNumber(totalReserve)}</strong></div>
              <div><span>TIME</span><strong>{timeLeft.toFixed(1)}<small>S</small></strong></div>
              <div><span>MULTIPLIER</span><strong>{stats.multiplier.toFixed(1)}<small>X</small></strong></div>
            </div>

            <div className="drill-field">
              <div className="depth-lines" aria-hidden="true"><span>0000</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span></div>
              <div className="bore-line"><i style={{ height: `${Math.min(92, stats.depth / 55)}%` }} /></div>
              <div className="drill-head" style={{ top: `${Math.min(84, 8 + stats.depth / 62)}%` }} aria-hidden="true"><span /></div>
              <div className="field-copy">
                <span className="field-label">PRESSURE CHANNEL</span>
                <div className="pressure-track" aria-label="Pressure timing meter">
                  <div className="pressure-ticks" /><div className="target-zone" style={{ left: `${target.start * 100}%`, width: `${target.width * 100}%` }} /><div className="pressure-needle" style={{ left: `${needle * 100}%` }} />
                </div>
                <div className="integrity-line"><span>RIG INTEGRITY</span><div><i style={{ width: `${stats.integrity}%` }} /></div><strong>{stats.integrity}%</strong></div>
                <p className={`field-feedback ${flash}`}>{feedback}</p>

                {phase === "idle" && <div className="game-overlay"><p>DAILY FIELD // PRACTICE</p><h3>Find the signal beneath the sand.</h3><button className="primary-button" onClick={startRun}>Start drilling <Icon name="arrow" /></button><small>Tap, click, SPACE or ENTER</small></div>}
                {phase === "checkpoint" && <div className="game-overlay checkpoint-overlay"><p>RESERVE POCKET // {formatNumber(stats.unbanked)} UNBANKED</p><h3>Secure it, or risk the field.</h3><div><button className="secondary-button" onClick={bankReserve}>Bank reserve</button><button className="danger-button" onClick={maxDrill}>MAX DRILL</button></div><small>MAX DRILL increases output and narrows the pressure window.</small></div>}
                {phase === "ended" && <div className="game-overlay result-overlay"><p>FIELD REPORT // RUN COMPLETE</p><h3>{formatNumber(stats.depth)}M DEEP</h3><div className="result-pair"><span><small>RESERVE</small>{formatNumber(totalReserve)}</span><span><small>EST. RANK</small>#{formatNumber(estimatedRank)}</span></div><div className="result-actions"><button className="primary-button" onClick={shareResult}><Icon name="x" /> Challenge on X</button><button className="icon-button" onClick={copyResult} aria-label="Copy result"><Icon name="copy" /></button></div><button className="retry-button" onClick={startRun}>DRILL AGAIN</button>{!operator && <button className="claim-after" onClick={openClaim}>Claim an Operator ID to enter ranked play →</button>}</div>}
                {phase === "playing" && <button className="drill-button" onClick={drill}><span>DRILL</span><small>HIT THE GREEN</small></button>}
              </div>
            </div>
          </div>

          <aside className="run-panel">
            <div className="panel-heading"><span>RUN DATA</span><i>{phase.toUpperCase()}</i></div>
            <dl>
              <div><dt>Banked</dt><dd>{formatNumber(stats.banked)}</dd></div>
              <div><dt>At risk</dt><dd className="risk">{formatNumber(stats.unbanked)}</dd></div>
              <div><dt>Current combo</dt><dd>{stats.combo}×</dd></div>
              <div><dt>Best combo</dt><dd>{stats.bestCombo}×</dd></div>
              <div><dt>Clean strikes</dt><dd>{stats.strikes}</dd></div>
            </dl>
            <div className="rule-card"><span>FIELD RULE 01</span><p>Only banked reserves survive a blowout. Going deeper pays more—and protects nothing.</p></div>
            <div className="operator-mini"><span>{operator ? `#${operator.number}` : "#????"}</span><div><small>OPERATOR</small><strong>{operator?.alias ?? "UNCLAIMED"}</strong></div><button onClick={openClaim}>{operator ? "VIEW" : "CLAIM"}</button></div>
          </aside>
        </div>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div className="section-heading compact">
          <div><p className="eyebrow"><span /> DAILY FIELD</p><h2>Top operators</h2></div>
          <div className="reset-clock"><span>NEXT FIELD</span><strong>07:42:18</strong></div>
        </div>
        <div className="leaderboard">
          <div className="leaderboard-head"><span>RANK</span><span>OPERATOR</span><span>FIELD ALIAS</span><span>DEPTH</span><span>RESERVE</span></div>
          {LEADERS.map((leader) => <div className="leaderboard-row" key={leader.rank}><span className="rank">{leader.rank}</span><span>{leader.operator}</span><strong>{leader.alias}</strong><span>{leader.depth}</span><span>{leader.reserve}</span></div>)}
          <div className="leaderboard-note"><span /> SIMULATED FIELD DATA — RANKED BOARD ACTIVATES WITH OPERATOR CLAIMS</div>
        </div>
      </section>

      <section className="profile-section" id="profile">
        <div className="profile-copy"><p className="eyebrow"><span /> OPERATOR IDENTITY</p><h2>One number.<br />One field record.</h2><p>Practice is open. Ranked access belongs to 5,555 permanent Operator IDs—claimed with Google or a magic link. Wallets stay optional.</p></div>
        <div className="identity-card">
          <div className="identity-top"><span>{operator ? `OPERATOR #${operator.number}` : "UNCLAIMED SIGNAL"}</span><i className={operator ? "active" : ""}>{operator ? "ONLINE" : "OFFLINE"}</i></div>
          <div className="identity-main"><div className="operator-avatar"><span /><i /><b>{operator?.number ?? "?"}</b></div><div><small>FIELD ALIAS</small><h3>{operator?.alias ?? "Claim your place"}</h3><p>{operator ? "Identity secured for this simulation." : "Complete a run, then claim a random number from 0001–5555."}</p></div></div>
          <div className="identity-actions">
            {!operator ? <button className="primary-button" onClick={openClaim}>Claim identity <Icon name="arrow" /></button> : <button className="secondary-button" onClick={openClaim}>Identity details</button>}
            <button className="wallet-button" disabled={!operator} onClick={() => { setWalletLinked(true); setToast("WALLET LINK PREVIEWED"); }}><Icon name="wallet" /> {walletLinked ? "0x71F2…0417" : "Link wallet — optional"}</button>
          </div>
        </div>
      </section>

      <footer><a className="wordmark" href="#top"><span className="wordmark-mark"><i /><i /><i /></span><span>RIGYADH</span></a><p>AN INDEPENDENT COMMUNITY GAME CONCEPT.<br />NOT AFFILIATED WITH ROBINHOOD OR THE SAUDIS.</p><div><a href="#game">PRACTICE</a><a href="#leaderboard">FIELD BOARD</a><a href="#profile">OPERATOR</a></div></footer>

      {claimOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClaimOpen(false); }}>
        <div className="claim-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title">
          <button className="modal-close" onClick={() => setClaimOpen(false)} aria-label="Close claim dialog">×</button><p className="eyebrow"><span /> CLAIM PROTOCOL</p>
          {authStep === "options" && <><h2 id="claim-title">Enter the ranked field.</h2><p>Secure one permanent Operator ID. No wallet required.</p><div className="auth-options"><button onClick={() => setAuthStep("alias")}><Icon name="google" /><span><strong>Continue with Google</strong><small>Fastest route to the field</small></span><b>→</b></button><button onClick={() => setAuthStep("email")}><Icon name="mail" /><span><strong>Continue with magic link</strong><small>No password to remember</small></span><b>→</b></button></div><small className="prototype-note">Prototype flow: no live identity will be reserved.</small></>}
          {authStep === "email" && <form onSubmit={sendMagicLink}><button type="button" className="back-button" onClick={() => setAuthStep("options")}>← Back</button><h2 id="claim-title">Receive the signal.</h2><p>We’ll send a single-use sign-in link to your inbox.</p><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" autoFocus /></label><button className="primary-button" type="submit">Send magic link <Icon name="arrow" /></button></form>}
          {authStep === "sent" && <><div className="sent-mark"><Icon name="mail" /></div><h2 id="claim-title">Transmission sent.</h2><p>Check <strong>{email}</strong>. The link will return you to your Operator claim.</p><button className="secondary-button full" onClick={() => setAuthStep("alias")}>Preview verified state</button></>}
          {authStep === "alias" && <form onSubmit={completeClaim}><h2 id="claim-title">Name your operator.</h2><p>Your number is random and permanent. Your Field Alias is yours.</p><label>Field Alias<input value={alias} onChange={(event) => setAlias(event.target.value)} minLength={3} maxLength={16} placeholder="DESERTMO" autoFocus /><small>3–16 letters, numbers, dashes or underscores.</small></label><div className="number-preview"><span>RANDOM ASSIGNMENT</span><strong>#????</strong></div><button className="primary-button" type="submit">Bring rig online <Icon name="arrow" /></button></form>}
          {authStep === "claimed" && operator && <><div className="claimed-number"><small>OPERATOR</small><strong>#{operator.number}</strong></div><h2 id="claim-title">{operator.alias} is online.</h2><p>Your practice identity is ready. Link a wallet later from your profile if you want holder verification.</p><button className="primary-button full" onClick={() => { setClaimOpen(false); document.querySelector("#profile")?.scrollIntoView({ behavior: "smooth" }); }}>View profile <Icon name="arrow" /></button></>}
        </div>
      </div>}
      {toast && <div className="toast"><span /> {toast}</div>}
    </main>
  );
}
