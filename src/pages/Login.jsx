import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })

    if (err) {
      setError(
        err.message.includes('Invalid login')
          ? 'Correo o contraseña incorrectos'
          : err.message
      )
      setCargando(false)
      return
    }

    // Verificar si fue aprobado (App.jsx redirige automáticamente via onAuthStateChange)
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">🏆</div>
        <h1 className="auth-title">Dropi Analyzer</h1>
        <p className="auth-subtitle">Ingresa con tus credenciales para continuar</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={iniciarSesion}>
          <div className="auth-group">
            <label className="auth-label">Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={cambiar}
              placeholder="tu@correo.com"
              className="auth-input"
              required
              autoFocus
            />
          </div>

          <div className="auth-group">
            <label className="auth-label">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={cambiar}
              placeholder="••••••••"
              className="auth-input"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="auth-divider">
          ¿No tienes acceso?{' '}
          <Link to="/registro" className="auth-link">Solicita una cuenta</Link>
        </div>
      </div>
    </div>
  )
}
