import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthCallback } from '@/pages/AuthCallback'
import { PublicShelf } from '@/pages/PublicShelf'
import App from './App.tsx'
import { ShelfPage } from './components/shelf-page'
import { LoginForm } from './components/sign-in.tsx'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Specific routes first */}
          <Route path="/sign-in" element={<LoginForm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/shelf" element={<ProtectedRoute><ShelfPage /></ProtectedRoute>} />
          
          {/* Catch-all public username route - must be last */}
          <Route path="/:username" element={<PublicShelf />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

