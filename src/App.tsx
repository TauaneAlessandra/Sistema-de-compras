// ============================================================
// App.tsx — Configuração de rotas e providers globais
//
// Este componente é o "esqueleto" da aplicação. Ele define:
// 1. Os Providers de contexto (estado global)
// 2. As rotas (quais URLs renderizam quais páginas)
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'

// Importando todas as páginas da aplicação
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import Requests from './pages/requests'
import RequestDetail from './pages/requests/detail'
import NewRequest from './pages/requests/new'
import ApprovalSupervisor from './pages/approvals/supervisor'
import ApprovalFinancial from './pages/approvals/financial'
import Users from './pages/users'

export default function App() {
  return (
    // AuthProvider e DataProvider são "contextos" — eles fornecem
    // dados e funções para todos os componentes filhos sem precisar
    // passar props manualmente de pai pra filho (prop drilling).
    <AuthProvider>
      <DataProvider>
        {/* BrowserRouter habilita o sistema de rotas baseado na URL do navegador */}
        <BrowserRouter>
          <Routes>
            {/* Rota pública — acessível sem login */}
            <Route path="/login" element={<Login />} />

            {/* Redireciona "/" para "/dashboard" automaticamente */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Rotas protegidas — ProtectedRoute verifica se o usuário está logado.
                Se não estiver, redireciona para /login. */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/solicitacoes" element={<ProtectedRoute><Requests /></ProtectedRoute>} />

            {/* :id é um parâmetro dinâmico — ex: /solicitacoes/abc-123
                Acessado com useParams() dentro do componente */}
            <Route path="/solicitacoes/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />

            {/* roles={[...]} restringe o acesso por perfil.
                Quem não tiver o perfil correto é redirecionado para /dashboard */}
            <Route path="/nova-solicitacao" element={<ProtectedRoute roles={['admin', 'requester']}><NewRequest /></ProtectedRoute>} />
            <Route path="/aprovacao-supervisor" element={<ProtectedRoute roles={['admin', 'supervisor']}><ApprovalSupervisor /></ProtectedRoute>} />
            <Route path="/aprovacao-financeiro" element={<ProtectedRoute roles={['admin', 'financial']}><ApprovalFinancial /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />

            {/* Rota curinga — qualquer URL não mapeada redireciona para o dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}
