# Bitácora y Avance de Obra (PWA)

Registro diario de avance de obra con fotos comprimidas en el teléfono, feed cronológico con filtros y reportes públicos de solo lectura para clientes.

**Stack:** React 19 + Vite 8 · Tailwind CSS 4 · Lucide · Supabase (Postgres, Storage, Auth) · vite-plugin-pwa · Netlify.

## Acceso: sin login

La app no tiene cuentas: cualquiera que tenga la URL puede **ver y agregar** obras, avances, fotos y enlaces de reporte. **Nadie puede editar ni borrar** desde la app (ni registros ni fotos), así lo cargado no se puede vandalizar; las correcciones se hacen desde el panel de Supabase. Quien registra escribe su nombre una vez y queda recordado en el teléfono.

> ⚠️ Compartí la URL de la app sólo con el equipo. Al cliente mandale el enlace del reporte (`/r/…`), no la URL principal: desde la principal se ve toda la bitácora, notas internas incluidas.

## Puesta en marcha

1. **Supabase**: en el SQL Editor, ejecutá `supabase/migrations/20261117000000_bitacora_avance_obra.sql`
   (o `supabase db push`). Crea tipos, tablas, RLS, RPCs y el bucket `fotos-avance`.
   *Si ya habías corrido la versión anterior (con login)*, usá un proyecto Supabase nuevo o borrá antes las tablas, tipos y las políticas `fotos_storage_*` de `storage.objects`.
2. **Local**: `cp .env.example .env`, completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, después `npm install && npm run dev`.
3. **Netlify**: conectá el repo, definí las mismas dos variables en *Site settings → Environment variables*. `netlify.toml` ya configura build, SPA redirects y caché del service worker.

## Estructura

```
├── index.html
├── netlify.toml                 # build, redirects SPA, headers de caché
├── vite.config.js               # React + Tailwind + PWA (cache-first de fotos)
├── public/                      # íconos del PWA
├── supabase/migrations/         # esquema SQL completo + RLS + RPCs + Storage
└── src/
    ├── main.jsx                 # entrada; pantalla de aviso si faltan variables de entorno
    ├── App.jsx                  # rutas: / · /nuevo · /reportes · /obras · /r/:token (reporte cliente)
    ├── index.css                # Tailwind 4, alto contraste, estilos de impresión
    ├── lib/
    │   ├── supabase.js          # cliente, URL de fotos, mensajes de error legibles
    │   ├── constantes.js        # etapas y estados (espejo de los enums SQL)
    │   ├── fechas.js            # formato es-AR, agrupado por día
    │   ├── imagenes.js          # compresión en el cliente: 1920px + miniatura 480px
    │   └── subida.js            # subida XHR con progreso real, reintentos y espera de señal
    ├── hooks/
    │   ├── useAutor.js          # nombre de quien registra (recordado en el teléfono)
    │   ├── useProyectos.js      # obras + obra activa recordada
    │   ├── useFeedAvances.js    # feed paginado con filtros
    │   ├── useSubirAvance.js    # comprimir → subir → RPC crear_avance (idempotente)
    │   └── useReportes.js       # enlaces públicos: crear / listar / revocar
    ├── components/
    │   ├── layout/              # AppShell (nav inferior + botón "+")
    │   └── ui/                  # Boton, Skeleton, BarraProgreso, Aviso, BadgeEstado, SelectorObra
    └── features/
        ├── avances/             # FormularioAvance, SelectorFotos, FeedAvances, FiltrosFeed,
        │                        # TarjetaAvance, GaleriaAvance, Lightbox
        ├── reportes/            # GeneradorReporte, ReportePublico (imprimible a PDF)
        └── proyectos/Proyectos.jsx
```

## Decisiones de diseño

- **Subida resistente a 4G débil.** Cada foto se comprime en el teléfono (≈0,4 MB + miniatura ≈60 KB), se sube de a una por XHR (barra de progreso real) con 5 intentos y backoff, y si se corta la señal espera al evento `online`. El UUID del avance se genera en el cliente: un reintento no vuelve a subir lo que ya subió ni duplica registros (`crear_avance` es idempotente y transaccional).
- **Alta sólo por RPC.** `avances` y `fotos_avance` no aceptan INSERT directo: `crear_avance` valida obra activa, nombre, rutas dentro de la carpeta del avance, que las fotos existan en Storage y un máximo de 12 fotos.
- **Sin sobrescribir.** Storage sólo acepta archivos nuevos dentro de la carpeta de una obra existente; no hay políticas de update/delete. Un "ya existe" (409) en un reintento se toma como subida exitosa.
- **Reportes al cliente.** `obtener_reporte_publico` quita en el servidor las notas internas y los estados problemáticos salvo que el reporte los incluya. Los enlaces pueden vencer o revocarse, y no se pueden reactivar.
- **Bucket de lectura pública** con rutas `obra/avance/foto` en UUIDs: los reportes y el caché offline del PWA funcionan sin firmar URLs.
- **PDF.** El reporte público tiene estilos `@media print` (A4, sin cortes dentro de un registro): "Imprimir / Guardar PDF" usa el diálogo nativo, sin librerías pesadas.

## Pendientes sugeridos

- Cola offline persistente (IndexedDB + Background Sync) para cargar sin señal y enviar más tarde.
- Limpieza programada de fotos huérfanas (subidas cuyo avance nunca se confirmó).
- Si más adelante hace falta restringir el acceso: código de acceso por obra, o volver a Supabase Auth.
- Protección contra abuso (captcha o límite de carga) si la URL se difunde fuera del equipo.
