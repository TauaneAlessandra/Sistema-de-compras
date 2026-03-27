// ============================================================
// main.tsx — Ponto de entrada da aplicação React
//
// Este é o primeiro arquivo executado pelo Vite.
// Ele "monta" o React dentro do elemento HTML com id="root"
// que existe no arquivo index.html.
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // Importa o Tailwind CSS globalmente
import App from './App'

// createRoot: API moderna do React 18 para renderizar a aplicação.
// document.getElementById('root')! — o "!" diz ao TypeScript que temos
// certeza que esse elemento existe (non-null assertion).
createRoot(document.getElementById('root')!).render(
  // StrictMode ativa verificações extras em desenvolvimento:
  // - detecta efeitos colaterais inesperados
  // - avisa sobre APIs depreciadas
  // Em produção, o StrictMode não tem efeito no comportamento.
  <StrictMode>
    <App />
  </StrictMode>,
)
