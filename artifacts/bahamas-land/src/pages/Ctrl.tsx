import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured, ADMIN_EMAIL, RemoteMuseumItem, RemoteCourtVerdict, RemoteInterrogation } from "@/lib/supabase";
import { ACHIEVEMENTS } from "@/lib/achievements";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import {
  ShieldCheck, Trash2, Check, LogOut, AlertTriangle, Pin, PinOff,
  Scale, Image as ImageIcon, Users, Ban, RefreshCw, ShieldOff, Search,
  HelpCircle, Send, Eye, RotateCcw,
} from "lucide-react";

type Section = "museum" | "court" | "players" | "bans" | "interrogate";
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

export default function Ctrl() {
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

  const [interrogations, setInterrogations] = useState<RemoteInterrogation[]>([]);
  const [interrogationsLoading, setInterrogationsLoading] = useState(false);
  const [interrogateFilter, setInterrogateFilter] = useState<"pending" | "answered" | "reviewed">("answered");
  const [newIq, setNewIq] = useState<{ username: string; achievementId: string } | null>(null);
  const [sendingIq, setSendingIq] = useState(false);

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
      if (error) { console.warn("[admin] museum fetch error", error); return; }
      setMuseumItems((data || []) as RemoteMuseumItem[]);
    } else if (section === "court") {
      const { data, error } = await supabase
        .from("court_verdicts").select("*").eq("status", filter)
        .order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) { console.warn("[admin] court fetch error", error); return; }
      setCourtItems((data || []) as RemoteCourtVerdict[]);
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
      .from("banned_users").select("*").order("banned_at", { ascending: false });
    setBansLoading(false);
    if (error) { console.warn("[admin] bans fetch error", error); return; }
    setBans((data || []) as BannedUser[]);
  }, [isAdmin]);

  const fetchInterrogations = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setInterrogationsLoading(true);
    const { data, error } = await supabase
      .from("interrogations")
      .select("*")
      .eq("status", interrogateFilter)
      .order("created_at", { ascending: false });
    setInterrogationsLoading(false);
    if (error) { console.warn("[admin] interrogations fetch error", error); return; }
    setInterrogations((data || []) as RemoteInterrogation[]);
  }, [isAdmin, interrogateFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    if (section === "museum" || section === "court") { fetchItems(); fetchPendingCounts(); }
    if (section === "players") fetchPlayers();
    if (section === "bans") fetchBans();
    if (section === "interrogate") { fetchPlayers(); fetchInterrogations(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, section, filter, interrogateFilter]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(null);
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

  const softResetPlayer = async (username: string) => {
    if (!supabase) return;
    if (!confirm(`Soft-reset ${username}? This keeps only "tourist" and "citizen" achievements and resets coins to 1000.`)) return;
    const player = players.find((p) => p.username === username);
    const keepSecrets = player
      ? player.secrets.filter((s) => s === "tourist" || s === "citizen")
      : [];
    const { error } = await supabase
      .from("players")
      .update({ secrets: keepSecrets, coins: 1000, updated_at: new Date().toISOString() })
      .eq("username", username);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg(`${username} soft-reset. Kept: ${keepSecrets.join(", ") || "none"}.`);
    fetchPlayers();
  };

  // Interrogation actions
  const sendInterrogation = async () => {
    if (!supabase || !newIq) return;
    const { username, achievementId } = newIq;
    if (!username || !achievementId) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!ach) return;
    setSendingIq(true);
    const { error } = await supabase.from("interrogations").insert({
      username,
      achievement_id: achievementId,
      achievement_name: ach.name,
      status: "pending",
    });
    setSendingIq(false);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg(`Interrogation sent to ${username} for "${ach.name}".`);
    setNewIq(null);
    if (interrogateFilter === "pending") fetchInterrogations();
  };

  const markReviewed = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("interrogations").update({ status: "reviewed" }).eq("id", id);
    if (error) { showMsg(`Error: ${error.message}`); return; }
    showMsg("Marked as reviewed.");
    fetchInterrogations();
  };

  const deleteInterrogation = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this interrogation?")) return;
    await supabase.from("interrogations").delete().eq("id", id);
    fetchInterrogations();
  };

  const banPlayer = async (username: string) => {
    if (!supabase) return;
    const reason = banReason[username]?.trim() || "cheating";
    if (!confirm(`Ban ${username} for: ${reason}?`)) return;
    const { error } = await supabase.from("banned_users").insert({
      username_lower: username.toLowerCase(),
      original_username: username,
      reason,
    });
    if (error) { showMsg(`Error: ${error.message}`); return; }
    await supabase.from("players")
      .update({ secrets: [], coins: 0, updated_at: new Date().toISOString() })
      .eq("username", username);
    showMsg(`${username} has been banned.`);
    fetchPlayers(); fetchBans();
  };

  const deletePlayer = async (username: string) => {
    if (!supabase) return;
    if (!confirm(`Permanently DELETE ${username}? Cannot be undone.`)) return;
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

  const isSuspicious = (p: AdminPlayer) => {
    if (p.secrets_count < 20) return false;
    const hours = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 3_600_000;
    return hours < 6;
  };

  // ── Screens ───────────────────────────────────────────────────────────────

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-secondary" />
          <h1 className="text-2xl font-black text-secondary uppercase tracking-widest">Backend Not Configured</h1>
          <p className="text-primary/80 font-mono text-sm">
            The admin panel requires Supabase. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ADMIN_EMAIL, then redeploy.
          </p>
          <p className="text-white/40 font-mono text-xs">See DEPLOY.md for full setup.</p>
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
          <Button type="submit" disabled={loading}
            className="w-full bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/80">
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

        {/* Action toast */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-900/40 border border-green-500 text-green-400 font-mono text-sm px-4 py-2 uppercase">
              {actionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section tabs */}
        <div className="flex gap-2 border-b border-primary/30 pb-2 flex-wrap">
          {([
            { key: "museum",      icon: <ImageIcon className="w-4 h-4" />,   label: "Museum",      badge: pendingCounts.museum },
            { key: "court",       icon: <Scale className="w-4 h-4" />,        label: "Court",       badge: pendingCounts.court },
            { key: "players",     icon: <Users className="w-4 h-4" />,        label: "Citizens" },
            { key: "bans",        icon: <Ban className="w-4 h-4" />,          label: "Bans",        badge: bans.length || undefined },
            { key: "interrogate", icon: <HelpCircle className="w-4 h-4" />,   label: "Interrogate" },
          ] as const).map(({ key, icon, label, badge }) => (
            <Button key={key} onClick={() => setSection(key as Section)}
              variant={section === key ? "default" : "outline"}
              className={section === key
                ? "bg-primary text-black uppercase font-bold"
                : "border-primary text-primary hover:bg-primary/20 uppercase"}>
              {icon}
              <span className="ml-2">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-2 bg-red-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">{badge}</span>
              )}
            </Button>
          ))}
        </div>

        {/* ── MUSEUM ─────────────────────────────────────────────────────── */}
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

        {/* ── COURT ──────────────────────────────────────────────────────── */}
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

        {/* ── CITIZENS ───────────────────────────────────────────────────── */}
        {section === "players" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <Input value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Search citizen..." className="bg-black border-primary text-primary font-mono pl-9" />
              </div>
              <Button onClick={fetchPlayers} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <span className="text-primary/50 font-mono text-xs uppercase">{filteredPlayers.length} citizens</span>
            </div>

            {playersLoading && <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading citizens...</div>}

            <div className="space-y-2">
              <AnimatePresence>
                {filteredPlayers.map((p) => {
                  const suspicious = isSuspicious(p);
                  const created = new Date(p.created_at);
                  const updated = new Date(p.updated_at);
                  const hours = ((updated.getTime() - created.getTime()) / 3_600_000).toFixed(1);
                  return (
                    <motion.div key={p.username} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`border-2 p-3 space-y-2 ${suspicious ? "border-red-500 bg-red-950/20" : "border-primary/40 bg-black/60"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {suspicious && (
                            <span className="bg-red-500 text-black text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">SUSPICIOUS</span>
                          )}
                          <span className="text-primary font-mono font-bold uppercase">{p.username}</span>
                          <span className="text-secondary font-mono text-xs">{p.secrets_count} achievements</span>
                          <span className="text-white/40 font-mono text-xs">{p.coins} NC</span>
                        </div>
                        <div className="text-white/30 font-mono text-[10px]">
                          Joined: {created.toLocaleDateString()} — done in {hours}h
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Input
                          value={banReason[p.username] ?? ""}
                          onChange={(e) => setBanReason((r) => ({ ...r, [p.username]: e.target.value }))}
                          placeholder="Ban reason (optional)"
                          className="bg-black border-primary/40 text-primary font-mono text-xs h-8 flex-1 min-w-[150px]"
                        />
                        <Button size="sm" onClick={() => {
                          setSection("interrogate");
                          setNewIq({ username: p.username, achievementId: p.secrets[0] ?? "" });
                        }}
                          variant="outline" className="border-orange-500 text-orange-400 uppercase text-xs hover:bg-orange-500/10">
                          <HelpCircle className="w-3 h-3 mr-1" /> Interrogate
                        </Button>
                        <Button size="sm" onClick={() => softResetPlayer(p.username)}
                          variant="outline" className="border-blue-500 text-blue-400 uppercase text-xs hover:bg-blue-500/10">
                          <RotateCcw className="w-3 h-3 mr-1" /> Soft Reset
                        </Button>
                        <Button size="sm" onClick={() => resetPlayer(p.username)}
                          variant="outline" className="border-yellow-500 text-yellow-400 uppercase text-xs hover:bg-yellow-500/10">
                          <RefreshCw className="w-3 h-3 mr-1" /> Full Reset
                        </Button>
                        <Button size="sm" onClick={() => banPlayer(p.username)}
                          className="bg-red-700 hover:bg-red-600 uppercase text-xs font-bold">
                          <Ban className="w-3 h-3 mr-1" /> Ban
                        </Button>
                        <Button size="sm" onClick={() => deletePlayer(p.username)}
                          variant="outline" className="border-red-900 text-red-700 uppercase text-xs hover:bg-red-900/20">
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

        {/* ── INTERROGATE ────────────────────────────────────────────────── */}
        {section === "interrogate" && (
          <div className="space-y-6">

            {/* New interrogation form */}
            <div className="border-2 border-orange-500/60 bg-orange-950/10 p-5 space-y-4">
              <h3 className="text-orange-400 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Send New Interrogation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-white/50 font-mono text-xs uppercase">Select citizen</label>
                  <select
                    value={newIq?.username ?? ""}
                    onChange={(e) => setNewIq((prev) => ({ username: e.target.value, achievementId: prev?.achievementId ?? "" }))}
                    className="w-full bg-black border border-primary/40 text-primary font-mono text-sm p-2 focus:border-orange-400 focus:outline-none"
                  >
                    <option value="">— choose a citizen —</option>
                    {players.map((p) => (
                      <option key={p.username} value={p.username}>
                        {isSuspicious(p) ? "⚠ " : ""}{p.username} ({p.secrets_count} achievements)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 font-mono text-xs uppercase">Select achievement to ask about</label>
                  <select
                    value={newIq?.achievementId ?? ""}
                    onChange={(e) => setNewIq((prev) => ({ username: prev?.username ?? "", achievementId: e.target.value }))}
                    disabled={!newIq?.username}
                    className="w-full bg-black border border-primary/40 text-primary font-mono text-sm p-2 focus:border-orange-400 focus:outline-none disabled:opacity-40"
                  >
                    <option value="">— choose an achievement —</option>
                    {newIq?.username && (() => {
                      const p = players.find((x) => x.username === newIq.username);
                      if (!p) return null;
                      return p.secrets.map((id) => {
                        const ach = ACHIEVEMENTS.find((a) => a.id === id);
                        return (
                          <option key={id} value={id}>
                            {ach ? `${ach.emoji} ${ach.name} (${ach.difficulty.toUpperCase()})` : id}
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </div>

              {newIq?.username && newIq?.achievementId && (() => {
                const ach = ACHIEVEMENTS.find((a) => a.id === newIq.achievementId);
                if (!ach) return null;
                return (
                  <div className="border border-orange-500/30 bg-black/40 p-3 text-sm font-serif italic text-primary/80">
                    "Citizen <span className="text-orange-400 font-bold not-italic">{newIq.username}</span>, explain in your own words how you unlocked <span className="text-orange-400 font-bold not-italic">{ach.emoji} {ach.name}</span>. Be specific — the President is watching."
                  </div>
                );
              })()}

              <Button
                onClick={sendInterrogation}
                disabled={sendingIq || !newIq?.username || !newIq?.achievementId}
                className="bg-orange-700 hover:bg-orange-600 text-white font-bold uppercase tracking-widest"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendingIq ? "Sending..." : "Send Interrogation"}
              </Button>

              {players.length === 0 && (
                <p className="text-white/30 font-mono text-xs uppercase">
                  Load the Citizens tab first to populate the player list.
                </p>
              )}
            </div>

            {/* Responses list */}
            <div className="space-y-4">
              <div className="flex gap-2 items-center flex-wrap">
                {(["pending", "answered", "reviewed"] as const).map((f) => (
                  <Button key={f} onClick={() => setInterrogateFilter(f)}
                    variant={interrogateFilter === f ? "default" : "outline"}
                    className={interrogateFilter === f
                      ? "bg-orange-600 text-white uppercase font-bold"
                      : "border-orange-500/60 text-orange-400 hover:bg-orange-500/10 uppercase"}>
                    {f}
                  </Button>
                ))}
                <Button onClick={fetchInterrogations} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase ml-auto">
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </div>

              {interrogationsLoading && (
                <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading interrogations...</div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {interrogations.map((iq) => {
                    const ach = ACHIEVEMENTS.find((a) => a.id === iq.achievement_id);
                    return (
                      <motion.div key={iq.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="border-2 border-orange-500/40 bg-orange-950/10 p-4 space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-orange-300 font-mono font-bold uppercase">{iq.username}</span>
                              <span className="border border-orange-500/40 text-orange-400 text-[9px] uppercase font-mono px-2 py-0.5">
                                {ach ? `${ach.emoji} ${ach.name}` : iq.achievement_name}
                              </span>
                              <span className={`text-[9px] uppercase font-black px-2 py-0.5 ${
                                iq.status === "answered" ? "bg-green-700 text-white" :
                                iq.status === "reviewed" ? "bg-gray-700 text-white" :
                                "bg-orange-700 text-white animate-pulse"
                              }`}>{iq.status}</span>
                            </div>
                            <div className="text-white/30 font-mono text-[10px]">
                              Sent: {new Date(iq.created_at).toLocaleString()}
                              {iq.answered_at && ` — Answered: ${new Date(iq.answered_at).toLocaleString()}`}
                            </div>
                          </div>
                          <div className="flex gap-2 items-start">
                            {iq.status === "answered" && (
                              <>
                                <Button size="sm" onClick={() => markReviewed(iq.id)}
                                  variant="outline" className="border-green-500 text-green-400 uppercase text-xs hover:bg-green-500/10">
                                  <Eye className="w-3 h-3 mr-1" /> Mark Reviewed
                                </Button>
                                <Button size="sm" onClick={() => softResetPlayer(iq.username)}
                                  variant="outline" className="border-blue-500 text-blue-400 uppercase text-xs hover:bg-blue-500/10">
                                  <RotateCcw className="w-3 h-3 mr-1" /> Soft Reset
                                </Button>
                              </>
                            )}
                            <Button size="sm" onClick={() => deleteInterrogation(iq.id)}
                              variant="outline" className="border-red-700 text-red-500 uppercase text-xs hover:bg-red-900/20">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {iq.answer ? (
                          <div className="border border-green-500/30 bg-green-950/20 p-3 space-y-1">
                            <div className="text-green-400/60 font-mono text-[10px] uppercase">Citizen's testimony:</div>
                            <p className="text-white/80 font-serif italic text-sm leading-relaxed break-words">"{iq.answer}"</p>
                          </div>
                        ) : (
                          <div className="text-white/20 font-mono text-xs uppercase italic">No response yet.</div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {!interrogationsLoading && interrogations.length === 0 && (
                  <div className="text-primary/40 font-mono text-sm uppercase text-center py-12">
                    No {interrogateFilter} interrogations.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BANS ───────────────────────────────────────────────────────── */}
        {section === "bans" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <Button onClick={fetchBans} variant="outline" className="border-primary text-primary hover:bg-primary/20 uppercase">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <span className="text-primary/50 font-mono text-xs uppercase">{bans.length} banned users</span>
            </div>

            {bansLoading && <div className="text-primary/40 font-mono text-sm uppercase text-center py-8">Loading bans...</div>}

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
