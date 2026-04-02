import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSeo } from '@/hooks/useSeo'

export function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useSeo({
    title: 'Completing Sign In - PlotTwist',
    description: 'Completing authentication for PlotTwist.',
    path: '/auth/callback',
    noIndex: true,
  })

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
        </div>
        <h1 className="text-2xl font-semibold">Completing sign in...</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please wait while we set up your account</p>
      </div>
    </div>
  )
}
