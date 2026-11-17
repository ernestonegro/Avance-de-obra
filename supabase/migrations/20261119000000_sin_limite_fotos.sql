-- =============================================================================
-- Quitar el límite de 12 fotos por avance.
-- Ejecutar en Supabase → SQL Editor. Reemplaza la función crear_avance por la misma
-- versión sin ese tope; el resto de las validaciones no cambia.
-- =============================================================================

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
  if char_length(trim(coalesce(p_autor_nombre, ''))) < 2 then
    raise exception 'Falta el nombre de quien registra (mínimo 2 letras)';
  end if;
  if p_etapa is null then
    raise exception 'Falta la etapa / rubro';
  end if;
  if p_id is null or p_proyecto_id is null then
    raise exception 'Faltan datos del avance';
  end if;
  if jsonb_typeof(coalesce(p_fotos, 'null'::jsonb)) <> 'array' then
    raise exception 'p_fotos debe ser un array';
  end if;
  if nullif(trim(coalesce(p_comentario, '')), '') is null and jsonb_array_length(p_fotos) = 0 then
    raise exception 'El avance necesita al menos una foto o un comentario';
  end if;
  if not exists (select 1 from public.proyectos where id = p_proyecto_id and activo) then
    raise exception 'La obra no existe o está inactiva';
  end if;

  insert into public.avances (id, proyecto_id, autor_nombre, etapa, estado, comentario, nota_interna)
  values (
    p_id, p_proyecto_id, trim(p_autor_nombre), p_etapa, coalesce(p_estado, 'avance_normal'),
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
