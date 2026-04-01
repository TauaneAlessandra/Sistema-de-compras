// ============================================================
// Layout.tsx — Estrutura visual principal (sidebar + conteúdo)
//
// Este componente envolve todas as páginas autenticadas.
// Responsabilidades:
// - Sidebar com navegação (desktop)
// - Menu hambúrguer em mobile
// - Informações do usuário logado
// - Botão de logout
// ============================================================

import { useState, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../types'
import {
  LayoutDashboard, ShoppingCart, Users, LogOut, Menu, X,
  ClipboardList, CheckSquare, BadgeDollarSign,
} from 'lucide-react'

// Mapeamento de perfil para nome legível em português
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  requester: 'Solicitante',
  buyer: 'Comprador',
  supervisor: 'Supervisor',
  financial: 'Financeiro',
}

// Cores de badge para cada perfil — usadas no rodapé da sidebar
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  requester: 'bg-blue-100 text-blue-700',
  buyer: 'bg-yellow-100 text-yellow-700',
  supervisor: 'bg-green-100 text-green-700',
  financial: 'bg-red-100 text-red-700',
}

// Tipo para os itens do menu lateral
interface NavItem {
  to: string       // URL da rota
  label: string    // Texto exibido
  icon: ReactNode  // Ícone da biblioteca lucide-react
  roles: UserRole[] // Quais perfis veem esse item
}

// Lista de itens da navegação — cada um tem as roles que podem vê-lo.
// Na renderização, filtramos apenas os itens do perfil do usuário logado.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'requester', 'buyer', 'supervisor', 'financial'] },
  { to: '/solicitacoes', label: 'Solicitações', icon: <ClipboardList size={18} />, roles: ['admin', 'requester', 'buyer', 'supervisor', 'financial'] },
  { to: '/nova-solicitacao', label: 'Nova Solicitação', icon: <ShoppingCart size={18} />, roles: ['admin', 'requester'] },
  { to: '/aprovacao-supervisor', label: 'Aprovação Supervisor', icon: <CheckSquare size={18} />, roles: ['admin', 'supervisor'] },
  { to: '/aprovacao-financeiro', label: 'Aprovação Financeiro', icon: <BadgeDollarSign size={18} />, roles: ['admin', 'financial'] },
  { to: '/usuarios', label: 'Usuários', icon: <Users size={18} />, roles: ['admin'] },
]

interface SidebarContentProps {
  visibleItems: NavItem[]
  user: { name: string; role: UserRole } | null
  currentPath: string
  onNavClick: () => void
  onLogout: () => void
}

// Renderizado tanto na sidebar desktop quanto no overlay mobile.
// Declarado fora de Layout para evitar recriação durante o render.
function SidebarContent({ visibleItems, user, currentPath, onNavClick, onLogout }: SidebarContentProps) {
  return (
    <nav className="flex flex-col h-full">
      {/* Logo e nome do sistema */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <ShoppingCart size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">SisCompras</p>
          <p className="text-xs text-slate-500">Sistema de Compras</p>
        </div>
      </div>

      {/* Lista de itens do menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            // Verifica se esta rota é a rota atual para aplicar estilo "ativo"
            const active = currentPath === item.to
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavClick} // fecha o menu ao clicar em mobile
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'   // item ativo: azul
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Rodapé: info do usuário + botão sair */}
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar com a inicial do nome */}
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            {user && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </nav>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()   // Hook para saber a URL atual
  const navigate = useNavigate()   // Hook para navegar programaticamente
  const [sidebarOpen, setSidebarOpen] = useState(false) // controla menu mobile

  // Ao fazer logout, limpa a sessão e vai para o login
  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Filtra somente os itens que o perfil do usuário pode ver
  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role))

  return (
    // Layout de duas colunas: sidebar fixa + conteúdo scrollável
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* Sidebar Desktop — visível apenas em telas médias e maiores (md:flex) */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <SidebarContent
          visibleItems={visibleItems}
          user={user}
          currentPath={location.pathname}
          onNavClick={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar Mobile — um overlay que cobre a tela quando aberta */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Fundo escurecido — clicar nele fecha o menu */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
            <div className="absolute right-3 top-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <SidebarContent
              visibleItems={visibleItems}
              user={user}
              currentPath={location.pathname}
              onNavClick={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Área principal: header mobile + conteúdo da página */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile — só aparece em telas pequenas (md:hidden) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <ShoppingCart size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">SisCompras</span>
          </div>
        </header>

        {/* Conteúdo da página — o "children" passado pelo ProtectedRoute */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
