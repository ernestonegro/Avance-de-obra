-- =============================================================================
-- Permitir editar los datos de una obra desde la app (sin login).
-- Ejecutar en Supabase → SQL Editor, después de la migración inicial.
--
-- Sólo se pueden modificar nombre, dirección y cliente. Borrar una obra, o cambiar
-- su zona horaria o si está activa, sigue siendo posible únicamente desde el panel.
-- Los CHECK de la tabla siguen aplicando (nombre de 2 a 120 caracteres, etc.).
-- =============================================================================

grant update (nombre, direccion, cliente_nombre) on public.proyectos to anon, authenticated;

drop policy if exists proyectos_update on public.proyectos;
create policy proyectos_update on public.proyectos for update to anon, authenticated
  using (true) with check (true);
