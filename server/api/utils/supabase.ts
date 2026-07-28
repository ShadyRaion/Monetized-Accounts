import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''

let supabaseClient: SupabaseClient | null = null

export const getSupabaseClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server-side storage')
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  return supabaseClient
}

export const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'site-assets'