import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../auth.css'

// ⚠️ Correo de Daniel — cambia si quieres recibir las notificaciones en otro
const CORREO_NOTIFICACIONES = 'daniel2001barragan@gmail.com'

export default function Registro() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const registrar = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      return setError('La contraseña debe tener mínimo 6 caracteres')
    }
    if (form.password !== form.confirmar) {
      return setError('Las contraseñas no coinciden')
    }

    setCargando(true)

    // 1. Crear cuenta en Supabase Auth
    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { nombre: form.nombre.trim() } }
    })

    if (authErr) {
      setError(
        authErr.message.includes('already registered')
          ? 'Este correo ya está registrado'
          : authErr.message
      )
      setCargando(false)
      return
    }

    // 2. Crear fila en tabla "usuarios" con aprobado=false
    if (data.user) {
      await supabase.from('usuarios').insert({
        id: data.user.id,
        email: form.email.trim(),
        nombre: form.nombre.trim(),
        aprobado: false,
      })
    }

    // 3. Notificar a Daniel por correo (usa FormSubmit, sin backend)
    try {
      await fetch(`https://formsubmit.co/ajax/${CORREO_NOTIFICACIONES}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `🔔 Nueva solicitud de acceso — ${form.nombre}`,
          Nombre: form.nombre.trim(),
          Correo: form.email.trim(),
          Mensaje: `${form.nombre} quiere acceso a Dropi Analyzer. Apruébalo en la sección Admin de la app.`,
          _captcha: 'false',
          _template: 'table',
        }),
      })
    } catch {
      // El registro funciona aunque el correo falle
    }

    // 4. Cerrar sesión automáticamente (espera aprobación)
    await supabase.auth.signOut()

    setCargando(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon">⏳</div>
          <h1 className="auth-title">Solicitud enviada</h1>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>
            Tu cuenta fue creada. El administrador revisará tu solicitud y te notificará
            cuando tengas acceso.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">🏆</div>
        <h1 className="auth-title">Solicitar acceso</h1>
        <p className="auth-subtitle">
          Crea tu cuenta — el administrador la aprobará antes de que puedas ingresar
        </p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={registrar}>
          <div className="auth-group">
            <label className="auth-label">Nombre completo</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={cambiar}
              placeholder="Tu nombre"
              className="auth-input"
              required
              autoFocus
            />
          </div>

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
            />
          </div>

          <div className="auth-group">
            <label className="auth-label">Contraseña (mín. 6 caracteres)</label>
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

          <div className="auth-group">
            <label className="auth-label">Confirmar contraseña</label>
            <input
              type="password"
              name="confirmar"
              value={form.confirmar}
              onChange={cambiar}
              placeholder="••••••••"
              className="auth-input"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={cargando}>
            {cargando ? 'Enviando solicitud...' : 'Solicitar acceso'}
          </button>
        </form>

        <div className="auth-divider">
          ¿Ya tienes acceso?{' '}
          <Link to="/login" className="auth-link">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  )
}
