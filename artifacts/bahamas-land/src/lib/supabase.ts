import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
export const ADMIN_EMAIL = ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || "").trim().toLowerCase();

let _client: SupabaseClient | null = null;
if (url && anonKey) {
  try {
    _client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (err) {
    console.warn("Supabase init failed:", err);
    _client = null;
  }
}

export const supabase = _client;
export const isSupabaseConfigured = !!_client;

export type RemoteMuseumItem = {
  id: string;
  username: string;
  caption: string;
  image_url: string | null;
  label: string;
  respect: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type RemoteCourtVerdict = {
  id: string;
  username: string;
  text: string;
  verdict: string;
  status: "pending" | "approved" | "rejected";
  pinned: boolean;
  created_at: string;
};

export type RemoteChatMessage = {
  id: number;
  username: string;
  text: string;
  is_mod: boolean;
  created_at: string;
};
