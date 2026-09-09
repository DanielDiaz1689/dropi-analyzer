import { createClient } from '@supabase/supabase-js'

// ⚠️ Estos valores van en el archivo .env (NUNCA los pongas en el código directo)
// En Vercel: ve a Settings → Environment Variables y agrégalos ahí también
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan las variables de Supabase en .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Email de Daniel — el único que puede acceder al panel de admin
export const ADMIN_EMAIL = 'daniel2001barragan@gmail.com'
