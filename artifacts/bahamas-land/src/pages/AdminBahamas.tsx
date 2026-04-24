import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured, ADMIN_EMAIL, RemoteMuseumItem } from "@/lib/supabase";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { ShieldCheck, Trash2, Check, LogOut, AlertTriangle } from "lucide-react";

export default function AdminBahamas() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<RemoteMuseumItem[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

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

  const fetchItems = async () => {
    if (!supabase || !isAdmin) return;
    const { data, error } = await supabase
      .from("museum_items")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[admin] fetch error", error);
      return;
    }
    setPending((data || []) as RemoteMuseumItem[]);
  };

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

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

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (!supabase) return;
    await supabase.from("museum_items").update({ status }).eq("id", id);
    fetchItems();
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Permanently delete this item?")) return;
    await supabase.from("museum_items").delete().eq("id", id);
    fetchItems();
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {pending.map((it) => (
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
                    <Button size="sm" onClick={() => setStatus(it.id, "approved")} className="bg-green-600 hover:bg-green-500 flex-1 uppercase text-xs font-bold">
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  )}
                  {filter !== "rejected" && (
                    <Button size="sm" onClick={() => setStatus(it.id, "rejected")} variant="outline" className="border-yellow-500 text-yellow-400 flex-1 uppercase text-xs">
                      Reject
                    </Button>
                  )}
                  <Button size="sm" onClick={() => remove(it.id)} variant="outline" className="border-red-500 text-red-400 uppercase text-xs">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {pending.length === 0 && (
            <div className="col-span-full text-center text-primary/40 font-mono text-sm py-12 uppercase">
              No {filter} items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
