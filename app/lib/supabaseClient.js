import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : null,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // More aggressive token refresh
    refreshTokenMargin: 300, // Refresh 5 minutes before expiry
    // Debug settings
    debug: process.env.NODE_ENV === 'development',
    // Ensure session is loaded properly
    flowType: 'pkce',
  }
})