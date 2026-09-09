import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../auth.css'

export default function Pendiente() {
  const salir = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">⏳</div>
        <h1 className="auth-title">Acceso pendiente</h1>
        <p className="auth-subtitle" style={{ marginBottom: 0 }}>
          Tu cuenta está creada pero aún no ha sido aprobada por el administrador.
          Recibirás acceso en breve — vuelve a intentarlo más tarde.
        </p>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={salir} className="auth-btn">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
