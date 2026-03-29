export const hasSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL?.length && import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
)
