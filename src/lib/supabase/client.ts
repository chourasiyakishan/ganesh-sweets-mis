import { createBrowserClient } from "@supabase/ssr"

export function isSupabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    process.env.SUPABASE_URL ||
    process.env.STORAGE_URL ||
    ""
  return Boolean(url && !url.includes("placeholder"))
}

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    process.env.SUPABASE_URL ||
    process.env.STORAGE_URL ||
    "https://placeholder-project.supabase.co"

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_STORAGE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.STORAGE_ANON_KEY ||
    "placeholder-anon-key"

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
