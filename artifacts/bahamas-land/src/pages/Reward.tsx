import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import {
  claimReward,
  getProgress,
  getStoredClaim,
  type ClaimResult,
} from "@/lib/rewardClient";
import { ACHIEVEMENTS, unlock } from "@/lib/achievements";
import { useLocalStorage } from "@/lib/store";
import nattounImg from "@assets/Nattoun_1777028672745.png";

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

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        ref={imgRef}
        src={nattounImg}
        alt=""
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        width={520}
        height={720}
        className="max-w-full h-auto border-4 border-primary neon-box bg-black"
        style={{ imageRendering: "auto" }}
      />
      <button
        onClick={downloadImage}
        className="px-4 py-2 border-2 border-primary text-primary font-mono uppercase text-xs neon-box hover:bg-primary/20"
      >
        Download .png
      </button>
    </div>
  );
}

export default function Reward() {
  const [username] = useLocalStorage<string>("ogs_username", "Citizen");
  const [stored, setStored] = useState<ClaimResult | null>(() => getStoredClaim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    fullCount: number;
    top100Remaining: number;
  } | null>(null);

  const progress = useMemo(() => getProgress(), [stored]);

  useEffect(() => {
    const base = (import.meta as any).env?.BASE_URL || "/";
    const apiBase = base.endsWith("/") ? base.slice(0, -1) : base;
    fetch(`${apiBase}/api/reward/status`)
      .then((r) => r.json())
      .then((d) => setServerStatus({
        fullCount: Number(d.fullCount) || 0,
        top100Remaining: Number(d.top100Remaining) || 0,
      }))
      .catch(() => { /* offline ok */ });
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
