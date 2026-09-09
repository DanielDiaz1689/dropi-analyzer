-- ══════════════════════════════════════════════════════════════
--  DROPI ANALYZER — Setup de Supabase
--  Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Tabla de usuarios (complementa auth.users de Supabase)
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text,
  aprobado    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2. Seguridad: solo el usuario dueño puede leer su fila;
--    solo el service_role (tu backend) puede escribir / aprobar
alter table public.usuarios enable row level security;

-- Los usuarios pueden leer su propia fila (para que el frontend
-- sepa si ya fueron aprobados sin necesidad de la clave de servicio)
create policy "Usuario lee su fila"
  on public.usuarios for select
  using (auth.uid() = id);

-- El backend (service_role) ignora RLS automáticamente,
-- así que puede hacer insert / update / delete sin restricción.

-- 3. (Opcional) Index para búsquedas rápidas por aprobado
create index if not exists idx_usuarios_aprobado on public.usuarios(aprobado);
