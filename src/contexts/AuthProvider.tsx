import React, { useEffect, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthContext } from './AuthContext'

function normalizeUsername(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (cleaned.length === 0) return 'reader'
  return cleaned.slice(0, 30)
}

function getPreferredEmail(user: User): string | undefined {
  const metaEmail = user.user_metadata?.email
  if (typeof metaEmail === 'string' && metaEmail.includes('@')) return metaEmail
  if (user.email && user.email.includes('@')) return user.email

  const identities = (user as User & {
    identities?: Array<{ identity_data?: { email?: string } }>
  }).identities
  const identityEmail = identities?.[0]?.identity_data?.email
  if (typeof identityEmail === 'string' && identityEmail.includes('@')) return identityEmail

  return undefined
}

function buildInitialUsername(user: User) {
  const preferredEmail = getPreferredEmail(user)
  const fromEmail = preferredEmail ? preferredEmail.split('@')[0] : ''
  const base = normalizeUsername(fromEmail || 'reader')
  if (base.length >= 3) return base
  return `reader_${user.id.slice(0, 6)}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ensureProfileForUser = async (authUser: User): Promise<string | null> => {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()

      if (fetchError) {
        setError('Failed to initialize profile')
        return null
      }

      if (data?.id) return null

      const baseUsername = buildInitialUsername(authUser)

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate =
          attempt === 0 ? baseUsername : `${baseUsername.slice(0, 26)}_${attempt}`

        const { error: insertError } = await supabase.from('profiles').insert({
          id: authUser.id,
          username: candidate,
        })

        if (!insertError) return candidate
        if (insertError.code !== '23505') {
          setError('Failed to create profile username')
          return null
        }
      }

      setError('Could not create a unique username')
      return null
    }

    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        if (session?.user) {
          const createdUsername = await ensureProfileForUser(session.user)
          if (createdUsername) {
            toast.success(`Username @${createdUsername} created`)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check session'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      setError(null)

      if (event === 'SIGNED_IN' && session?.user) {
        void ensureProfileForUser(session.user).then((createdUsername) => {
          if (createdUsername) {
            toast.success(`Username @${createdUsername} created`)
          }
        })
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      setError(message)
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
