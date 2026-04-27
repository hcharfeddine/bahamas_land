import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import {
  claimReward,
  fetchRewardStatus,
  getProgress,
  getStoredClaim,
  type ClaimResult,
} from "@/lib/rewardClient";
import { ACHIEVEMENTS, unlock } from "@/lib/achievements";
import { useLocalStorage } from "@/lib/store";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import ogsLogo from "@assets/ogs_1777329100263.png";

// =============================================================================
// /reward — Top-100 Server-Verified Reward
//
// Flow:
//   1. We compute local progress (count unlocked achievements out of required).
//   2. If complete, the player can press "CLAIM". The server validates the
//      list and mints a citizen number + seed.
//   3. The seed is rendered as a unique generative NFT-style poster
//      (Canvas2D, no AI). The image cannot be fabricated from the console
//      because the seed and citizen number come from the server.
// =============================================================================

function FastSeedRand(seedHex: string) {
  // xorshift32 seeded from a hex string
  let s = parseInt(seedHex.slice(0, 8), 16) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17; s >>>= 0;
    s ^= s << 5;  s >>>= 0;
    return (s & 0xffffff) / 0xffffff;
  };
}

function NattounNFT({
  seed,
  citizenNumber,
  username,
  isTop100,
}: {
  seed: string;
  citizenNumber: number;
  username: string;
  isTop100: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  const [flipped, setFlipped] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string>("");

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el || autoSpin) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const px = x / r.width;
    const py = y / r.height;
    // tilt up to ~22 degrees
    const ry = (px - 0.5) * 44;
    const rx = -(py - 0.5) * 32;
    setTilt({ rx, ry, mx: px * 100, my: py * 100, active: true });
  }
  function onMouseLeave() {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el || autoSpin) return;
    const t = e.touches[0];
    if (!t) return;
    const r = el.getBoundingClientRect();
    const px = (t.clientX - r.left) / r.width;
    const py = (t.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 44;
    const rx = -(py - 0.5) * 32;
    setTilt({ rx, ry, mx: px * 100, my: py * 100, active: true });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const rand = FastSeedRand(seed);

    // ---- background gradient (seeded palette) ----
    const hueA = Math.floor(rand() * 360);
    const hueB = (hueA + 60 + Math.floor(rand() * 180)) % 360;
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, `hsl(${hueA} 80% 18%)`);
    grd.addColorStop(0.5, `hsl(${(hueA + hueB) / 2} 75% 12%)`);
    grd.addColorStop(1, `hsl(${hueB} 80% 22%)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // ---- starfield ----
    for (let i = 0; i < 220; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = rand() * 1.6 + 0.2;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- aura behind portrait ----
    const cx = W / 2;
    const cy = H * 0.46;
    const auraColor = `hsl(${hueB} 100% 60%)`;
    const auraGrd = ctx.createRadialGradient(cx, cy, 30, cx, cy, W * 0.55);
    auraGrd.addColorStop(0, auraColor);
    auraGrd.addColorStop(0.4, `${auraColor.replace("60%", "55%")}`);
    auraGrd.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = auraGrd;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // ---- geometric rays ----
    ctx.save();
    ctx.translate(cx, cy);
    const rayCount = 24 + Math.floor(rand() * 24);
    const rayHue = `hsl(${hueA} 100% 70%)`;
    for (let i = 0; i < rayCount; i++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const len = 180 + rand() * 200;
      ctx.lineTo(0, -len);
      ctx.strokeStyle = `${rayHue.replace("70%", `${60 + rand() * 30}%`)}`;
      ctx.globalAlpha = 0.18 + rand() * 0.22;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // ---- Nattoun portrait (drawn from <img>) ----
    const drawPortrait = () => {
      const img = imgRef.current;
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const size = 240;
      // halo ring
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 14, 0, Math.PI * 2);
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // clip circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();

      // ---- text overlay ----
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "900 38px 'Inter', system-ui, sans-serif";
      ctx.fillText("PRESIDENT NATTOUN", cx, 60);

      ctx.fillStyle = `hsl(${hueA} 100% 75%)`;
      ctx.font = "700 16px 'Inter', system-ui, sans-serif";
      ctx.fillText(
        isTop100 ? "TOP-100 LOYALIST · OFFICIAL DIGITAL ICON" : "BAHAMAS LAND CITIZEN ICON",
        cx,
        86,
      );

      ctx.fillStyle = "white";
      ctx.font = "800 28px 'Inter', system-ui, sans-serif";
      ctx.fillText(`CITIZEN #${String(citizenNumber).padStart(4, "0")}`, cx, H - 96);

      ctx.fillStyle = `hsl(${hueB} 100% 80%)`;
      ctx.font = "600 18px 'Inter', system-ui, sans-serif";
      ctx.fillText(username.toUpperCase(), cx, H - 70);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillText(`SEED ${seed.toUpperCase()} · BAHAMAS LAND OFFICIAL`, cx, H - 40);

      // ---- frame ----
      ctx.strokeStyle = `hsl(${hueB} 100% 60%)`;
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, W - 40, H - 40);

      // Snapshot canvas → data URL so the 3D card front face can render it
      try {
        setCardDataUrl(canvas.toDataURL("image/png"));
      } catch { /* tainted canvas — ignore */ }
    };

    if (imgRef.current?.complete) drawPortrait();
    else if (imgRef.current) imgRef.current.onload = drawPortrait;
  }, [seed, citizenNumber, username, isTop100]);

  function downloadImage() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `bahamas-land-citizen-${citizenNumber}-${seed}.png`;
    a.click();
  }

  // Combined Y rotation: tilt + flip + auto-spin
  const flipDeg = flipped ? 180 : 0;
  const spinDeg = autoSpin ? 360 : 0;
  const ry = tilt.ry + flipDeg + spinDeg;
  const rx = tilt.rx;
  const mx = tilt.mx;
  const my = tilt.my;
  const lift = tilt.active ? 1.04 : 1;

  // Holo color shifts with mouse position (Pokemon-style rainbow)
  const holoHueA = Math.round((mx / 100) * 360);
  const holoHueB = (holoHueA + 120) % 360;
  const holoHueC = (holoHueA + 240) % 360;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <img
        ref={imgRef}
        src={nattounImg}
        alt=""
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />

      {/* Hidden canvas — used as the texture source for the front face */}
      <canvas
        ref={canvasRef}
        width={520}
        height={720}
        style={{ display: "none" }}
      />

      {/* 3D card stage */}
      <div
        ref={wrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseLeave}
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          width: "min(100%, 360px)",
          aspectRatio: "520 / 720",
          perspective: "1400px",
          touchAction: "none",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transition: tilt.active && !autoSpin
              ? "transform 80ms ease-out"
              : "transform 900ms cubic-bezier(.2,.9,.25,1)",
            transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${lift})`,
          }}
        >
          {/* FRONT FACE */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[18px] border-4 border-primary neon-box bg-black"
            style={{
              backfaceVisibility: "hidden",
              boxShadow:
                "0 30px 60px -10px rgba(0,0,0,0.7), 0 18px 36px -18px rgba(255,0,200,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset",
            }}
          >
            {cardDataUrl && (
              <img
                src={cardDataUrl}
                alt="Citizen NFT"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            )}

            {/* HOLO LAYER 1 — rainbow shimmer (mouse-tracked) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(${105 + (mx - 50) * 0.8}deg,
                  hsla(${holoHueA},100%,70%,0.55) 0%,
                  hsla(${holoHueB},100%,65%,0.45) 35%,
                  hsla(${holoHueC},100%,70%,0.55) 70%,
                  hsla(${holoHueA},100%,75%,0.45) 100%)`,
                mixBlendMode: "color-dodge",
                opacity: tilt.active ? 0.85 : 0.45,
                transition: "opacity 200ms ease",
              }}
            />

            {/* HOLO LAYER 2 — diagonal prism stripes (foil texture) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  ${115 + (mx - 50) * 0.6}deg,
                  rgba(255,0,128,0.18) 0px,
                  rgba(0,255,255,0.18) 8px,
                  rgba(255,255,0,0.18) 16px,
                  rgba(0,255,128,0.18) 24px,
                  rgba(255,0,255,0.18) 32px)`,
                mixBlendMode: "soft-light",
                opacity: tilt.active ? 0.9 : 0.35,
                transition: "opacity 200ms ease",
              }}
            />

            {/* HOLO LAYER 3 — bright glare spot following the cursor */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(
                  circle at ${mx}% ${my}%,
                  rgba(255,255,255,0.55) 0%,
                  rgba(255,255,255,0.18) 18%,
                  rgba(255,255,255,0) 45%)`,
                mixBlendMode: "overlay",
                opacity: tilt.active ? 1 : 0.4,
                transition: "opacity 200ms ease",
              }}
            />

            {/* TOP-100 sparkle border accent */}
            {isTop100 && (
              <div
                className="absolute inset-0 pointer-events-none rounded-[14px]"
                style={{
                  boxShadow:
                    "inset 0 0 60px rgba(255,215,0,0.45), inset 0 0 120px rgba(255,0,200,0.25)",
                }}
              />
            )}
          </div>

          {/* BACK FACE — Bahamas Land presidential seal */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[18px] border-4 border-pink-500 neon-box flex flex-col items-center justify-center text-center px-6"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "radial-gradient(circle at 50% 35%, hsl(300 80% 22%) 0%, hsl(280 90% 10%) 55%, #000 100%)",
              boxShadow:
                "0 30px 60px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08) inset",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  ${45}deg,
                  rgba(255,0,200,0.07) 0px 4px,
                  transparent 4px 10px)`,
              }}
            />
            <img
              src={ogsLogo}
              alt="OGS"
              className="w-28 h-28 mb-4 object-contain drop-shadow-[0_0_24px_rgba(255,0,200,0.75)]"
              draggable={false}
            />
            <div className="text-primary font-black uppercase tracking-[0.25em] text-xl neon-text">
              Bahamas Land
            </div>
            <div className="text-pink-300 font-mono text-[10px] uppercase tracking-widest mt-2">
              Office of the President
            </div>
            <div className="mt-6 border-t-2 border-pink-400/40 pt-4 px-6">
              <div className="text-white/80 font-mono text-[10px] uppercase">
                Citizen Number
              </div>
              <div className="text-yellow-200 font-black text-3xl tracking-widest">
                #{String(citizenNumber).padStart(4, "0")}
              </div>
              <div className="text-white/60 font-mono text-[9px] mt-3">
                SEED · {seed.toUpperCase()}
              </div>
              <div className="text-white/40 font-mono text-[9px] mt-1">
                {isTop100 ? "TOP-100 LOYALIST" : "CERTIFIED CITIZEN"}
              </div>
            </div>
            <div className="absolute bottom-3 text-pink-400/60 font-mono text-[9px] uppercase tracking-widest">
              Authentic. Audited. Holographic.
            </div>
          </div>
        </div>

        {/* Soft floor shadow that reacts to tilt */}
        <div
          className="absolute left-1/2 -bottom-4 -translate-x-1/2 pointer-events-none rounded-full"
          style={{
            width: "70%",
            height: "18px",
            background: "radial-gradient(ellipse, rgba(0,0,0,0.6), transparent 70%)",
            filter: "blur(6px)",
            transform: `translate(calc(-50% + ${tilt.ry * 0.6}px), 0)`,
            opacity: tilt.active ? 0.9 : 0.5,
            transition: "opacity 250ms ease",
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-2">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="px-4 py-2 border-2 border-pink-500 text-pink-300 font-mono uppercase text-xs neon-box hover:bg-pink-500/20"
        >
          {flipped ? "◀ Show front" : "Flip card ▶"}
        </button>
        <button
          onClick={() => {
            setAutoSpin(true);
            window.setTimeout(() => setAutoSpin(false), 950);
          }}
          className="px-4 py-2 border-2 border-yellow-400 text-yellow-200 font-mono uppercase text-xs neon-box hover:bg-yellow-400/20"
        >
          ↻ Spin 360
        </button>
        <button
          onClick={downloadImage}
          className="px-4 py-2 border-2 border-primary text-primary font-mono uppercase text-xs neon-box hover:bg-primary/20"
        >
          ⬇ Download .png
        </button>
      </div>

      <div className="text-secondary font-mono text-[10px] uppercase tracking-widest mt-1 text-center max-w-xs">
        Move your mouse over the card · holographic foil · click flip to see the back
      </div>
    </div>
  );
}

export default function Reward() {
  const [username] = useLocalStorage<string>("ogs_username", "Citizen");
  const [stored, setStored] = useState<ClaimResult | null>(() => getStoredClaim());

  // Demo preview: /reward?demo=1 (or ?demo=top) — lets you see the 3D card
  // without actually claiming. Does NOT touch storage / server.
  const demoMode = useMemo(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    const d = q.get("demo");
    if (!d) return null;
    return {
      seed: q.get("seed") || "BAHAMAS2026",
      citizenNumber: Number(q.get("n")) || 42,
      username: username || "Citizen",
      isTop100: d === "top" || d === "1",
    };
  }, [username]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    fullCount: number;
    top100Remaining: number;
  } | null>(null);

  const progress = useMemo(() => getProgress(), [stored]);

  useEffect(() => {
    fetchRewardStatus().then((s) => {
      if (s) setServerStatus({ fullCount: s.fullCount, top100Remaining: s.top100Remaining });
    });
  }, []);

  async function onClaim() {
    setLoading(true);
    setError(null);
    const cleanName = (username || "Citizen").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "Citizen";
    const result = await claimReward(cleanName);
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "incomplete") {
        setError(`Server says you are missing ${result.missing?.length ?? "?"} secret(s). Reload and try again.`);
      } else if (result.reason === "network") {
        setError("Server unreachable. The dog is asleep. Try again.");
      } else {
        setError(`Claim failed: ${result.reason || "unknown"}`);
      }
      return;
    }
    setStored(result);
    unlock("oracle");
  }

  const total = progress.total;
  const have = progress.have;
  const pct = Math.round((have / Math.max(1, total)) * 100);
  const complete = have >= total;

  // Demo preview mode — show the 3D card with fake data
  if (demoMode) {
    return (
      <Layout showBack={true}>
        <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="text-5xl mb-2">{demoMode.isTop100 ? "👑" : "🏅"}</div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-primary neon-text">
              {demoMode.isTop100 ? "TOP-100 LOYALIST" : "OFFICIAL CITIZEN"}
            </h1>
            <div className="text-yellow-300 font-mono text-[11px] uppercase mt-1">
              ⚠ DEMO PREVIEW — not a real claim
            </div>
          </div>
          <NattounNFT
            seed={demoMode.seed}
            citizenNumber={demoMode.citizenNumber}
            username={demoMode.username}
            isTop100={demoMode.isTop100}
          />
        </div>
      </Layout>
    );
  }

  // Already claimed → show their NFT
  if (stored?.ok && stored.seed && typeof stored.citizenNumber === "number") {
    return (
      <Layout showBack={true}>
        <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="text-5xl mb-2">{stored.isTop100 ? "👑" : "🏅"}</div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-primary neon-text">
              {stored.isTop100 ? "TOP-100 LOYALIST" : "OFFICIAL CITIZEN"}
            </h1>
            <div className="text-secondary font-mono text-xs uppercase mt-1">
              Citizen #{String(stored.citizenNumber).padStart(4, "0")} · {stored.username}
            </div>
            <div className="text-white/70 font-mono text-[11px] mt-1">
              Server-issued · seed {String(stored.seed).toUpperCase()} · this image cannot be forged from the console
            </div>
          </div>

          <NattounNFT
            seed={stored.seed}
            citizenNumber={stored.citizenNumber}
            username={stored.username || "Citizen"}
            isTop100={!!stored.isTop100}
          />

          {serverStatus && (
            <div className="text-secondary font-mono text-[11px] uppercase">
              {serverStatus.fullCount} citizens have claimed · {serverStatus.top100Remaining} top-100 slots left
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBack={true}>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔮</div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-primary neon-text">
            The Oracle
          </h1>
          <div className="text-secondary font-mono text-xs uppercase mt-1">
            Server-verified Top-100 Loyalist Reward
          </div>
        </div>

        <div className="bg-black/85 border-4 border-pink-500 p-5 neon-box mb-5">
          <div className="text-pink-300 font-mono text-[11px] uppercase tracking-widest mb-2">
            Briefing from President Nattoun
          </div>
          <p className="text-white/90 leading-relaxed text-sm">
            Every secret in this country is being counted. Find them all — typed words,
            chemins, console traps, gestures, the chess board — and the Court of OGs will
            mint you a one-of-one digital portrait of the President. The first 100 finishers
            get the <strong className="text-primary">TOP-100 LOYALIST</strong> stamp.
            Server-verified. Cannot be cooked from the console.
          </p>
        </div>

        <div className="bg-black/85 border-2 border-primary p-5 neon-box mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-primary font-black uppercase tracking-widest text-lg">
              Your collection
            </div>
            <div className="font-mono text-2xl font-black text-secondary">
              {have} / {total}
            </div>
          </div>
          <div className="w-full bg-black border-2 border-primary/40 h-4 overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 80 }}
              className="h-full bg-primary"
              style={{ boxShadow: "0 0 12px hsl(var(--primary))" }}
            />
          </div>
          <div className="text-secondary font-mono text-[10px] uppercase mt-2">
            {pct}% of all secrets unlocked
          </div>
          {!complete && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-pink-300 font-mono text-[11px] uppercase tracking-widest list-none flex items-center gap-2">
                <span className="group-open:hidden">▶ Show what you're missing ({progress.missing.length})</span>
                <span className="hidden group-open:inline">▼ Hide missing</span>
              </summary>
              <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto text-xs font-mono pr-2">
                {progress.missing.map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id);
                  return (
                    <li key={id} className="border-l-2 border-red-500/60 pl-2 text-white/75">
                      <span className="text-red-300">{a?.emoji ?? "❓"}</span>{" "}
                      <span className="text-secondary uppercase">{a?.name ?? id}</span>
                      <div className="text-white/55 text-[11px]">{a?.hint ?? "???"}</div>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>

        <button
          disabled={!complete || loading}
          onClick={onClaim}
          className="w-full py-4 border-4 border-primary text-primary font-black text-xl uppercase tracking-widest neon-box hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading
            ? "claiming…"
            : complete
              ? "▶ CLAIM YOUR ICON"
              : `Find ${total - have} more secret(s) to claim`}
        </button>

        {error && (
          <div className="mt-4 border-2 border-red-500 bg-red-500/10 text-red-300 p-3 font-mono text-xs">
            {error}
          </div>
        )}

        {serverStatus && (
          <div className="mt-4 text-center text-secondary font-mono text-[11px] uppercase">
            {serverStatus.fullCount} citizens worldwide · {serverStatus.top100Remaining} top-100 slots remaining
          </div>
        )}
      </div>
    </Layout>
  );
}
