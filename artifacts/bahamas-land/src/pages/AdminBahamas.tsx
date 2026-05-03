import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured, ADMIN_EMAIL, RemoteMuseumItem, RemoteCourtVerdict } from "@/lib/supabase";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import {
  ShieldCheck, Trash2, Check, LogOut, AlertTriangle, Pin, PinOff,
  Scale, Image as ImageIcon, Users, Ban, RefreshCw, ShieldOff, Search, Zap,
} from "lucide-react";

type Section = "museum" | "court" | "players" | "bans" | "suspects";
type Filter = "pending" | "approved" | "rejected";

type AdminPlayer = {
  username: string;
  secrets: string[];
  secrets_count: number;
  coins: number;
  created_at: string;
  updated_at: string;
};

type BannedUser = {
  id: string;
  username_lower: string;
  original_username: string | null;
  reason: string;
  banned_at: string;
};

export default function AdminBahamas() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<Section>("museum");
  const [filter, setFilter] = useState<Filter>("pending");

  const [museumItems, setMuseumItems] = useState<RemoteMuseumItem[]>([]);
  const [courtItems, setCourtItems] = useState<RemoteCourtVerdict[]>([]);
  const [pendingCounts, setPendingCounts] = useState<{ museum: number; court: number }>({ museum: 0, court: 0 });

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playersLoading, setPlayersLoading] = useState(false);
  const [banReason, setBanReason] = useState<Record<string, string>>({});

  const [bans, setBans] = useState<BannedUser[]>([]);
  const [bansLoading, setBansLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email || undefined });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email || undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = !!user?.email && (!ADMIN_EMAIL || user.email.toLowerCase() === ADMIN_EMAIL);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const fetchPendingCounts = async () => {
    if (!supabase || !isAdmin) return;
    const [m, c] = await Promise.all([
      supabase.from("museum_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("court_verdicts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setPendingCounts({ museum: m.count ?? 0, court: c.count ?? 0 });
  };

  const fetchItems = async () => {
    if (!supabase || !isAdmin) return;
    if (section === "museum") {
      const { data, error } = await supabase
        .from("museum_items").select("*").eq("status", filter).order("created_at", { ascending: false });
      if (!error) setMuseumItems((data || []) as RemoteMuseumItem[]);
    } else if (section === "court") {
      const { data, error } = await supabase
        .from("court_verdicts").select("*").eq("status", filter)
        .order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (!error) setCourtItems((data || []) as RemoteCourtVerdict[]);
    }
  };

  const fetchPlayers = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setPlayersLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("username, secrets, coins, created_at, updated_at")
      .order("created_at", { ascending: false });
    setPlayersLoading(false);
    if (error) { console.warn("[admin] players fetch error", error); return; }
    const rows: AdminPlayer[] = (data || []).map((r: any) => ({
      username: r.username,
      secrets: Array.isArray(r.secrets) ? r.secrets : [],
      secrets_count: Array.isArray(r.secrets) ? r.secrets.length : 0,
      coins: r.coins ?? 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    rows.sort((a, b) => b.secrets_count - a.secrets_count);
    setPlayers(rows);
  }, [isAdmin]);

  const fetchBans = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setBansLoading(true);
    const { data, error } = await supabase
      .from("banned_users")
      .select("*")
      .order("banned_at", { ascending: false });
    setBansLoading(false);
    if (error) { console.warn("[admin] bans fetch error", error); return; }
    setBans((data || []) as BannedUser[]);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
    fetchPendingCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, section, filter]);

  useEffect(() => {
    if (!isAdmin) return;
    if (section === "players") fetchPlayers();
    if (section === "bans") fetchBans();
  }, [section, isAdmin, fetchPlayers, fetchBans]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  // Museum actions
  const setMuseumStatus = async (id: string, status: "approved" | "rejected") => {
    if (!supabase) return;
    await supabase.from("museum_items").update({ status }).eq("id", id);
    fetchItems(); fetchPendingCounts();
  };
  const removeMuseum = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Permanently delete this item?")) return;
    await supabase.from("museum_items").delete().eq("id", id);
    fetchItems(); fetchPendingCounts();
  };

  // Court actions
  const setCourtStatus = async (id: string, status: "approved" | "rejected") => {
    if (!supabase) return;
    await supabase.from("court_verdicts").update({ status }).eq("id", id);
    fetchItems(); fetchPendingCounts();
  };
  const togglePin = async (id: string, pinned: boolean) => {
    if (!supabase) return;
    await supabase.from("court_verdicts").update({ pinned: !pinned }).eq("id", id);
    fetchItems();
  };
  const removeCourt = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Permanently delete this verdict?")) return;
    await supabase.from("court_verdicts").delete().eq("id", id);
    fetchItems(); fetchPendingCounts();
  };

  // Player actions
  const resetPlayer = async (username: string) => {
    if (!supabase) return;
    if (!confirm(`Reset ${username}'s achievements and coins?`)) return;
    const { error } = await supabase
      .from("players")
      .update({ secrets: [], coins: 1000, updated_at: new Date().toISOString() })
      .eq("username", username);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg(`${username} has been reset.`);
    fetchPlayers();
  };

  const banPlayer = async (username: string) => {
    if (!supabase) return;
    const reason = banReason[username] || "cheating";
    if (!confirm(`Ban ${username} for: ${reason}?`)) return;
    const { error } = await supabase.from("banned_users").insert({
      username_lower: username.toLowerCase(),
      original_username: username,
      reason,
    });
    if (error) { showMsg(`Error: ${error.message}`); return; }
    await supabase.from("players").update({ secrets: [], coins: 0, updated_at: new Date().toISOString() }).eq("username", username);
    showMsg(`${username} has been banned.`);
    fetchPlayers();
    fetchBans();
  };

  const deletePlayer = async (username: string) => {
    if (!supabase) return;
    if (!confirm(`Permanently DELETE ${username}? This cannot be undone.`)) return;
    const { error } = await supabase.from("players").delete().eq("username", username);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg(`${username} deleted.`);
    fetchPlayers();
  };

  // Ban actions
  const unbanUser = async (id: string, username: string) => {
    if (!supabase) return;
    if (!confirm(`Unban ${username}?`)) return;
    const { error } = await supabase.from("banned_users").delete().eq("id", id);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg(`${username} has been unbanned.`);
    fetchBans();
  };

  const filteredPlayers = players.filter((p) =>
    !playerSearch || p.username.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // ── helpers ──────────────────────────────────────────────────────────────
  const suspicionReasons = (p: AdminPlayer): string[] => {
    const reasons: string[] = [];
    const created = new Date(p.created_at).getTime();
    const updated = new Date(p.updated_at).getTime();
    const hours = (updated - created) / 3_600_000;
    if (p.secrets_count >= 30 && hours < 1) reasons.push(`${p.secrets_count} secrets in under 1 hour`);
    else if (p.secrets_count >= 20 && hours < 6) reasons.push(`${p.secrets_count} secrets in ${hours.toFixed(1)}h`);
    if (p.coins >= 999_000) reasons.push(`coins at max (${p.coins.toLocaleString()} NC)`);
    if (p.secrets_count === 85 && hours < 24) reasons.push("all achievements unlocked in <24h");
    return reasons;
  };

  const isSuspicious = (p: AdminPlayer) => suspicionReasons(p).length > 0;

  const suspiciousPlayers = players.filter(isSuspicious);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-secondary" />
          <h1 className="text-2xl font-black text-secondary uppercase tracking-widest">Backend Not Configured</h1>
          <p className="text-primary/80 font-mono text-sm">Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ADMIN_EMAIL.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6">
        <motion.form
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          onSubmit={signIn}
          className="bg-black/80 border-2 border-primary p-8 max-w-md w-full neon-box space-y-4"
        >
          <div className="text-center">
            <img src={nattounImg} data-nattoun="true" alt="" className="w-20 h-20 object-cover mx-auto border-2 border-primary" />
            <h1 className="text-xl font-black text-primary uppercase tracking-widest mt-4">Admin Access</h1>
            <p className="text-secondary font-mono text-xs uppercase mt-1">Authorized personnel only.</p>
          </div>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email"
            className="bg-black border-primary text-primary font-mono uppercase" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="password"
            className="bg-black border-primary text-primary font-mono" />
          {error && <div className="text-red-400 text-xs font-mono uppercase">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/80">
            {loading ? "Authenticating..." : "Sign In"}
          </Button>
        </motion.form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-400" />
          <h1 className="text-2xl font-black text-red-400 uppercase tracking-widest">Access Denied</h1>
          <p className="text-primary font-mono text-sm">{user.email} is not the admin email.</p>
          <Button onClick={signOut} variant="outline" className="border-primary text-primary">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-widest neon-text flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" /> Admin Bahamas
            </h1>
            <p className="text-secondary font-mono text-xs uppercase">Logged in as {user.email}</p>
          </div>
          <Button onClick={signOut} variant="outline" className="border-primary text-primary hover:bg-primary/20">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        {/* Action message */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-900/40 border border-green-500 text-green-400 font-mono text-sm px-4 py-2 uppercase"
            >
              {actionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section tabs */}
        <div className="flex gap-2 border-b border-primary/30 pb-2 flex-wrap">
          {([
            { key: "museum", icon: <ImageIcon className="w-4 h-4" />, label: "Museum", badge: pendingCounts.museum },
            { key: "court", icon: <Scale className="w-4 h-4" />, label: "Court", badge: pendingCounts.court },
            { key: "players", icon: <Users className="w-4 h-4" />, label: "Citizens" },
            { key: "suspects", icon: <Zap className="w-4 h-4" />, label: "Suspects", badge: suspiciousPlayers.length },
            { key: "bans", icon: <Ban className="w-4 h-4" />, label: "Bans", badge: bans.length },
          ] as const).map(({ key, icon, label, badge }) => (
            <Button
              key={key}
              onClick={() => setSection(key as Section)}
              variant={section === key ? "default" : "outline"}
              className={section === key
                ? "bg-primary text-black uppercase font-bold"
                : "border-primary text-primary hover:bg-primary/20 uppercase"}
            >
              {icon}
              <span className="ml-2">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-2 bg-red-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">{badge}</span>
              )}
            </Button>
          ))}
        </div>

        {/* ── MUSEUM ───────────────────────────────────────────────────────── */}
        {section === "museum" && (
          <>
            <div className="flex gap-2">
              {(["pending", "approved", "rejected"] as const).map((f) => (
                <Button key={f} onClick={() => setFilter(f)} variant={filter === f ? "default" : "outline"}
                  className={filter === f ? "bg-primary text-black uppercase font-bold" : "border-primary text-primary hover:bg-primary/20 uppercase"}>
                  {f}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {museumItems.map((it) => (
                  <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-black/80 border-2 border-primary p-3 neon-box space-y-2">
                    {it.image_url
                      ? <img src={it.image_url} alt="" className="w-full aspect-square object-cover border border-primary/50" />
                      : <div className="w-full aspect-square border border-primary/50 bg-primary/5 flex items-center justify-center text-primary/40 font-mono text-xs">[no image]</div>}
                    <div className="text-primary font-serif italic text-sm">"{it.caption}"</div>
                    <div className="text-secondary/70 font-mono text-[10px] uppercase">By: {it.username}</div>
                    <div className="text-white/40 font-mono text-[10px]">{new Date(it.created_at).toLocaleString()}</div>
                    <div className="flex gap-2 pt-2 border-t border-primary/20">
                      {filter !== "approved" && (
                        <Button size="sm" onClick={() => setMuseumStatus(it.id, "approved")} className="bg-green-600 hover:bg-green-500 flex-1 uppercase text-xs font-bold">
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {filter !== "rejected" && (
                        <Button size="sm" onClick={() => setMuseumStatus(it.id, "rejected")} variant="outline" className="border-yellow-500 text-yellow-400 flex-1 uppercase text-xs">
                          Reject
                        </Button>
                      )}
                      <Button size="sm" onClick={() => removeMuseum(it.id)} variant="outline" className="border-red-500 text-red-400 uppercase text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {museumItems.length === 0 && (
                <div className="col-span-full text-center text-primary/40 font-mono text-sm py-12 uppercase">No {filter} museum items.</div>
              )}
            </div>
          </>
        )}

        {/* ── COURT ────────────────────────────────────────────────────────── */}
        {section === "court" && (
          <>
            <div className="flex gap-2">
              {(["pending", "approved", "rejected"] as const).map((f) => (
                <Button key={f} onClick={() => setFilter(f)} variant={filter === f ? "default" : "outline"}
                  className={filter === f ? "bg-primary text-black uppercase font-bold" : "border-primary text-primary hover:bg-primary/20 uppercase"}>
                  {f}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {courtItems.map((v) => (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-black/80 border-2 p-4 neon-box space-y-2 relative ${v.pinned ? "border-yellow-400" : "border-primary"}`}>
                    {v.pinned && (
                      <div className="absolute -top-3 left-3 bg-black border border-yellow-400 text-yellow-400 text-[9px] uppercase font-mono px-2 py-0.5 flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </div>
                    )}
                    <div className="text-secondary/70 font-mono text-[10px] uppercase">DEFENDANT: {v.username}</div>
                    <p className="text-primary font-serif italic break-words">"{v.text}"</p>
                    <div className="inline-block border border-red-500 text-red-400 font-bold text-[10px] uppercase tracking-widest px-2 py-0.5">{v.verdict}</div>
                    <div className="text-white/40 font-mono text-[10px]">{new Date(v.created_at).toLocaleString()}</div>
                    <div className="flex gap-2 pt-2 border-t border-primary/20 flex-wrap">
                      {filter !== "approved" && (
                        <Button size="sm" onClick={() => setCourtStatus(v.id, "approved")} className="bg-green-600 hover:bg-green-500 uppercase text-xs font-bold">
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {filter !== "rejected" && (
                        <Button size="sm" onClick={() => setCourtStatus(v.id, "rejected")} variant="outline" className="border-yellow-500 text-yellow-400 uppercase text-xs">
                          Reject
                        </Button>
                      )}
                      {filter === "approved" && (
                        <Button size="sm" onClick={() => togglePin(v.id, v.pinned)} variant="outline"
                          className={`uppercase text-xs ${v.pinned ? "border-yellow-400 text-yellow-400" : "border-secondary text-secondary"}`}>
                          {v.pinned ? <PinOff className="w-3 h-3 mr-1" /> : <Pin className="w-3 h-3 mr-1" />}
                          {v.pinned ? "Unpin" : "Pin"}
                        </Button>
                      )}
                      <Button size="sm" onClick={() => removeCourt(v.id)} variant="outline" className="border-red-500 text-red-400 uppercase text-xs ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {courtItems.length === 0 && (
                <div className="col-span-full text-center text-primary/40 font-mono text-sm py-12 uppercase">No {filter} verdicts.</div>
              )}
            </div>
          </>
        )}

        {/* ── PLAYERS ──────────────────────────────────────────────────────── */}
        {section === "players" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <Input
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Search citizen..."
                  className="bg-black border-primary text-primary font-mono pl-9"
                />
              </div>
              <Button onClick={fetchPlayers} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <span className="text-primary/50 font-mono text-xs uppercase">{filteredPlayers.length} citizens</span>
            </div>

            {playersLoading && (
              <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading citizens...</div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {filteredPlayers.map((p) => {
                  const suspicious = isSuspicious(p);
                  const created = new Date(p.created_at);
                  const updated = new Date(p.updated_at);
                  const hours = ((updated.getTime() - created.getTime()) / 3_600_000).toFixed(1);
                  return (
                    <motion.div
                      key={p.username}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`border-2 p-3 space-y-2 ${suspicious ? "border-red-500 bg-red-950/20" : "border-primary/40 bg-black/60"}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {suspicious && (
                            <span className="bg-red-500 text-black text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">SUSPICIOUS</span>
                          )}
                          <span className="text-primary font-mono font-bold uppercase">{p.username}</span>
                          <span className="text-secondary font-mono text-xs">{p.secrets_count} achievements</span>
                          <span className="text-white/40 font-mono text-xs">{p.coins} NC</span>
                        </div>
                        <div className="text-white/30 font-mono text-[10px]">
                          Joined: {created.toLocaleDateString()} — completed in {hours}h
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap items-center">
                        <Input
                          value={banReason[p.username] ?? ""}
                          onChange={(e) => setBanReason((r) => ({ ...r, [p.username]: e.target.value }))}
                          placeholder="Ban reason (optional)"
                          className="bg-black border-primary/40 text-primary font-mono text-xs h-8 flex-1 min-w-[150px]"
                        />
                        <Button size="sm" onClick={() => resetPlayer(p.username)}
                          variant="outline" className="border-yellow-500 text-yellow-400 uppercase text-xs hover:bg-yellow-500/10">
                          <RefreshCw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                        <Button size="sm" onClick={() => banPlayer(p.username)}
                          className="bg-red-700 hover:bg-red-600 uppercase text-xs font-bold">
                          <Ban className="w-3 h-3 mr-1" /> Ban
                        </Button>
                        <Button size="sm" onClick={() => deletePlayer(p.username)}
                          variant="outline" className="border-red-800 text-red-600 uppercase text-xs hover:bg-red-900/20">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!playersLoading && filteredPlayers.length === 0 && (
                <div className="text-primary/40 font-mono text-sm uppercase text-center py-12">No citizens found.</div>
              )}
            </div>
          </div>
        )}

        {/* ── SUSPECTS ─────────────────────────────────────────────────────── */}
        {section === "suspects" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <Button onClick={fetchPlayers} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <span className="text-red-400 font-mono text-xs uppercase">
                {suspiciousPlayers.length} flagged citizen{suspiciousPlayers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="bg-red-950/20 border border-red-800/50 p-3 font-mono text-xs text-red-400/80 uppercase tracking-wide">
              ⚠ Flagged automatically. Review before acting — legitimate power users may appear here.
            </div>

            {playersLoading && (
              <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading...</div>
            )}

            <div className="space-y-3">
              <AnimatePresence>
                {suspiciousPlayers.map((p) => {
                  const reasons = suspicionReasons(p);
                  const created = new Date(p.created_at);
                  const updated = new Date(p.updated_at);
                  return (
                    <motion.div
                      key={p.username}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="border-2 border-red-500 bg-red-950/20 p-4 space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="bg-red-500 text-black text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">FLAGGED</span>
                            <span className="text-red-300 font-mono font-bold uppercase text-sm">{p.username}</span>
                          </div>
                          <div className="flex gap-4 text-white/50 font-mono text-xs">
                            <span>{p.secrets_count} secrets</span>
                            <span>{p.coins.toLocaleString()} NC</span>
                            <span>Joined: {created.toLocaleDateString()}</span>
                            <span>Last sync: {updated.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="space-y-1">
                        {reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-red-400 font-mono text-xs">
                            <Zap className="w-3 h-3 flex-shrink-0" />
                            {r}
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap items-center pt-1 border-t border-red-800/40">
                        <Input
                          value={banReason[p.username] ?? "cheating"}
                          onChange={(e) => setBanReason((r) => ({ ...r, [p.username]: e.target.value }))}
                          placeholder="Ban reason"
                          className="bg-black border-red-800/60 text-primary font-mono text-xs h-8 flex-1 min-w-[150px]"
                        />
                        <Button size="sm" onClick={() => resetPlayer(p.username)}
                          variant="outline" className="border-yellow-500 text-yellow-400 uppercase text-xs hover:bg-yellow-500/10">
                          <RefreshCw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                        <Button size="sm" onClick={() => banPlayer(p.username)}
                          className="bg-red-700 hover:bg-red-600 uppercase text-xs font-bold">
                          <Ban className="w-3 h-3 mr-1" /> Ban
                        </Button>
                        <Button size="sm" onClick={() => deletePlayer(p.username)}
                          variant="outline" className="border-red-800 text-red-600 uppercase text-xs hover:bg-red-900/20">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!playersLoading && suspiciousPlayers.length === 0 && (
                <div className="text-primary/40 font-mono text-sm uppercase text-center py-12">
                  No suspicious activity detected. All citizens behaving.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BANS ─────────────────────────────────────────────────────────── */}
        {section === "bans" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <Button onClick={fetchBans} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <span className="text-primary/50 font-mono text-xs uppercase">{bans.length} banned users</span>
            </div>

            {bansLoading && (
              <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading bans...</div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {bans.map((b) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="border-2 border-red-700/60 bg-red-950/20 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Ban className="w-4 h-4 text-red-400" />
                        <span className="text-red-300 font-mono font-bold uppercase">{b.original_username || b.username_lower}</span>
                        <span className="text-red-500/60 font-mono text-[10px]">({b.username_lower})</span>
                      </div>
                      <div className="text-white/40 font-mono text-xs">
                        Reason: <span className="text-red-400">{b.reason}</span>
                      </div>
                      <div className="text-white/30 font-mono text-[10px]">
                        Banned: {new Date(b.banned_at).toLocaleString()}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => unbanUser(b.id, b.original_username || b.username_lower)}
                      variant="outline" className="border-green-500 text-green-400 uppercase text-xs hover:bg-green-500/10">
                      <ShieldOff className="w-3 h-3 mr-1" /> Unban
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!bansLoading && bans.length === 0 && (
                <div className="text-primary/40 font-mono text-sm uppercase text-center py-12">No banned users. All clear.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
