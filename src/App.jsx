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

function Routing() {
  const { session, profile, loading, isEda } = useAuth()

  if (loading) {
    return (
      <div className="min-h-full grid place-items-center">
        <p className="text-ink-faint text-sm">Yükleniyor…</p>
      </div>
    )
  }

  // Giriş yapılmamış
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Oturum var ama profil satırı yok — normalde olmaz
  if (!profile) {
    return (
      <div className="min-h-full grid place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl mb-2">Profil bulunamadı</h1>
          <p className="text-ink-soft text-sm">
            Hesabın var ama profil kaydı oluşmamış. Supabase panelinden
            kullanıcıyı silip yeniden eklemek sorunu çözer.
          </p>
        </div>
      </div>
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
