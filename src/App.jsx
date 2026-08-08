import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Login from './pages/Login'
import EdaHome from './pages/EdaHome'
import Universities from './pages/Universities'
import UniversityDetail from './pages/UniversityDetail'
import Calendar from './pages/Calendar'
import Suggestions from './pages/Suggestions'
import FamilyHome from './pages/FamilyHome'
import FamilySuggest from './pages/FamilySuggest'

function Splash({ children }) {
  return (
    <div className="min-h-full grid place-items-center p-6 text-center">
      <div className="max-w-sm">{children}</div>
    </div>
  )
}

function Routing() {
  const { session, profile, loading, isEda, isBlocked, signOut } = useAuth()

  // Oturum ve profil ikisi de hazır olmadan hiçbir şey çizilmez.
  // Aksi hâlde giriş anında bir an "Profil bulunamadı" görünüyordu.
  if (loading) {
    return (
      <Splash>
        <span className="inline-block h-7 w-7 rounded-full border-[3px] border-line
                         border-t-accent animate-spin" />
      </Splash>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Hesap var ama Eda tarafından yetkilendirilmemiş
  if (isBlocked) {
    return (
      <Splash>
        <h1 className="text-2xl mb-2">Bu hesabın erişimi yok</h1>
        <p className="lede mb-6">
          Kodun çalışıyor ama bu hesap yetkilendirilmemiş. Eda ile konuşman gerekiyor.
        </p>
        <button
          onClick={signOut}
          className="rounded-full border-2 border-line px-5 py-2.5 font-bold
                     hover:border-accent hover:text-accent transition"
        >
          Çıkış yap
        </button>
      </Splash>
    )
  }

  // Profil satırı hiç oluşmamış — normalde olmaz
  if (!profile) {
    return (
      <Splash>
        <h1 className="text-2xl mb-2">Profil bulunamadı</h1>
        <p className="lede mb-6">
          Hesabın var ama profil kaydı oluşmamış. Supabase panelinden kullanıcıyı
          silip yeniden eklemek sorunu çözer.
        </p>
        <button
          onClick={signOut}
          className="rounded-full border-2 border-line px-5 py-2.5 font-bold
                     hover:border-accent hover:text-accent transition"
        >
          Çıkış yap
        </button>
      </Splash>
    )
  }

  // Rol neyse o taraf açılır — aynı adres, farklı site.
  // Eda'nın sayfaları aile tarafında hiç tanımlı değil; adresi elle yazsalar
  // bile ana sayfaya dönerler (veritabanı da ayrıca engelliyor).
  if (isEda) {
    return (
      <Routes>
        <Route path="/" element={<EdaHome />} />
        <Route path="/universiteler" element={<Universities />} />
        <Route path="/universiteler/:id" element={<UniversityDetail />} />
        <Route path="/takvim" element={<Calendar />} />
        <Route path="/oneriler" element={<Suggestions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<FamilyHome />} />
      <Route path="/oneri-birak" element={<FamilySuggest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routing />
      </AuthProvider>
    </BrowserRouter>
  )
}
