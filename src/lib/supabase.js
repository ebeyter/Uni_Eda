import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Anahtarlar eksikse sessizce boş ekran yerine net bir uyarı ver
export const isConfigured = Boolean(url && key)

if (!isConfigured) {
  console.error(
    '.env dosyasında VITE_SUPABASE_URL veya VITE_SUPABASE_PUBLISHABLE_KEY eksik. ' +
    'Değerleri doldurup sunucuyu yeniden başlat.'
  )
}

export const supabase = isConfigured ? createClient(url, key) : null
