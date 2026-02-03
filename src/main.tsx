import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ShelfPage } from './components/shelf-page'
import { LoginForm } from './components/sign-in.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/shelf" element={<ShelfPage />} />
        <Route path="/sign-in" element={<LoginForm />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
