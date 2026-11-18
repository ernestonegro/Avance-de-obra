-- =============================================================================
-- Enlaces "en vivo" para clientes: sin fecha de fin ni vencimiento.
-- Muestran el avance día a día (desde el inicio o desde una fecha) hasta que se
-- finalizan (revocado = true). Ejecutar en Supabase → SQL Editor.
-- =============================================================================

alter table public.reportes_publicos alter column fecha_desde drop not null;
alter table public.reportes_publicos alter column fecha_hasta drop not null;
-- El CHECK (fecha_hasta >= fecha_desde) existente deja pasar los valores nulos.

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
      'incluye_problemas',      r.incluir_problemas,
      'en_vivo',                r.fecha_hasta is null
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
        -- Fechas opcionales: sin desde = desde el inicio; sin hasta = enlace en vivo (hasta hoy).
        and (r.fecha_desde is null or (a.registrado_en at time zone p.zona_horaria)::date >= r.fecha_desde)
        and (r.fecha_hasta is null or (a.registrado_en at time zone p.zona_horaria)::date <= r.fecha_hasta)
        and (r.etapas is null or a.etapa = any (r.etapas))
        and (r.incluir_problemas or a.estado not in ('requiere_material', 'demora_imprevisto'))
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.obtener_reporte_publico(text) from public;
grant execute on function public.obtener_reporte_publico(text) to anon, authenticated;
