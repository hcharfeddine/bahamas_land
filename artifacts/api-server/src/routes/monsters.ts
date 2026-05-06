import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
const supabaseKey =
  process.env["SUPABASE_SERVICE_KEY"] ||
  process.env["SUPABASE_ANON_KEY"]    ||
  process.env["VITE_SUPABASE_ANON_KEY"] || "";

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

router.get("/monsters/:kick_username", async (req, res) => {
  const sb = getClient();
  if (!sb) return res.status(503).json({ error: "Database not configured" });

  const ku = (req.params.kick_username || "").toLowerCase().trim();
  if (!ku) return res.status(400).json({ error: "Missing kick_username" });

  const { data, error } = await sb
    .from("monsters")
    .select("*")
    .eq("kick_username", ku)
    .single();

  if (error || !data) return res.status(404).json({ error: "Monster not found" });
  return res.json(data);
});

router.get("/monsters", async (_req, res) => {
  const sb = getClient();
  if (!sb) return res.status(503).json({ error: "Database not configured" });

  const { data, error } = await sb
    .from("monsters")
    .select("kick_username, stage, level, status, personality, mood, hunger, energy, last_updated_at")
    .neq("status", "dead")
    .order("level", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ monsters: data || [] });
});

export default router;
