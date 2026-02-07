import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

