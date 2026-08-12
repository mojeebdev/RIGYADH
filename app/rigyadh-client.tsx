"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { parseAuthReturn } from "@/lib/auth-return";
import { SiteFooter, SiteHeader } from "@/app/site-chrome";

type Phase = "idle" | "playing" | "checkpoint" | "ended";
type AuthStep = "options" | "email" | "sent" | "alias" | "claimed";
type Flash = "success" | "miss" | "";
type RunMode = "practice" | "ranked";
export type RigyadhView = "home" | "practice" | "leaderboard" | "operator";

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

type Leader = { rank: number; operator: string; alias: string; depth: number; reserve: number };
type OperatorProfile = { number: string; alias: string; walletAddress?: string | null };
type AuthUser = { id: string; email: string; name?: string | null };
type FieldState = { date: string; closesAt: string; claimedCount: number };
type VerifiedResult = {
  id: string;
  depth: number;
  reserve: number;
  banked: number;
  bestCombo: number;
  strikes: number;
  integrity: number;
  valid: boolean;
};

function seededRandom(seed: string) {
  let value = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    value = Math.imul(value ^ seed.charCodeAt(index), 3432918353);
    value = (value << 13) | (value >>> 19);
  }
  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  };
}

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

export default function RigyadhClient({ view = "home" }: { view?: RigyadhView }) {
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
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [reservedNumber, setReservedNumber] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [toast, setToast] = useState("");
  const [runMode, setRunMode] = useState<RunMode>("practice");
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [field, setField] = useState<FieldState | null>(null);
  const [fieldCountdown, setFieldCountdown] = useState("--:--:--");
  const [verifiedResult, setVerifiedResult] = useState<VerifiedResult | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [leaderboardState, setLeaderboardState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const checkpointDepth = useRef(1000);
  const statsRef = useRef(stats);
  const runStartedAt = useRef(0);
  const randomRef = useRef<() => number>(Math.random);
  const rankedSessionRef = useRef<{ token: string; startedAt: number } | null>(null);
  const rankedActionsRef = useRef<{ type: "drill" | "bank" | "max"; atMs: number }[]>([]);
  const claimRequestRef = useRef(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard?field=today");
      if (!response.ok) throw new Error("Leaderboard unavailable");
      const payload = await response.json() as { leaders: Leader[] };
      setLeaders(payload.leaders);
      setLeaderboardState(payload.leaders.length ? "ready" : "empty");
    } catch {
      setLeaderboardState("error");
    }
  }, []);

  const loadField = async () => {
    try {
      const response = await fetch("/api/field/today");
      if (!response.ok) throw new Error("Field unavailable");
      const payload = await response.json() as { field: FieldState };
      setField(payload.field);
    } catch {
      setToast("FIELD SIGNAL UNAVAILABLE");
    }
  };

  const submitRankedRun = useCallback(async () => {
    const rankedSession = rankedSessionRef.current;
    if (!rankedSession) return;
    rankedSessionRef.current = null;
    try {
      const response = await fetch("/api/runs/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: rankedSession.token, actions: rankedActionsRef.current }),
      });
      const payload = await response.json().catch(() => null) as { run?: VerifiedResult; error?: { message?: string } } | null;
      if (!response.ok || !payload?.run) {
        setToast(payload?.error?.message ?? "RANKED REPORT REJECTED");
        return;
      }
      setVerifiedResult(payload.run);
      setToast("RANKED FIELD REPORT VERIFIED");
      void loadLeaderboard();
    } catch {
      setToast("RANKED REPORT COULD NOT BE SUBMITTED");
    }
  }, [loadLeaderboard]);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!field?.closesAt) return;
    const update = () => {
      const remaining = Math.max(0, new Date(field.closesAt).getTime() - Date.now());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setFieldCountdown([hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":"));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [field?.closesAt]);

  useEffect(() => {
    if (phase !== "playing" && phase !== "checkpoint") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        const next = Math.max(0, current - 0.1);
        if (next <= 0) {
          window.clearInterval(timer);
          setStats((run) => ({ ...run, banked: run.banked + run.unbanked, unbanked: 0 }));
          setFeedback("SHIFT COMPLETE // RESERVES SECURED");
          setPhase("ended");
          void submitRankedRun();
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, submitRankedRun]);

  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    const draw = (now: number) => {
      const speed = 0.00052 + statsRef.current.multiplier * 0.00008;
      const wave = (Math.sin((now - runStartedAt.current) * speed * Math.PI * 2) + 1) / 2;
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

  const startRun = async () => {
    let seed: string | null = null;
    if (runMode === "ranked") {
      const response = await fetch("/api/runs/start", { method: "POST" });
      const payload = await response.json().catch(() => null) as { run?: { token: string; seed: string; attemptNumber: number; attemptsRemaining: number }; error?: { message?: string } } | null;
      if (!response.ok || !payload?.run) {
        setToast(payload?.error?.message ?? "RANKED FIELD UNAVAILABLE");
        return;
      }
      seed = payload.run.seed;
      rankedSessionRef.current = { token: payload.run.token, startedAt: performance.now() };
      rankedActionsRef.current = [];
      setAttemptsRemaining(payload.run.attemptsRemaining);
      setToast("RANKED ATTEMPT " + payload.run.attemptNumber + " OF 3");
    } else {
      rankedSessionRef.current = null;
      rankedActionsRef.current = [];
    }
    setStats(EMPTY_RUN);
    statsRef.current = EMPTY_RUN;
    runStartedAt.current = performance.now();
    randomRef.current = seed ? seededRandom(seed) : Math.random;
    setTimeLeft(45);
    setTarget({ start: 0.36, width: 0.2 });
    checkpointDepth.current = 1000;
    setFeedback("PRESSURE WINDOW ACQUIRED");
    setFlash("");
    setVerifiedResult(null);
    setPhase("playing");
  };

  const finishBlowout = () => {
    setStats((run) => ({ ...run, unbanked: 0, integrity: 0 }));
    setFeedback("BLOWOUT // UNBANKED RESERVES LOST");
    setPhase("ended");
    void submitRankedRun();
  };

  const drill = () => {
    if (phase !== "playing") return;
    if (rankedSessionRef.current) {
      rankedActionsRef.current.push({ type: "drill", atMs: Math.round(performance.now() - rankedSessionRef.current.startedAt) });
    }
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
      const nextStart = 0.08 + randomRef.current() * (0.84 - nextWidth);
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
    if (rankedSessionRef.current) {
      rankedActionsRef.current.push({ type: "bank", atMs: Math.round(performance.now() - rankedSessionRef.current.startedAt) });
    }
    setStats((run) => ({ ...run, banked: run.banked + run.unbanked, unbanked: 0 }));
    setFeedback("RESERVES BANKED // DRILLING RESUMED");
    setPhase("playing");
  };

  const maxDrill = () => {
    if (rankedSessionRef.current) {
      rankedActionsRef.current.push({ type: "max", atMs: Math.round(performance.now() - rankedSessionRef.current.startedAt) });
    }
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
    const resultDepth = verifiedResult?.depth ?? stats.depth;
    const resultReserve = verifiedResult?.reserve ?? totalReserve;
    const url = verifiedResult?.id
      ? `${window.location.origin}/result/${verifiedResult.id}`
      : `${window.location.origin}/practice`;
    const text = `RIGYADH field report // ${identity}\n\nDepth: ${formatNumber(resultDepth)}m\nReserves: ${formatNumber(resultReserve)}\n\nI banked the signal. Can you drill deeper?\n\n#RIGYADH`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };

  const copyResult = async () => {
    const url = verifiedResult?.id ? `${window.location.origin}/result/${verifiedResult.id}` : `${window.location.origin}/practice`;
    const result = `RIGYADH // ${formatNumber(verifiedResult?.depth ?? stats.depth)}m deep // ${formatNumber(verifiedResult?.reserve ?? totalReserve)} reserves // ${url}`;
    await navigator.clipboard?.writeText(result);
    setToast("FIELD REPORT COPIED");
  };

  const refreshOperator = async () => {
    const response = await fetch("/api/operators/me", { cache: "no-store" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(payload?.error?.message ?? "Operator profile is unavailable.");
    }
    const payload = await response.json() as { operator: { number: number; fieldAlias: string; walletAddress?: string | null } | null; attemptsRemaining?: number };
    if (typeof payload.attemptsRemaining === "number") setAttemptsRemaining(payload.attemptsRemaining);
    if (!payload.operator) return null;
    const nextOperator = { number: String(payload.operator.number).padStart(4, "0"), alias: payload.operator.fieldAlias, walletAddress: payload.operator.walletAddress };
    setOperator(nextOperator);
    return nextOperator;
  };

  const refreshAuthSession = async () => {
    const { data, error } = await authClient.getSession();
    if (error) throw new Error(error.message ?? "Authentication session is unavailable.");
    const user = data?.user
      ? { id: data.user.id, email: data.user.email, name: data.user.name }
      : null;
    setAuthUser(user);
    return user;
  };

  const reserveIdentity = async () => {
    const response = await fetch("/api/operators/reserve", { method: "POST" });
    const payload = await response.json().catch(() => null) as {
      status?: "reserved" | "claimed";
      reservation?: { number: string };
      operator?: { number: number; fieldAlias: string; walletAddress?: string | null };
      error?: { message?: string };
    } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? "Operator reservation unavailable.");

    if (payload?.status === "claimed" && payload.operator) {
      const existing = {
        number: String(payload.operator.number).padStart(4, "0"),
        alias: payload.operator.fieldAlias,
        walletAddress: payload.operator.walletAddress,
      };
      setOperator(existing);
      setAuthStep("claimed");
      setClaimOpen(true);
      return;
    }
    if (!payload?.reservation?.number) throw new Error("Operator reservation was not returned.");
    setReservedNumber(payload.reservation.number);
    setAuthStep("alias");
    setClaimOpen(true);
  };

  const saveWallet = async (event: FormEvent) => {
    event.preventDefault();
    if (!operator || walletBusy || !walletInput.trim()) return;
    setWalletBusy(true);
    try {
      const response = await fetch("/api/operators/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: walletInput.trim() }),
      });
      const payload = await response.json().catch(() => null) as { walletAddress?: string; error?: { message?: string } } | null;
      if (!response.ok || !payload?.walletAddress) {
        throw new Error(payload?.error?.message ?? "Wallet could not be saved.");
      }
      setOperator((current) => current ? { ...current, walletAddress: payload.walletAddress } : current);
      setWalletInput("");
      setToast("WALLET ADDED TO PROFILE");
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "WALLET COULD NOT BE SAVED");
    } finally {
      setWalletBusy(false);
    }
  };

  const openClaim = async () => {
    if (claimRequestRef.current) return;
    claimRequestRef.current = true;
    setAuthBusy(true);
    try {
      const user = await refreshAuthSession();
      if (!user) {
        setAuthStep("options");
        setClaimOpen(true);
        return;
      }
      const existing = await refreshOperator();
      if (existing) {
        setAuthStep("claimed");
        setClaimOpen(true);
        return;
      }
      await reserveIdentity();
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "CLAIM FLOW UNAVAILABLE");
    } finally {
      claimRequestRef.current = false;
      setAuthBusy(false);
    }
  };

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || authBusy) return;
    setAuthBusy(true);
    try {
      const { error } = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: "/operator?claim=1",
        errorCallbackURL: "/operator?auth_error=magic-link",
      });
      if (error) throw new Error(error.message ?? "Magic link could not be sent.");
      setAuthStep("sent");
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "MAGIC LINK COULD NOT BE SENT");
    } finally {
      setAuthBusy(false);
    }
  };

  const completeClaim = async (event: FormEvent) => {
    event.preventDefault();
    if (authBusy) return;
    const cleaned = alias.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 16);
    if (cleaned.length < 3) return;
    setAuthBusy(true);
    try {
      const response = await fetch("/api/operators/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alias: cleaned }),
      });
      const payload = await response.json().catch(() => null) as { operator?: { number: number; fieldAlias: string }; error?: { code?: string; message?: string } } | null;
      if (!response.ok || !payload?.operator) {
        if (payload?.error?.code === "RESERVATION_REQUIRED") {
          await reserveIdentity();
          setToast("RESERVATION REFRESHED — CONFIRM YOUR ALIAS AGAIN");
          return;
        }
        throw new Error(payload?.error?.message ?? "Field alias unavailable.");
      }
      const claimed = { number: String(payload.operator.number).padStart(4, "0"), alias: payload.operator.fieldAlias };
      setOperator(claimed);
      setReservedNumber(null);
      setAuthStep("claimed");
      setToast("OPERATOR #" + claimed.number + " IS ONLINE");
      void loadField();
      void loadLeaderboard();
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "FIELD ALIAS UNAVAILABLE");
    } finally {
      setAuthBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/operator?claim=1",
        newUserCallbackURL: "/operator?claim=1",
        errorCallbackURL: "/operator?auth_error=google",
      });
      if (error) throw new Error(error.message ?? "Google sign-in unavailable.");
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "GOOGLE SIGN-IN UNAVAILABLE");
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign out failed.");
      setAuthUser(null);
      setOperator(null);
      setReservedNumber(null);
      setAuthStep("options");
      setToast("SIGNED OUT");
    } catch (error) {
      setToast(error instanceof Error ? error.message.toUpperCase() : "SIGN OUT FAILED");
    } finally {
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const authReturn = parseAuthReturn(window.location.search, window.location.pathname);
      const resumeClaim = view === "operator" && authReturn.resumeClaim;
      const authError = authReturn.authError;
      if (resumeClaim) {
        claimRequestRef.current = true;
        setAuthBusy(true);
      }
      try {
        const user = await refreshAuthSession();
        if (cancelled) return;
        if (user) {
          const existing = await refreshOperator();
          if (cancelled) return;
          if (resumeClaim) {
            if (existing) {
              setAuthStep("claimed");
              setClaimOpen(true);
            } else {
              await reserveIdentity();
            }
          }
        } else if (resumeClaim) {
          setAuthStep("options");
          setClaimOpen(true);
        }
      } catch (error) {
        if (!cancelled) setToast(error instanceof Error ? error.message.toUpperCase() : "AUTHENTICATION UNAVAILABLE");
      } finally {
        if (!cancelled) {
          claimRequestRef.current = false;
          setAuthBusy(false);
          setAuthReady(true);
          if (authError) {
            setAuthStep("options");
            setClaimOpen(true);
            setToast("SIGN-IN WAS NOT COMPLETED — PLEASE TRY AGAIN");
          }
          if (authReturn.hasAuthReturn) window.history.replaceState(window.history.state, "", authReturn.cleanPath);
        }
      }
    };

    void bootstrap();
    const initialDataTimer = window.setTimeout(() => {
      void loadField();
      if (view === "leaderboard" || view === "practice") void loadLeaderboard();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(initialDataTimer);
    };
    // Initial page hydration; callback handling deliberately runs once per route load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={`site-shell ${flash ? `is-${flash}` : ""}`}>
      <div className="scanlines" aria-hidden="true" />
      <SiteHeader status={
        <Link className="status-button" href="/operator">
          <span className="status-light" />
          {operator ? `#${operator.number}` : authUser ? "SIGNED IN" : field ? `${formatNumber(field.claimedCount)} / 5,555 CLAIMED` : "RANKED ACCESS"}
        </Link>
      } />

      {view === "home" && <><section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> FIELD TRANSMISSION // 001</p>
          <h1><span>5,555 rigs.</span><br />One field.</h1>
          <p className="hero-subtitle">Strike the pressure window. Secure your reserves. Or push past safe depth and <strong>MAX DRILL.</strong></p>
          <div className="hero-actions">
            <Link className="primary-button" href="/practice">Enter practice <Icon name="arrow" /></Link>
            <Link className="text-button" href="/operator">Claiming protocol <span>↗</span></Link>
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

      <section className="answer-section" aria-labelledby="what-is-rigyadh">
        <p className="eyebrow"><span /> FIELD BRIEF</p>
        <h2 id="what-is-rigyadh">What is RIGYADH?</h2>
        <p>RIGYADH is an independent, competitive drilling game created for The Saudis community. Anyone can practise, while authenticated players can claim one of 5,555 permanent Operator IDs and compete in verified daily fields.</p>
        <div className="route-grid">
          <Link href="/practice"><small>01</small><strong>Practise the field</strong><span>Learn the pressure window without using a ranked attempt. →</span></Link>
          <Link href="/leaderboard"><small>02</small><strong>Read the field board</strong><span>See verified daily depth and reserve records. →</span></Link>
          <Link href="/operator"><small>03</small><strong>Claim an Operator</strong><span>Use Neon Google or magic-link authentication—no wallet required. →</span></Link>
        </div>
      </section></>}

      {view === "practice" && <section className="game-section page-section" id="game">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> LIVE SIMULATION</p><h1>Pressure control</h1></div>
          <p>Tap inside the extraction window. Miss three times and the unbanked reserve is gone.</p>
        </div>

        <div className="game-layout">
          <div className="game-terminal" tabIndex={0} onKeyDown={handleGameKey} aria-label="RIGYADH drilling game. Use space or enter to drill.">
            <div className="terminal-bar">
              <span><i className={phase === "playing" ? "live" : ""} /> {runMode === "ranked" ? "RANKED FIELD" : "FIELD SIMULATION"}</span>
              <div><span>FIELD: {field?.date ? `RYD-${field.date.replaceAll("-", "")}` : "CONNECTING"}</span><button onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Mute sound" : "Enable sound"}><Icon name="sound" /> {soundOn ? "ON" : "OFF"}</button></div>
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

                {phase === "idle" && <div className="game-overlay"><p>DAILY FIELD // {runMode.toUpperCase()}</p><h3>Find the signal beneath the sand.</h3><button className="primary-button" onClick={startRun}>{runMode === "ranked" ? "Start ranked run" : "Start drilling"} <Icon name="arrow" /></button><button className="text-button" onClick={() => setRunMode((mode) => mode === "practice" ? "ranked" : "practice")}>{runMode === "practice" ? "Enter ranked play" : "Return to practice"} <span>↗</span></button><small>{runMode === "ranked" ? `${attemptsRemaining} of 3 verified attempts remain today.` : "Tap, click, SPACE or ENTER"}</small></div>}
                {phase === "checkpoint" && <div className="game-overlay checkpoint-overlay"><p>RESERVE POCKET // {formatNumber(stats.unbanked)} UNBANKED</p><h3>Secure it, or risk the field.</h3><div><button className="secondary-button" onClick={bankReserve}>Bank reserve</button><button className="danger-button" onClick={maxDrill}>MAX DRILL</button></div><small>MAX DRILL increases output and narrows the pressure window.</small></div>}
                {phase === "ended" && <div className="game-overlay result-overlay"><p>FIELD REPORT // {verifiedResult ? "RANKED & VERIFIED" : "PRACTICE COMPLETE"}</p><h3>{formatNumber(verifiedResult?.depth ?? stats.depth)}M DEEP</h3><div className="result-pair"><span><small>RESERVE</small>{formatNumber(verifiedResult?.reserve ?? totalReserve)}</span><span><small>{verifiedResult ? "STATUS" : "PROJECTED RANK"}</small>{verifiedResult ? "VERIFIED" : `#${formatNumber(estimatedRank)}`}</span></div>{verifiedResult?.id && <Link className="verified-link" href={`/result/${verifiedResult.id}`}>OPEN VERIFIED FIELD REPORT →</Link>}<div className="result-actions"><button className="primary-button" onClick={shareResult}><Icon name="x" /> Challenge on X</button><button className="icon-button" onClick={copyResult} aria-label="Copy result"><Icon name="copy" /></button></div><button className="retry-button" onClick={startRun}>DRILL AGAIN</button>{!operator && <button className="claim-after" onClick={openClaim}>Claim an Operator ID to enter ranked play →</button>}</div>}
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
      </section>}

      {view === "leaderboard" && <section className="leaderboard-section page-section" id="leaderboard">
        <div className="section-heading compact">
          <div><p className="eyebrow"><span /> DAILY FIELD</p><h1>Top operators</h1></div>
          <div className="reset-clock"><span>NEXT FIELD</span><strong>{fieldCountdown}</strong></div>
        </div>
        <div className="leaderboard">
          <div className="leaderboard-head"><span>RANK</span><span>OPERATOR</span><span>FIELD ALIAS</span><span>DEPTH</span><span>RESERVE</span></div>
          {leaderboardState === "loading" && <div className="leaderboard-note"><span /> LOADING VERIFIED FIELD DATA</div>}
          {leaderboardState === "ready" && leaders.map((leader) => <div className="leaderboard-row" key={leader.rank}><span className="rank">{String(leader.rank).padStart(2, "0")}</span><span>#{leader.operator}</span><strong>{leader.alias}</strong><span>{formatNumber(leader.depth)}m</span><span>{formatNumber(leader.reserve)}</span></div>)}
          {leaderboardState === "empty" && <div className="leaderboard-note"><span /> NO VERIFIED RUNS IN THIS FIELD YET</div>}
          {leaderboardState === "error" && <div className="leaderboard-note"><span /> FIELD BOARD OFFLINE — RETRY SHORTLY</div>}
        </div>
      </section>}

      {view === "operator" && <section className="profile-section page-section" id="profile">
        <div className="profile-copy"><p className="eyebrow"><span /> OPERATOR IDENTITY</p><h1>One number.<br />One field record.</h1><p>Practice is open. Ranked access belongs to 5,555 permanent Operator IDs—claimed with Google or a magic link. Wallets stay optional.</p></div>
        <div className="identity-card">
          <div className="identity-top"><span>{operator ? `OPERATOR #${operator.number}` : authUser ? "ACCOUNT AUTHENTICATED" : "UNCLAIMED SIGNAL"}</span><i className={operator || authUser ? "active" : ""}>{operator ? "ONLINE" : authUser ? "READY TO CLAIM" : authReady ? "OFFLINE" : "SYNCING"}</i></div>
          <div className="identity-main"><div className="operator-avatar"><span /><i /><b>{operator?.number ?? "?"}</b></div><div><small>{operator ? "FIELD ALIAS" : authUser ? "SIGNED-IN ACCOUNT" : "FIELD ALIAS"}</small><h3>{operator?.alias ?? (authUser ? authUser.name || "Signal received" : "Claim your place")}</h3><p>{operator ? `Permanent identity secured. ${attemptsRemaining} ranked attempt${attemptsRemaining === 1 ? "" : "s"} remain in today's field.` : authUser ? `${authUser.email} is authenticated. Complete the claim to receive a permanent random number.` : "Sign in, then claim a random permanent number from 0001–5555."}</p></div></div>
          <div className="identity-actions">
            {!operator ? <button className="primary-button" onClick={openClaim} disabled={authBusy || !authReady}>{!authReady || authBusy ? "Checking signal…" : authUser ? "Complete identity" : "Claim identity"} <Icon name="arrow" /></button> : <button className="secondary-button" onClick={openClaim} disabled={authBusy}>Identity details</button>}
            {operator && <Link className="wallet-button" href="/practice">Enter ranked field <Icon name="arrow" /></Link>}
            {authUser && <button className="wallet-button" onClick={signOut} disabled={authBusy}>Sign out</button>}
          </div>
          {operator && <div className="wallet-profile">
            <div><small>PROFILE WALLET // OPTIONAL</small><p>{operator.walletAddress ?? "Paste a public EVM address. No wallet connection or signature is requested."}</p></div>
            {!operator.walletAddress && <form onSubmit={saveWallet}><label htmlFor="wallet-address">Wallet address</label><input id="wallet-address" value={walletInput} onChange={(event) => setWalletInput(event.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false} /><button className="secondary-button" type="submit" disabled={walletBusy}>{walletBusy ? "Saving…" : "Add wallet"}</button></form>}
            <small className="wallet-disclaimer">Manually added profile detail; it does not verify wallet ownership.</small>
          </div>}
        </div>
      </section>}

      <SiteFooter />

      {claimOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClaimOpen(false); }}>
        <div className="claim-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title">
          <button className="modal-close" onClick={() => setClaimOpen(false)} aria-label="Close claim dialog">×</button><p className="eyebrow"><span /> CLAIM PROTOCOL</p>
          {authStep === "options" && <><h2 id="claim-title">Enter the ranked field.</h2><p>Secure one permanent Operator ID. No wallet required.</p><div className="auth-options"><button onClick={continueWithGoogle} disabled={authBusy}><Icon name="google" /><span><strong>{authBusy ? "Opening Google…" : "Continue with Google"}</strong><small>Fastest route to the field</small></span><b>→</b></button><button onClick={() => setAuthStep("email")} disabled={authBusy}><Icon name="mail" /><span><strong>Continue with magic link</strong><small>No password to remember</small></span><b>→</b></button></div></>}
          {authStep === "email" && <form onSubmit={sendMagicLink}><button type="button" className="back-button" onClick={() => setAuthStep("options")} disabled={authBusy}>← Back</button><h2 id="claim-title">Receive the signal.</h2><p>We’ll send a single-use sign-in link to your inbox.</p><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" autoFocus disabled={authBusy} /></label><button className="primary-button" type="submit" disabled={authBusy}>{authBusy ? "Sending…" : "Send magic link"} <Icon name="arrow" /></button></form>}
          {authStep === "sent" && <><div className="sent-mark"><Icon name="mail" /></div><h2 id="claim-title">Transmission sent.</h2><p>Check <strong>{email}</strong>. The link will return you to your Operator claim.</p><button className="secondary-button full" onClick={() => setClaimOpen(false)}>Return to field</button></>}
          {authStep === "alias" && <form onSubmit={completeClaim}><h2 id="claim-title">Name your operator.</h2><p>Your number is random and permanent. Your Field Alias is yours.</p><label>Field Alias<input value={alias} onChange={(event) => setAlias(event.target.value)} minLength={3} maxLength={16} placeholder="DESERTMO" autoFocus disabled={authBusy} /><small>3–16 letters, numbers, dashes or underscores.</small></label><div className="number-preview"><span>RANDOM ASSIGNMENT</span><strong>#{reservedNumber ?? "????"}</strong></div><button className="primary-button" type="submit" disabled={authBusy}>{authBusy ? "Bringing rig online…" : "Bring rig online"} <Icon name="arrow" /></button></form>}
          {authStep === "claimed" && operator && <><div className="claimed-number"><small>OPERATOR</small><strong>#{operator.number}</strong></div><h2 id="claim-title">{operator.alias} is online.</h2><p>Your permanent Operator identity is ready. A public wallet address can be added manually from this authenticated profile.</p><button className="primary-button full" onClick={() => { setClaimOpen(false); document.querySelector("#profile")?.scrollIntoView({ behavior: "smooth" }); }}>View profile <Icon name="arrow" /></button></>}
        </div>
      </div>}
      {toast && <div className="toast"><span /> {toast}</div>}
    </main>
  );
}
