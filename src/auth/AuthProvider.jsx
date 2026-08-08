import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { codeToEmail, EDA_DOMAIN, FAMILY_DOMAIN } from '../lib/accessCode'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [sessionReady, setSessionReady] = useState(false)

  // Profilin HANGİ kullanıcıya ait olduğunu tutuyoruz.
  // "yüklendi mi?" şeklinde bir bayrak yeterli değildi: bayrağı sıfırlayan kod
  // render'dan sonra çalıştığı için, giriş anında tek karelik bir boşlukta
  // "Profil bulunamadı" ekranı görünebiliyordu. Kimlik karşılaştırması bu
  // sıralamadan etkilenmez — oturumdaki kişi ile eldeki profil aynı değilse
  // henüz hazır değiliz demektir.
  const [profileUserId, setProfileUserId] = useState(null)

  useEffect(() => {
    if (!isConfigured) {
      setSessionReady(true)
      return
    }

    // Sayfa yenilendiğinde oturumu geri yükle
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setSessionReady(true)
      if (!next) {
        setProfile(null)
        setProfileUserId(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Oturum varsa rolü çek — Eda mı, aile mi buradan belli olur
  useEffect(() => {
    if (!session?.user) return

    const userId = session.user.id
    let cancelled = false

    supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Profil okunamadı:', error.message)
        setProfile(data ?? null)
        // Sonuç boş çıksa bile bu kullanıcı için sorgu tamamlandı
        setProfileUserId(userId)
      })

    return () => { cancelled = true }
  }, [session])

  // Kod ile giriş: kullanıcı hangi taraftan olduğunu söylemez, ikisini de deneriz.
  // Önce Eda adresi, olmazsa aile adresi. Kullanıcı bu iki denemeyi görmez.
  async function signInWithCode(code) {
    const password = code.trim()

    for (const domain of [EDA_DOMAIN, FAMILY_DOMAIN]) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: codeToEmail(code, domain),
        password,
      })
      if (!error) return { data, error: null }
      // Kimlik hatası dışında bir sorun varsa (ağ, sunucu) hemen bildir
      if (error.code && error.code !== 'invalid_credentials') {
        return { data: null, error }
      }
    }

    return { data: null, error: { message: 'Kod hatalı.' } }
  }

  const value = {
    session,
    profile,
    // Oturum hazır değilse ya da eldeki profil oturumdaki kişiye ait değilse
    // hâlâ yükleniyoruz demektir
    loading: !sessionReady || (Boolean(session) && profileUserId !== session.user.id),
    isEda: profile?.role === 'eda' && profile?.is_active,
    isFamily: profile?.role === 'family' && profile?.is_active,
    isBlocked: Boolean(profile) && !profile.is_active,
    signInWithCode,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
