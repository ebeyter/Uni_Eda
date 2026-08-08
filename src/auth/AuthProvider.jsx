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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    // Sayfa yenilendiğinde oturumu geri yükle
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Oturum varsa rolü çek — Eda mı, aile mi buradan belli olur
  useEffect(() => {
    if (!session?.user) return

    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Profil okunamadı:', error.message)
        setProfile(data ?? null)
        setLoading(false)
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
    loading,
    isEda: profile?.role === 'eda',
    isFamily: profile?.role === 'family',
    signInWithCode,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
