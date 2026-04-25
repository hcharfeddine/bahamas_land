import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, RefreshCw } from "lucide-react";
import { fetchLeaderboard, getStoredUsername, syncSecrets, type LeaderboardRow } from "@/lib/players";
import nattounImg from "@assets/Nattoun_1777028672745.png";

// =============================================================================
// /ranking — Bahamas Land Leaderboard
// Shows the Top 100 citizens ordered by # of secrets unlocked.
// =============================================================================

export default function Ranking() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const me = getStoredUsername().toLowerCase();

  const refresh = async () => {
    setLoading(true);
    // Push our latest local secrets up first so we appear in the ranking.
    await syncSecrets();
    const data = await fetchLeaderboard();
    setRows(data.ranking);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRow = rows.find((r) => r.username.toLowerCase() === me);

  return (
    <Layout showBack={true}>
      <div className="w-full max-w-4xl mx-auto py-2">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-3 px-5 py-2 bg-primary text-black border-4 border-secondary neon-box mb-3"
          >
            <Trophy className="w-7 h-7" />
            <span className="text-2xl md:text-3xl font-black uppercase tracking-widest">
              Citizens Ranking
            </span>
          </motion.div>
          <p className="text-secondary font-mono text-xs md:text-sm uppercase tracking-[0.3em]">
            ▸ Top 100 Loyalists by Secrets Found ◂
          </p>
          <p className="text-primary/70 font-mono text-[10px] md:text-xs mt-1">
            {total} citizen{total === 1 ? "" : "s"} on record
          </p>
        </div>

        {/* President watching */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <motion.img
            src={nattounImg}
            alt=""
            className="w-12 h-12 object-cover border-2 border-primary"
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="text-secondary font-mono text-xs uppercase tracking-widest max-w-[28rem]">
            "I am personally reading every name on this list. Don't make me come down there."
            <span className="block text-primary/70 not-italic mt-0.5 text-[10px]">— President Nattoun</span>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-primary text-primary text-xs font-mono uppercase tracking-widest hover:bg-primary/10 transition disabled:opacity-50"
            data-testid="ranking-refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>

        {/* Table */}
        <div className="border-4 border-primary bg-black/80 neon-box overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_90px_90px] md:grid-cols-[80px_1fr_120px_120px] bg-primary/10 border-b-2 border-primary text-primary font-mono uppercase tracking-widest text-[10px] md:text-xs px-3 py-2">
            <div>Rank</div>
            <div>Citizen</div>
            <div className="text-right">Secrets</div>
            <div className="text-right">NC</div>
          </div>

          {loading && rows.length === 0 && (
            <div className="p-8 text-center text-primary/70 font-mono uppercase tracking-widest text-xs animate-pulse">
              Loading the State Registry…
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="p-8 text-center text-secondary/80 font-mono text-xs uppercase tracking-widest">
              No citizens yet. Be the first to top the board.
            </div>
          )}

          {rows.map((row, i) => {
            const isMe = row.username.toLowerCase() === me;
            const podium =
              row.rank === 1
                ? "text-yellow-300"
                : row.rank === 2
                ? "text-zinc-300"
                : row.rank === 3
                ? "text-orange-400"
                : "text-primary";
            return (
              <motion.div
                key={row.username + row.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.6) }}
                className={`grid grid-cols-[60px_1fr_90px_90px] md:grid-cols-[80px_1fr_120px_120px] items-center px-3 py-2.5 border-b border-primary/20 font-mono text-xs md:text-sm ${
                  isMe ? "bg-secondary/15 border-l-4 border-l-secondary" : ""
                }`}
                data-testid={`ranking-row-${row.rank}`}
              >
                <div className={`flex items-center gap-1 font-black ${podium}`}>
                  {row.rank === 1 && <Crown className="w-3.5 h-3.5" />}
                  {row.rank === 2 && <Medal className="w-3.5 h-3.5" />}
                  {row.rank === 3 && <Medal className="w-3.5 h-3.5" />}
                  #{row.rank}
                </div>
                <div className="truncate">
                  <span className="text-secondary uppercase tracking-widest">
                    {row.username}
                  </span>
                  {isMe && (
                    <span className="ml-2 text-[9px] text-primary/80 uppercase tracking-widest">
                      ★ you
                    </span>
                  )}
                </div>
                <div className="text-right text-primary font-black">
                  {row.secretsCount}
                </div>
                <div className="text-right text-secondary/80">
                  {row.coins.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Personal status if not in the top 100 */}
        {me && !myRow && rows.length > 0 && (
          <div className="mt-4 p-4 border-2 border-dashed border-secondary/60 text-center text-secondary font-mono text-xs uppercase tracking-widest">
            You're not in the Top 100 yet, citizen. Find more secrets.
          </div>
        )}
      </div>
    </Layout>
  );
}
