# Bitácora y Avance de Obra (PWA)

Registro diario de avance de obra con fotos comprimidas en el teléfono, feed cronológico con filtros y reportes públicos de solo lectura para clientes.

**Stack:** React 19 + Vite 8 · Tailwind CSS 4 · Lucide · Supabase (Postgres, Storage, Auth) · vite-plugin-pwa · Netlify.

## Puesta en marcha

1. **Supabase**: en el SQL Editor, ejecutá `supabase/migrations/20261117000000_bitacora_avance_obra.sql`
   (o `supabase db push`). Crea tipos, tablas, RLS, RPCs y el bucket `fotos-avance`.
2. **Primer director**: registrate desde la app y luego, en SQL:
   ```sql
   update public.perfiles set rol = 'admin' where email = 'tu@email.com';  -- o 'director'
   ```
   El rol global sólo define quién puede crear obras. El acceso a cada obra lo dan los roles por obra (`proyecto_miembros`).
3. **Local**: `cp .env.example .env`, completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, después `npm install && npm run dev`.
4. **Netlify**: conectá el repo, definí las mismas dos variables en *Site settings → Environment variables*. `netlify.toml` ya configura build, SPA redirects y caché del service worker.
5. En Supabase → Auth → URL Configuration, agregá el dominio de Netlify como *Site URL* / *Redirect URL*.

## Estructura

```
├── index.html
├── netlify.toml                 # build, redirects SPA, headers de caché
├── vite.config.js               # React + Tailwind + PWA (cache-first de fotos)
├── public/                      # íconos del PWA
├── supabase/migrations/         # esquema SQL completo + RLS + RPCs + Storage
└── src/
    ├── main.jsx                 # entrada; pantalla de aviso si faltan variables de entorno
    ├── App.jsx                  # rutas: / · /nuevo · /reportes · /obras · /ingresar · /r/:token (pública)
    ├── index.css                # Tailwind 4, alto contraste, estilos de impresión
    ├── lib/
    │   ├── supabase.js          # cliente, URL de fotos, mensajes de error legibles
    │   ├── constantes.js        # etapas y estados (espejo de los enums SQL)
    │   ├── fechas.js            # formato es-AR, agrupado por día
    │   ├── imagenes.js          # compresión en el cliente: 1920px + miniatura 480px
    │   └── subida.js            # subida XHR con progreso real, reintentos y espera de señal
    ├── hooks/
    │   ├── useAuth.jsx          # sesión + perfil (contexto)
    │   ├── useProyectos.js      # obras visibles + obra activa recordada
    │   ├── useFeedAvances.js    # feed paginado con filtros
    │   ├── useSubirAvance.js    # comprimir → subir → RPC crear_avance (idempotente)
    │   └── useReportes.js       # enlaces públicos: crear / listar / revocar
    ├── components/
    │   ├── layout/              # AppShell (nav inferior + botón "+"), RutaProtegida
    │   └── ui/                  # Boton, Skeleton, BarraProgreso, Aviso, BadgeEstado, SelectorObra
    └── features/
        ├── auth/Login.jsx
        ├── avances/             # FormularioAvance, SelectorFotos, FeedAvances, FiltrosFeed,
        │                        # TarjetaAvance, GaleriaAvance, Lightbox
        ├── reportes/            # GeneradorReporte, ReportePublico (imprimible a PDF)
        └── proyectos/Proyectos.jsx
```

## Decisiones de diseño

- **Subida resistente a 4G débil.** Cada foto se comprime en el teléfono (≈0,4 MB + miniatura ≈60 KB), se sube de a una por XHR (barra de progreso real) con 5 intentos y backoff, y si se corta la señal espera al evento `online`. El UUID del avance se genera en el cliente: un reintento no vuelve a subir lo que ya subió ni duplica registros (`crear_avance` es idempotente y transaccional).
- **Privacidad.** `comentario` es lo que ve el cliente; `nota_interna` es sólo para el equipo. Los clientes **no** leen `avances` por RLS: acceden sólo por `/r/:token`, donde el servidor (`obtener_reporte_publico`) quita notas internas y estados problemáticos salvo que el reporte los incluya. Los enlaces pueden vencer o revocarse.
- **Bucket de lectura pública.** Las rutas son `obra/avance/foto` con UUIDs (no enumerables), así los reportes públicos y el caché offline del PWA funcionan sin firmar URLs. La escritura está restringida por RLS al equipo de cada obra. Si necesitás bucket privado, cambiá `public` a `false` y firmá URLs con una Netlify Function con la service key.
- **PDF.** El reporte público tiene estilos `@media print` (A4, sin cortes dentro de un registro): "Imprimir / Guardar PDF" usa el diálogo nativo, sin librerías pesadas.

## Pendientes sugeridos

- Cola offline persistente (IndexedDB + Background Sync) para cargar sin señal y enviar más tarde.
- Limpieza programada de fotos huérfanas (subidas cuyo avance nunca se confirmó).
- Edición/borrado de avances desde la UI (las políticas RLS ya lo permiten al autor y al director).
