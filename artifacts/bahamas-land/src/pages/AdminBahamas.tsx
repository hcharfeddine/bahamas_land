import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured, ADMIN_EMAIL, RemoteMuseumItem, RemoteCourtVerdict } from "@/lib/supabase";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { ShieldCheck, Trash2, Check, LogOut, AlertTriangle, Pin, PinOff, Scale, Image as ImageIcon } from "lucide-react";

type Section = "museum" | "court";
type Filter = "pending" | "approved" | "rejected";

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
        .from("museum_items")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[admin] museum fetch error", error);
        return;
      }
      setMuseumItems((data || []) as RemoteMuseumItem[]);
    } else {
      const { data, error } = await supabase
        .from("court_verdicts")
        .select("*")
        .eq("status", filter)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[admin] court fetch error", error);
        return;
      }
      setCourtItems((data || []) as RemoteCourtVerdict[]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchPendingCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, section, filter]);

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
    fetchItems();
    fetchPendingCounts();
  };
  const removeMuseum = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Permanently delete this item?")) return;
    await supabase.from("museum_items").delete().eq("id", id);
    fetchItems();
    fetchPendingCounts();
  };

  // Court actions
  const setCourtStatus = async (id: string, status: "approved" | "rejected") => {
    if (!supabase) return;
    await supabase.from("court_verdicts").update({ status }).eq("id", id);
    fetchItems();
    fetchPendingCounts();
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
    fetchItems();
    fetchPendingCounts();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-secondary" />
          <h1 className="text-2xl font-black text-secondary uppercase tracking-widest">Backend Not Configured</h1>
          <p className="text-primary/80 font-mono text-sm">
            The admin panel requires Supabase. Set the env vars VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ADMIN_EMAIL, then redeploy.
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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onSubmit={signIn}
          className="bg-black/80 border-2 border-primary p-8 max-w-md w-full neon-box space-y-4"
        >
          <div className="text-center">
            <img src={nattounImg} alt="" className="w-20 h-20 object-cover mx-auto border-2 border-primary" />
            <h1 className="text-xl font-black text-primary uppercase tracking-widest mt-4">Admin Access</h1>
            <p className="text-secondary font-mono text-xs uppercase mt-1">Authorized personnel only.</p>
          </div>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email"
            className="bg-black border-primary text-primary font-mono uppercase"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="password"
            className="bg-black border-primary text-primary font-mono"
          />
          {error && <div className="text-red-400 text-xs font-mono uppercase">{error}</div>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/80"
          >
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
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-widest neon-text flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              Admin Bahamas
            </h1>
            <p className="text-secondary font-mono text-xs uppercase">Logged in as {user.email}</p>
          </div>
          <Button onClick={signOut} variant="outline" className="border-primary text-primary hover:bg-primary/20">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 border-b border-primary/30 pb-2">
          <Button
            onClick={() => setSection("museum")}
            variant={section === "museum" ? "default" : "outline"}
            className={
              section === "museum"
                ? "bg-primary text-black uppercase font-bold"
                : "border-primary text-primary hover:bg-primary/20 uppercase"
            }
          >
            <ImageIcon className="w-4 h-4 mr-2" /> Museum
            {pendingCounts.museum > 0 && (
              <span className="ml-2 bg-red-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {pendingCounts.museum}
              </span>
            )}
          </Button>
          <Button
            onClick={() => setSection("court")}
            variant={section === "court" ? "default" : "outline"}
            className={
              section === "court"
                ? "bg-primary text-black uppercase font-bold"
                : "border-primary text-primary hover:bg-primary/20 uppercase"
            }
          >
            <Scale className="w-4 h-4 mr-2" /> Court
            {pendingCounts.court > 0 && (
              <span className="ml-2 bg-red-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {pendingCounts.court}
              </span>
            )}
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? "default" : "outline"}
              className={
                filter === f
                  ? "bg-primary text-black uppercase font-bold"
                  : "border-primary text-primary hover:bg-primary/20 uppercase"
              }
            >
              {f}
            </Button>
          ))}
        </div>

        {/* MUSEUM SECTION */}
        {section === "museum" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {museumItems.map((it) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-black/80 border-2 border-primary p-3 neon-box space-y-2"
                >
                  {it.image_url ? (
                    <img src={it.image_url} alt="" className="w-full aspect-square object-cover border border-primary/50" />
                  ) : (
                    <div className="w-full aspect-square border border-primary/50 bg-primary/5 flex items-center justify-center text-primary/40 font-mono text-xs">[no image]</div>
                  )}
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
              <div className="col-span-full text-center text-primary/40 font-mono text-sm py-12 uppercase">
                No {filter} museum items.
              </div>
            )}
          </div>
        )}

        {/* COURT SECTION */}
        {section === "court" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {courtItems.map((v) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`bg-black/80 border-2 p-4 neon-box space-y-2 relative ${
                    v.pinned ? "border-yellow-400" : "border-primary"
                  }`}
                >
                  {v.pinned && (
                    <div className="absolute -top-3 left-3 bg-black border border-yellow-400 text-yellow-400 text-[9px] uppercase font-mono px-2 py-0.5 flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}
                  <div className="text-secondary/70 font-mono text-[10px] uppercase">DEFENDANT: {v.username}</div>
                  <p className="text-primary font-serif italic break-words">"{v.text}"</p>
                  <div className="inline-block border border-red-500 text-red-400 font-bold text-[10px] uppercase tracking-widest px-2 py-0.5">
                    {v.verdict}
                  </div>
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
                      <Button
                        size="sm"
                        onClick={() => togglePin(v.id, v.pinned)}
                        variant="outline"
                        className={`uppercase text-xs ${
                          v.pinned ? "border-yellow-400 text-yellow-400" : "border-secondary text-secondary"
                        }`}
                      >
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
              <div className="col-span-full text-center text-primary/40 font-mono text-sm py-12 uppercase">
                No {filter} verdicts.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
