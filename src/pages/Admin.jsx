import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, ADMIN_EMAIL } from '../lib/supabase'
import '../auth.css'

export default function Admin() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate('/')
        return
      }
      setSesion(data.session)
      cargarUsuarios()
    })
  }, [navigate])

  const cargarUsuarios = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })
    setUsuarios(data || [])
    setCargando(false)
  }

  const aprobar = async (id) => {
    await supabase.from('usuarios').update({ aprobado: true }).eq('id', id)
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, aprobado: true } : u))
    )
  }

  const rechazar = async (id) => {
    if (!confirm('¿Eliminar este usuario definitivamente?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    await supabase.auth.admin?.deleteUser(id).catch(() => {})
    setUsuarios((prev) => prev.filter((u) => u.id !== id))
  }

  const salir = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (cargando) {
    return (
      <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569' }}>Cargando usuarios…</p>
      </div>
    )
  }

  const pendientes = usuarios.filter((u) => !u.aprobado)
  const aprobados = usuarios.filter((u) => u.aprobado)

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Panel de administrador</div>
            <div className="admin-title">🔑 Dropi Analyzer — Usuarios</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/" className="btn-admin-link">← Volver a la app</Link>
            <button onClick={salir} className="btn-logout">Salir</button>
          </div>
        </div>

        {/* ── Pendientes de aprobación ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 14, fontSize: 13, fontWeight: 600, color: '#94a3b8'
          }}>
            <span>SOLICITUDES PENDIENTES</span>
            {pendientes.length > 0 && (
              <span style={{
                background: '#f59e0b', color: '#1c1917', borderRadius: 99,
                padding: '2px 8px', fontSize: 11, fontWeight: 700
              }}>
                {pendientes.length}
              </span>
            )}
          </div>

          {pendientes.length === 0 ? (
            <div className="empty-admin">
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p>Sin solicitudes pendientes</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre || '—'}</td>
                    <td style={{ color: '#94a3b8' }}>{u.email}</td>
                    <td><span className="badge-pending">Pendiente</span></td>
                    <td>
                      <button className="btn-approve" onClick={() => aprobar(u.id)}>
                        ✓ Aprobar
                      </button>
                      <button className="btn-reject" onClick={() => rechazar(u.id)}>
                        ✗ Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Ya aprobados ── */}
        {aprobados.length > 0 && (
          <div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#94a3b8',
              marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Usuarios con acceso
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {aprobados.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre || '—'}</td>
                    <td style={{ color: '#94a3b8' }}>{u.email}</td>
                    <td><span className="badge-approved">Aprobado</span></td>
                    <td>
                      <button className="btn-reject" onClick={() => rechazar(u.id)}>
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
