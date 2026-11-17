import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = useCallback(async (usuarioId) => {
    if (!usuarioId) {
      setPerfil(null)
      return
    }
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, email, nombre, rol')
      .eq('id', usuarioId)
      .single()
    if (!error) setPerfil(data)
  }, [])

  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return
      setSesion(data.session)
      await cargarPerfil(data.session?.user.id)
      if (activo) setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      // Diferido: no llamar a supabase dentro del callback (evita deadlocks del cliente).
      setTimeout(() => cargarPerfil(nuevaSesion?.user.id), 0)
    })
    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const valor = useMemo(
    () => ({
      sesion,
      usuario: sesion?.user ?? null,
      perfil,
      cargando,
      iniciarSesion: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      registrarse: (email, password, nombre) =>
        supabase.auth.signUp({ email, password, options: { data: { nombre } } }),
      cerrarSesion: () => supabase.auth.signOut(),
    }),
    [sesion, perfil, cargando],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
