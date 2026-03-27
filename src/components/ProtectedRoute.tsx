// ============================================================
// ProtectedRoute.tsx — Guarda de rota com controle de acesso
//
// Envolve rotas que exigem autenticação.
// Funciona como um "porteiro":
// 1. Se não está logado → redireciona para /login
// 2. Se está logado mas sem o perfil correto → redireciona para /dashboard
// 3. Se passou nas verificações → renderiza a página com o Layout
// ============================================================

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../types'
import Layout from './Layout'

interface Props {
  children: ReactNode   // A página que será renderizada se autorizada
  roles?: UserRole[]    // Lista de perfis permitidos (opcional — sem lista = todos logados passam)
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user } = useAuth()

  // Verificação 1: usuário não está logado
  // <Navigate> faz redirecionamento declarativo (sem useNavigate)
  // "replace" substitui a entrada no histórico (o botão Voltar não vai para cá)
  if (!user) return <Navigate to="/login" replace />

  // Verificação 2: a rota exige perfil específico e o usuário não tem
  // roles.includes(user.role) verifica se o perfil do usuário está na lista permitida
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />

  // Passou em tudo: renderiza a página dentro do Layout (sidebar + header)
  return <Layout>{children}</Layout>
}
