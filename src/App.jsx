import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, ADMIN_EMAIL } from './lib/supabase'

import Login from './pages/Login'
import Registro from './pages/Registro'
import Pendiente from './pages/Pendiente'
import Admin from './pages/Admin'
import ScoreProductos from './ScoreProductos'

// ── Guard: redirige si no hay sesión ──────────────────────────────────────────
function Privada({ children }) {
  const [estado, setEstado] = useState('cargando') // 'cargando' | 'ok' | 'pendiente' | 'sin-sesion'

  useEffect(() => {
    let montado = true

    const verificar = async (session) => {
      if (!session) {
        if (montado) setEstado('sin-sesion')
        return
      }

      // Admin siempre tiene acceso
      if (session.user.email === ADMIN_EMAIL) {
        if (montado) setEstado('ok')
        return
      }

      // Verificar si fue aprobado en la tabla de usuarios
      const { data } = await supabase
        .from('usuarios')
        .select('aprobado')
        .eq('id', session.user.id)
        .single()

      if (montado) setEstado(data?.aprobado ? 'ok' : 'pendiente')
    }

    supabase.auth.getSession().then(({ data }) => verificar(data?.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      verificar(session)
    })

    return () => {
      montado = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (estado === 'cargando') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#475569', fontFamily: 'system-ui'
      }}>
        Cargando…
      </div>
    )
  }

  if (estado === 'sin-sesion') return <Navigate to="/login" replace />
  if (estado === 'pendiente') return <Navigate to="/pendiente" replace />
  return children
}

// ── Guard: si ya hay sesión válida, no mostrar Login/Registro ─────────────────
function Publica({ children }) {
  const [sesion, setSesion] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data?.session ?? null))
  }, [])

  if (sesion === undefined) return null
  if (sesion) return <Navigate to="/" replace />
  return children
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Publica><Login /></Publica>} />
        <Route path="/registro" element={<Publica><Registro /></Publica>} />

        {/* Página de espera (sin sesión activa pero ruta reservada) */}
        <Route path="/pendiente" element={<Pendiente />} />

        {/* Admin — sólo Daniel */}
        <Route path="/admin" element={<Privada><Admin /></Privada>} />

        {/* App principal protegida */}
        <Route path="/" element={<Privada><ScoreProductos /></Privada>} />

        {/* Cualquier otra ruta → inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
