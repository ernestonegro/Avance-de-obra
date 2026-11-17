-- =============================================================================
-- Bitácora y Avance de Obra — esquema inicial
-- Ejecutar en Supabase: SQL Editor → pegar y correr, o `supabase db push`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
create type public.rol_usuario as enum ('admin', 'director', 'encargado', 'cliente');
create type public.rol_proyecto as enum ('director', 'encargado', 'cliente');

create type public.etapa_obra as enum (
  'preliminares',
  'movimiento_suelos',
  'fundaciones',
  'estructura',
  'albanileria',
  'instalaciones_sanitarias',
  'instalaciones_electricas',
  'instalaciones_gas',
  'revoques',
  'contrapisos',
  'pisos_revestimientos',
  'carpinterias',
  'pintura',
  'terminaciones',
  'limpieza_entrega',
  'otros'
);

create type public.estado_avance as enum (
  'avance_normal',
  'requiere_material',
  'demora_imprevisto',
  'listo_inspeccion'
);

-- -----------------------------------------------------------------------------
-- 2. Tablas
-- -----------------------------------------------------------------------------

-- Perfil 1:1 con auth.users. Se crea automáticamente por trigger al registrarse.
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  nombre     text not null,
  rol        public.rol_usuario not null default 'encargado',
  created_at timestamptz not null default now()
);

create table public.proyectos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (char_length(nombre) between 2 and 120),
  direccion      text,
  cliente_nombre text,
  fecha_inicio   date,
  zona_horaria   text not null default 'America/Argentina/Buenos_Aires',
  activo         boolean not null default true,
  creado_por     uuid not null default auth.uid() references public.perfiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Quién trabaja en qué obra y con qué rol.
create table public.proyecto_miembros (
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  rol         public.rol_proyecto not null default 'encargado',
  created_at  timestamptz not null default now(),
  primary key (proyecto_id, usuario_id)
);
create index proyecto_miembros_usuario_idx on public.proyecto_miembros (usuario_id);

-- Un registro de bitácora (una "entrada" del día).
-- `comentario` es la nota técnica visible para el cliente en reportes;
-- `nota_interna` sólo se muestra al equipo (y en reportes si se pide explícitamente).
create table public.avances (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references public.proyectos (id) on delete cascade,
  autor_id      uuid not null default auth.uid() references public.perfiles (id),
  etapa         public.etapa_obra not null,
  estado        public.estado_avance not null default 'avance_normal',
  comentario    text check (char_length(comentario) <= 4000),
  nota_interna  text check (char_length(nota_interna) <= 4000),
  registrado_en timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index avances_proyecto_fecha_idx on public.avances (proyecto_id, registrado_en desc, id desc);
create index avances_fecha_idx          on public.avances (registrado_en desc, id desc);
create index avances_etapa_idx          on public.avances (proyecto_id, etapa);
create index avances_estado_idx         on public.avances (proyecto_id, estado);
create index avances_autor_idx          on public.avances (autor_id);

-- Fotos de cada avance. Se guardan dos versiones comprimidas en el cliente:
-- `storage_path` (≈1920px) para el lightbox y `thumb_path` (≈480px) para el feed.
create table public.fotos_avance (
  id           uuid primary key default gen_random_uuid(),
  avance_id    uuid not null references public.avances (id) on delete cascade,
  storage_path text not null unique,
  thumb_path   text not null unique,
  ancho        integer check (ancho > 0),
  alto         integer check (alto > 0),
  bytes        integer check (bytes > 0),
  orden        smallint not null default 0,
  tomada_en    timestamptz,
  created_at   timestamptz not null default now()
);
create index fotos_avance_avance_idx on public.fotos_avance (avance_id, orden);

-- Enlaces públicos de solo lectura para clientes.
create table public.reportes_publicos (
  id                     uuid primary key default gen_random_uuid(),
  -- 64 caracteres hex (≈244 bits de entropía): no adivinable.
  token                  text not null unique
                         default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  proyecto_id            uuid not null references public.proyectos (id) on delete cascade,
  titulo                 text not null default 'Reporte de avance de obra',
  fecha_desde            date not null,
  fecha_hasta            date not null,
  etapas                 public.etapa_obra[],          -- null = todas
  incluir_notas_internas boolean not null default false,
  incluir_problemas      boolean not null default false, -- requiere_material / demora_imprevisto
  expira_en              timestamptz,
  revocado               boolean not null default false,
  creado_por             uuid not null default auth.uid() references public.perfiles (id),
  created_at             timestamptz not null default now(),
  check (fecha_hasta >= fecha_desde)
);
create index reportes_publicos_proyecto_idx on public.reportes_publicos (proyecto_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Triggers utilitarios
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger proyectos_updated_at before update on public.proyectos
  for each row execute function public.tg_set_updated_at();
create trigger avances_updated_at before update on public.avances
  for each row execute function public.tg_set_updated_at();

-- Crear perfil al registrarse un usuario.
create or replace function public.tg_crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_crear_perfil();

-- El creador de una obra queda como director de la misma.
create or replace function public.tg_creador_es_director()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.proyecto_miembros (proyecto_id, usuario_id, rol)
  values (new.id, new.creado_por, 'director')
  on conflict do nothing;
  return new;
end $$;

create trigger proyectos_creador_director after insert on public.proyectos
  for each row execute function public.tg_creador_es_director();

-- -----------------------------------------------------------------------------
-- 4. Funciones de autorización (security definer → evitan recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.puede_crear_proyectos()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'director'));
$$;

create or replace function public.rol_en_proyecto(p_proyecto uuid)
returns public.rol_proyecto language sql stable security definer set search_path = '' as $$
  select rol from public.proyecto_miembros where proyecto_id = p_proyecto and usuario_id = auth.uid();
$$;

-- Cualquier miembro (incluye clientes).
create or replace function public.es_miembro(p_proyecto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.es_admin() or public.rol_en_proyecto(p_proyecto) is not null;
$$;

-- Equipo técnico: puede ver y cargar bitácora.
create or replace function public.es_staff(p_proyecto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.es_admin() or coalesce(public.rol_en_proyecto(p_proyecto) in ('director', 'encargado'), false);
$$;

create or replace function public.es_director(p_proyecto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.es_admin() or coalesce(public.rol_en_proyecto(p_proyecto) = 'director', false);
$$;

create or replace function public.comparte_proyecto(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.proyecto_miembros yo
    join public.proyecto_miembros otro on otro.proyecto_id = yo.proyecto_id
    where yo.usuario_id = auth.uid() and otro.usuario_id = p_usuario
  );
$$;

-- Extrae el proyecto del primer segmento de una ruta de Storage: "<proyecto_id>/<avance_id>/<archivo>".
create or replace function public.proyecto_de_ruta(p_ruta text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when split_part(p_ruta, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_ruta, '/', 1)::uuid
  end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.perfiles          enable row level security;
alter table public.proyectos         enable row level security;
alter table public.proyecto_miembros enable row level security;
alter table public.avances           enable row level security;
alter table public.fotos_avance      enable row level security;
alter table public.reportes_publicos enable row level security;

-- perfiles --------------------------------------------------------------------
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_admin() or public.comparte_proyecto(id));

create policy perfiles_update_propio on public.perfiles for update to authenticated
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());

-- Un usuario sólo puede cambiar su nombre; el rol lo cambia un admin vía SQL / panel.
revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;

-- proyectos -------------------------------------------------------------------
create policy proyectos_select on public.proyectos for select to authenticated
  using (public.es_miembro(id));

create policy proyectos_insert on public.proyectos for insert to authenticated
  with check (public.puede_crear_proyectos() and creado_por = auth.uid());

create policy proyectos_update on public.proyectos for update to authenticated
  using (public.es_director(id)) with check (public.es_director(id));

create policy proyectos_delete on public.proyectos for delete to authenticated
  using (public.es_admin());

-- proyecto_miembros -----------------------------------------------------------
create policy miembros_select on public.proyecto_miembros for select to authenticated
  using (public.es_miembro(proyecto_id));

create policy miembros_insert on public.proyecto_miembros for insert to authenticated
  with check (public.es_director(proyecto_id));

create policy miembros_update on public.proyecto_miembros for update to authenticated
  using (public.es_director(proyecto_id)) with check (public.es_director(proyecto_id));

create policy miembros_delete on public.proyecto_miembros for delete to authenticated
  using (public.es_director(proyecto_id));

-- avances ---------------------------------------------------------------------
-- Los clientes NO leen la bitácora interna: acceden sólo vía reportes públicos.
create policy avances_select on public.avances for select to authenticated
  using (public.es_staff(proyecto_id));

create policy avances_insert on public.avances for insert to authenticated
  with check (public.es_staff(proyecto_id) and autor_id = auth.uid());

create policy avances_update on public.avances for update to authenticated
  using (autor_id = auth.uid() or public.es_director(proyecto_id))
  with check (public.es_staff(proyecto_id));

create policy avances_delete on public.avances for delete to authenticated
  using (autor_id = auth.uid() or public.es_director(proyecto_id));

-- fotos_avance ----------------------------------------------------------------
create policy fotos_select on public.fotos_avance for select to authenticated
  using (exists (select 1 from public.avances a where a.id = avance_id and public.es_staff(a.proyecto_id)));

create policy fotos_insert on public.fotos_avance for insert to authenticated
  with check (exists (
    select 1 from public.avances a
    where a.id = avance_id
      and a.autor_id = auth.uid()
      and public.es_staff(a.proyecto_id)
      and public.proyecto_de_ruta(storage_path) = a.proyecto_id
      and public.proyecto_de_ruta(thumb_path) = a.proyecto_id
  ));

create policy fotos_delete on public.fotos_avance for delete to authenticated
  using (exists (
    select 1 from public.avances a
    where a.id = avance_id and (a.autor_id = auth.uid() or public.es_director(a.proyecto_id))
  ));

-- reportes_publicos -----------------------------------------------------------
create policy reportes_select on public.reportes_publicos for select to authenticated
  using (public.es_staff(proyecto_id));

create policy reportes_insert on public.reportes_publicos for insert to authenticated
  with check (public.es_staff(proyecto_id) and creado_por = auth.uid());

create policy reportes_update on public.reportes_publicos for update to authenticated
  using (creado_por = auth.uid() or public.es_director(proyecto_id))
  with check (public.es_staff(proyecto_id));

create policy reportes_delete on public.reportes_publicos for delete to authenticated
  using (creado_por = auth.uid() or public.es_director(proyecto_id));

-- -----------------------------------------------------------------------------
-- 6. RPCs
-- -----------------------------------------------------------------------------

-- Alta atómica e idempotente de un avance + sus fotos.
-- El cliente genera el UUID del avance antes de subir las fotos; si la respuesta
-- se pierde por mala señal y se reintenta, no se duplica nada.
create or replace function public.crear_avance(
  p_id           uuid,
  p_proyecto_id  uuid,
  p_etapa        public.etapa_obra,
  p_estado       public.estado_avance,
  p_comentario   text,
  p_nota_interna text,
  p_fotos        jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker            -- corre con los permisos del usuario: aplica RLS
set search_path = ''
as $$
declare
  v_foto   jsonb;
  v_prefijo text := p_proyecto_id::text || '/' || p_id::text || '/';
begin
  if jsonb_typeof(p_fotos) <> 'array' then
    raise exception 'p_fotos debe ser un array';
  end if;

  if nullif(trim(coalesce(p_comentario, '')), '') is null and jsonb_array_length(p_fotos) = 0 then
    raise exception 'El avance necesita al menos una foto o un comentario';
  end if;

  insert into public.avances (id, proyecto_id, autor_id, etapa, estado, comentario, nota_interna)
  values (
    p_id, p_proyecto_id, auth.uid(), p_etapa, p_estado,
    nullif(trim(p_comentario), ''), nullif(trim(p_nota_interna), '')
  )
  on conflict (id) do nothing;

  for v_foto in select * from jsonb_array_elements(p_fotos) loop
    if left(v_foto ->> 'storage_path', length(v_prefijo)) <> v_prefijo
       or left(v_foto ->> 'thumb_path', length(v_prefijo)) <> v_prefijo then
      raise exception 'Ruta de foto inválida: %', v_foto ->> 'storage_path';
    end if;

    insert into public.fotos_avance (avance_id, storage_path, thumb_path, ancho, alto, bytes, orden, tomada_en)
    values (
      p_id,
      v_foto ->> 'storage_path',
      v_foto ->> 'thumb_path',
      (v_foto ->> 'ancho')::int,
      (v_foto ->> 'alto')::int,
      (v_foto ->> 'bytes')::int,
      coalesce((v_foto ->> 'orden')::smallint, 0),
      (v_foto ->> 'tomada_en')::timestamptz
    )
    on conflict (storage_path) do nothing;
  end loop;

  return p_id;
end $$;

grant execute on function public.crear_avance(uuid, uuid, public.etapa_obra, public.estado_avance, text, text, jsonb) to authenticated;

-- Agregar un miembro a una obra por email (el usuario debe haberse registrado antes).
create or replace function public.agregar_miembro_por_email(
  p_proyecto_id uuid,
  p_email       text,
  p_rol         public.rol_proyecto
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid;
begin
  if not public.es_director(p_proyecto_id) then
    raise exception 'Sólo un director de la obra puede agregar miembros' using errcode = '42501';
  end if;

  select id into v_usuario from public.perfiles where lower(email) = lower(trim(p_email));
  if v_usuario is null then
    raise exception 'No existe un usuario registrado con el email %', p_email using errcode = 'P0002';
  end if;

  insert into public.proyecto_miembros (proyecto_id, usuario_id, rol)
  values (p_proyecto_id, v_usuario, p_rol)
  on conflict (proyecto_id, usuario_id) do update set rol = excluded.rol;

  return v_usuario;
end $$;

grant execute on function public.agregar_miembro_por_email(uuid, text, public.rol_proyecto) to authenticated;

-- Lectura pública de un reporte por token (sin login). Aplica en el servidor los
-- filtros de privacidad: notas internas y estados problemáticos.
create or replace function public.obtener_reporte_publico(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reportes_publicos;
  p public.proyectos;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  select * into r
  from public.reportes_publicos
  where token = p_token
    and not revocado
    and (expira_en is null or expira_en > now());

  if not found then
    return null;
  end if;

  select * into p from public.proyectos where id = r.proyecto_id;

  return jsonb_build_object(
    'reporte', jsonb_build_object(
      'titulo',                 r.titulo,
      'fecha_desde',            r.fecha_desde,
      'fecha_hasta',            r.fecha_hasta,
      'generado_en',            r.created_at,
      'incluye_notas_internas', r.incluir_notas_internas,
      'incluye_problemas',      r.incluir_problemas
    ),
    'proyecto', jsonb_build_object(
      'nombre',         p.nombre,
      'direccion',      p.direccion,
      'cliente_nombre', p.cliente_nombre,
      'zona_horaria',   p.zona_horaria
    ),
    'avances', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',            a.id,
          'etapa',         a.etapa,
          'estado',        a.estado,
          'comentario',    a.comentario,
          'nota_interna',  case when r.incluir_notas_internas then a.nota_interna end,
          'registrado_en', a.registrado_en,
          'autor',         pf.nombre,
          'fotos', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', f.id, 'storage_path', f.storage_path, 'thumb_path', f.thumb_path,
                'ancho', f.ancho, 'alto', f.alto, 'tomada_en', f.tomada_en
              ) order by f.orden, f.created_at
            )
            from public.fotos_avance f where f.avance_id = a.id
          ), '[]'::jsonb)
        ) order by a.registrado_en desc
      )
      from public.avances a
      join public.perfiles pf on pf.id = a.autor_id
      where a.proyecto_id = r.proyecto_id
        and (a.registrado_en at time zone p.zona_horaria)::date between r.fecha_desde and r.fecha_hasta
        and (r.etapas is null or a.etapa = any (r.etapas))
        and (r.incluir_problemas or a.estado not in ('requiere_material', 'demora_imprevisto'))
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.obtener_reporte_publico(text) from public;
grant execute on function public.obtener_reporte_publico(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Storage: bucket de fotos
-- -----------------------------------------------------------------------------
-- Bucket de lectura pública: las rutas llevan UUIDs (proyecto/avance/foto), no son
-- enumerables, y así los reportes públicos y el cache offline del PWA funcionan sin
-- firmar URLs. La escritura queda restringida por RLS al equipo de cada obra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-avance', 'fotos-avance', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy fotos_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos-avance' and public.es_staff(public.proyecto_de_ruta(name)));

create policy fotos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-avance' and public.es_staff(public.proyecto_de_ruta(name)));

-- Necesaria para `x-upsert: true` (reintentos de subida sobre la misma ruta).
create policy fotos_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos-avance' and owner_id = auth.uid()::text)
  with check (bucket_id = 'fotos-avance' and public.es_staff(public.proyecto_de_ruta(name)));

create policy fotos_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-avance'
    and (owner_id = auth.uid()::text or public.es_director(public.proyecto_de_ruta(name)))
  );
