-- =============================================================================
-- Notificaciones push al celular cuando se registra un avance.
-- Ejecutar en Supabase → SQL Editor.
--
-- · suscripciones_push: un registro por celular/navegador que activó los avisos,
--   con las obras que le interesan (null = todas).
-- · config_push: claves VAPID para firmar los envíos. Las genera la función de
--   Netlify la primera vez que se usa; la privada nunca sale del servidor.
-- · avances.notificado_en: evita avisar dos veces el mismo avance.
--
-- Desde la app (anon) sólo se puede: guardar / quitar la propia suscripción y leer
-- la clave pública. Leer suscripciones y enviar avisos lo hace únicamente la función
-- del servidor con la service_role key.
-- =============================================================================

create table public.suscripciones_push (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  proyecto_ids uuid[],                       -- null = todas las obras
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.config_push (
  id            boolean primary key default true check (id),  -- una sola fila
  vapid_publica text not null,
  vapid_privada text not null,
  created_at    timestamptz not null default now()
);

alter table public.avances add column if not exists notificado_en timestamptz;

-- Sin acceso directo desde la app: sólo por las funciones de abajo o la service_role.
alter table public.suscripciones_push enable row level security;
alter table public.config_push        enable row level security;
revoke all on public.suscripciones_push, public.config_push from anon, authenticated;

-- Guardar (o actualizar) la suscripción de este celular y sus obras elegidas.
create or replace function public.guardar_suscripcion_push(
  p_endpoint  text,
  p_p256dh    text,
  p_auth      text,
  p_proyectos uuid[] default null
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_endpoint is null or p_endpoint not like 'https://%' then
    raise exception 'Suscripción inválida';
  end if;
  insert into public.suscripciones_push (endpoint, p256dh, auth, proyecto_ids)
  values (p_endpoint, p_p256dh, p_auth, nullif(p_proyectos, '{}'))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        proyecto_ids = excluded.proyecto_ids,
        updated_at = now();
end $$;

-- Quitar la suscripción de este celular. El endpoint es una URL secreta y aleatoria
-- que sólo conoce ese navegador, así que alcanza como prueba de que es suya.
create or replace function public.borrar_suscripcion_push(p_endpoint text)
returns void
language sql security definer set search_path = '' as $$
  delete from public.suscripciones_push where endpoint = p_endpoint;
$$;

-- Qué obras eligió este celular (para mostrar el estado en la pantalla de avisos).
create or replace function public.estado_suscripcion_push(p_endpoint text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('suscripto', true, 'proyectos', proyecto_ids)
  from public.suscripciones_push where endpoint = p_endpoint;
$$;

revoke execute on function public.guardar_suscripcion_push(text, text, text, uuid[]) from public;
revoke execute on function public.borrar_suscripcion_push(text) from public;
revoke execute on function public.estado_suscripcion_push(text) from public;
grant execute on function public.guardar_suscripcion_push(text, text, text, uuid[]) to anon, authenticated;
grant execute on function public.borrar_suscripcion_push(text) to anon, authenticated;
grant execute on function public.estado_suscripcion_push(text) to anon, authenticated;
