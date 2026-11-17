-- =============================================================================
-- Bitácora y Avance de Obra — esquema inicial (modo SIN LOGIN)
-- Ejecutar en Supabase: SQL Editor → pegar y correr, o `supabase db push`.
--
-- Modelo de acceso: la app usa sólo la anon key, sin cuentas de usuario.
--   · Cualquiera con la URL puede VER y AGREGAR (obras, avances, fotos, reportes).
--   · Nadie puede EDITAR ni BORRAR desde la app: lo cargado no se puede vandalizar.
--     Correcciones y bajas se hacen desde el panel de Supabase.
--   · El alta de avances pasa por la RPC `crear_avance`, que valida todo en el servidor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
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
create table public.proyectos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (char_length(trim(nombre)) between 2 and 120),
  direccion      text check (char_length(direccion) <= 200),
  cliente_nombre text check (char_length(cliente_nombre) <= 120),
  fecha_inicio   date,
  zona_horaria   text not null default 'America/Argentina/Buenos_Aires',
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Un registro de bitácora.
-- `comentario`: nota técnica, visible en reportes al cliente.
-- `nota_interna`: sólo se incluye en reportes si se pide explícitamente.
-- `autor_nombre`: sin login, quien registra escribe su nombre (queda recordado en el teléfono).
create table public.avances (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references public.proyectos (id) on delete cascade,
  autor_nombre  text not null check (char_length(trim(autor_nombre)) between 2 and 80),
  etapa         public.etapa_obra not null,
  estado        public.estado_avance not null default 'avance_normal',
  comentario    text check (char_length(comentario) <= 4000),
  nota_interna  text check (char_length(nota_interna) <= 4000),
  registrado_en timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index avances_proyecto_fecha_idx on public.avances (proyecto_id, registrado_en desc, id desc);
create index avances_fecha_idx          on public.avances (registrado_en desc, id desc);
create index avances_etapa_idx          on public.avances (proyecto_id, etapa);
create index avances_estado_idx         on public.avances (proyecto_id, estado);

-- Fotos: versión principal (≈1920px) para el visor y miniatura (≈480px) para el feed,
-- ambas comprimidas en el teléfono antes de subir.
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

-- Enlaces de reporte para clientes: una vista acotada (rango de fechas, sin notas
-- internas ni problemas salvo que se pidan) que se puede imprimir a PDF.
create table public.reportes_publicos (
  id                     uuid primary key default gen_random_uuid(),
  token                  text not null unique
                         default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  proyecto_id            uuid not null references public.proyectos (id) on delete cascade,
  titulo                 text not null default 'Reporte de avance de obra' check (char_length(titulo) <= 120),
  fecha_desde            date not null,
  fecha_hasta            date not null,
  etapas                 public.etapa_obra[],          -- null = todas
  incluir_notas_internas boolean not null default false,
  incluir_problemas      boolean not null default false, -- requiere_material / demora_imprevisto
  expira_en              timestamptz,
  revocado               boolean not null default false,
  created_at             timestamptz not null default now(),
  check (fecha_hasta >= fecha_desde)
);
create index reportes_publicos_proyecto_idx on public.reportes_publicos (proyecto_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Permisos: ver y agregar sí; editar y borrar no.
-- -----------------------------------------------------------------------------
revoke all on public.proyectos, public.avances, public.fotos_avance, public.reportes_publicos
  from anon, authenticated;

grant select, insert on public.proyectos         to anon, authenticated;
grant select         on public.avances           to anon, authenticated; -- alta sólo vía crear_avance()
grant select         on public.fotos_avance      to anon, authenticated; -- alta sólo vía crear_avance()
grant select, insert on public.reportes_publicos to anon, authenticated;
grant update (revocado) on public.reportes_publicos to anon, authenticated;

alter table public.proyectos         enable row level security;
alter table public.avances           enable row level security;
alter table public.fotos_avance      enable row level security;
alter table public.reportes_publicos enable row level security;

create policy proyectos_select on public.proyectos for select to anon, authenticated using (true);
create policy proyectos_insert on public.proyectos for insert to anon, authenticated with check (activo);

create policy avances_select on public.avances      for select to anon, authenticated using (true);
create policy fotos_select   on public.fotos_avance for select to anon, authenticated using (true);

create policy reportes_select on public.reportes_publicos for select to anon, authenticated using (true);
create policy reportes_insert on public.reportes_publicos for insert to anon, authenticated with check (not revocado);
-- Sólo se puede revocar; un enlace revocado no se puede reactivar.
create policy reportes_revocar on public.reportes_publicos for update to anon, authenticated
  using (not revocado) with check (revocado);

-- -----------------------------------------------------------------------------
-- 4. Funciones
-- -----------------------------------------------------------------------------

-- Proyecto del primer segmento de una ruta de Storage "<proyecto_id>/<avance_id>/<archivo>".
create or replace function public.proyecto_de_ruta(p_ruta text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when split_part(p_ruta, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_ruta, '/', 1)::uuid
  end;
$$;

-- Alta atómica e idempotente de un avance + fotos.
-- El cliente genera el UUID del avance antes de subir las fotos: si la respuesta se
-- pierde por mala señal y se reintenta, no se duplica nada.
create or replace function public.crear_avance(
  p_id           uuid,
  p_proyecto_id  uuid,
  p_autor_nombre text,
  p_etapa        public.etapa_obra,
  p_estado       public.estado_avance,
  p_comentario   text,
  p_nota_interna text,
  p_fotos        jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer       -- las tablas no admiten INSERT directo: toda alta pasa por acá
set search_path = ''
as $$
declare
  v_foto      jsonb;
  v_prefijo   text := p_proyecto_id::text || '/' || p_id::text || '/';
  v_creado_en timestamptz;
begin
  if jsonb_typeof(p_fotos) <> 'array' then
    raise exception 'p_fotos debe ser un array';
  end if;
  if jsonb_array_length(p_fotos) > 12 then
    raise exception 'Máximo 12 fotos por avance';
  end if;
  if nullif(trim(coalesce(p_comentario, '')), '') is null and jsonb_array_length(p_fotos) = 0 then
    raise exception 'El avance necesita al menos una foto o un comentario';
  end if;
  if not exists (select 1 from public.proyectos where id = p_proyecto_id and activo) then
    raise exception 'La obra no existe o está inactiva';
  end if;

  insert into public.avances (id, proyecto_id, autor_nombre, etapa, estado, comentario, nota_interna)
  values (
    p_id, p_proyecto_id, trim(p_autor_nombre), p_etapa, p_estado,
    nullif(trim(p_comentario), ''), nullif(trim(p_nota_interna), '')
  )
  on conflict (id) do nothing;

  -- Reintento: el avance ya existía. Sólo se aceptan fotos durante la primera hora,
  -- para que nadie pueda "colgar" fotos en registros viejos.
  select created_at into v_creado_en from public.avances where id = p_id and proyecto_id = p_proyecto_id;
  if v_creado_en is null then
    raise exception 'El identificador de avance ya pertenece a otra obra';
  end if;
  if v_creado_en < now() - interval '1 hour' then
    return p_id;
  end if;

  for v_foto in select * from jsonb_array_elements(p_fotos) loop
    if left(v_foto ->> 'storage_path', length(v_prefijo)) <> v_prefijo
       or left(v_foto ->> 'thumb_path', length(v_prefijo)) <> v_prefijo then
      raise exception 'Ruta de foto inválida: %', v_foto ->> 'storage_path';
    end if;
    -- La foto tiene que estar realmente subida.
    if not exists (select 1 from storage.objects o where o.bucket_id = 'fotos-avance' and o.name = v_foto ->> 'storage_path')
       or not exists (select 1 from storage.objects o where o.bucket_id = 'fotos-avance' and o.name = v_foto ->> 'thumb_path') then
      raise exception 'La foto % no se encuentra en Storage', v_foto ->> 'storage_path';
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

revoke execute on function public.crear_avance(uuid, uuid, text, public.etapa_obra, public.estado_avance, text, text, jsonb) from public;
grant execute on function public.crear_avance(uuid, uuid, text, public.etapa_obra, public.estado_avance, text, text, jsonb) to anon, authenticated;

-- Reporte por token, con los filtros de privacidad aplicados en el servidor.
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
          'autor_nombre',  a.autor_nombre,
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
-- 5. Storage: bucket de fotos
-- -----------------------------------------------------------------------------
-- Lectura pública por URL (rutas con UUID). Escritura: sólo alta de archivos nuevos
-- dentro de la carpeta de una obra existente. Sin política de UPDATE ni DELETE:
-- una foto subida no se puede sobrescribir ni borrar desde la app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-avance', 'fotos-avance', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy fotos_storage_insert on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'fotos-avance'
    and exists (select 1 from public.proyectos p where p.id = public.proyecto_de_ruta(name) and p.activo)
  );
