// ============================================================
// pages/dashboard/index.tsx — Página principal do sistema
//
// Exibe um resumo de todas as solicitações com:
// - Cards clicáveis de estatísticas (filtram a lista abaixo)
// - Gráfico de barras por período
// - Alertas de ações pendentes para supervisor/financeiro
// - Lista filtrada de solicitações
// ============================================================

import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { RequestStatus } from '../../types'
import {
  ClipboardList, Clock, CheckCircle2, XCircle,
  ShoppingCart, FileSearch, BadgeDollarSign, AlertCircle,
} from 'lucide-react'
import StatCard from './StatCard'
import RequestsChart from './RequestsChart'

// Tipo para exibição de status com badge colorido
interface StatusInfo {
  label: string
  color: string
  icon: ReactNode
}

const STATUS_MAP: Record<RequestStatus, StatusInfo> = {
  draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-500', icon: <ClipboardList size={14} /> },
  pending_area_approval: { label: 'Aguard. Área', color: 'bg-orange-100 text-orange-700', icon: <Clock size={14} /> },
  pending_quotation: { label: 'Aguard. Cotação', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> },
  pending_supervisor: { label: 'Aguard. Supervisor', color: 'bg-blue-100 text-blue-700', icon: <FileSearch size={14} /> },
  pending_financial: { label: 'Aguard. Financeiro', color: 'bg-purple-100 text-purple-700', icon: <BadgeDollarSign size={14} /> },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
  fulfilled_by_stock: { label: 'Em Estoque', color: 'bg-teal-100 text-teal-700', icon: <CheckCircle2 size={14} /> },
}

// FilterKey é 'all' (sem filtro) ou um dos status de RequestStatus
type FilterKey = 'all' | RequestStatus

// Configuração de cada card de estatística
interface StatConfig {
  key: FilterKey
  title: string
  value: (s: ReturnType<typeof buildStats>) => number
  icon: ReactNode
  color: string
}

// Calcula as contagens de cada status a partir de uma lista de solicitações.
// Recebe any[] com tipagem inline para evitar dependência circular de tipo.
function buildStats(requests: ReturnType<typeof Array.prototype.filter>) {
  return {
    total: requests.length,
    pending: requests.filter((r: { status: RequestStatus }) => r.status === 'pending_quotation').length,
    awaitingSupervisor: requests.filter((r: { status: RequestStatus }) => r.status === 'pending_supervisor').length,
    awaitingFinancial: requests.filter((r: { status: RequestStatus }) => r.status === 'pending_financial').length,
    approved: requests.filter((r: { status: RequestStatus }) => r.status === 'approved').length,
    rejected: requests.filter((r: { status: RequestStatus }) => r.status === 'rejected').length,
  }
}

// Labels do título da lista conforme o filtro ativo
const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'Todas as Solicitações',
  draft: 'Rascunhos',
  pending_area_approval: 'Aguardando Área',
  pending_quotation: 'Aguardando Cotação',
  pending_supervisor: 'Aguardando Supervisor',
  pending_financial: 'Aguardando Financeiro',
  approved: 'Aprovadas',
  rejected: 'Reprovadas',
  fulfilled_by_stock: 'Atendidas por Estoque',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { requests, loadRequests } = useData()

  // Filtro ativo — 'all' significa sem filtro
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  useEffect(() => { loadRequests() }, [])

  // Solicitante vê apenas as suas; outros perfis veem todas
  const myRequests = user?.role === 'requester'
    ? requests.filter((r) => r.requesterId === user.id)
    : requests

  const stats = buildStats(myRequests)

  // Configuração dos 5 cards do dashboard — cada um filtra por um status
  const statCards: StatConfig[] = [
    {
      key: 'all',
      title: 'Total',
      value: (s) => s.total,
      icon: <ClipboardList size={22} className="text-slate-600" />,
      color: 'bg-slate-100',
    },
    {
      key: 'pending_quotation',
      title: 'Aguard. Cotação',
      value: (s) => s.pending,
      icon: <Clock size={22} className="text-yellow-600" />,
      color: 'bg-yellow-100',
    },
    {
      key: 'pending_supervisor',
      title: 'Aguard. Supervisor',
      value: (s) => s.awaitingSupervisor,
      icon: <FileSearch size={22} className="text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      key: 'approved',
      title: 'Aprovados',
      value: (s) => s.approved,
      icon: <CheckCircle2 size={22} className="text-green-600" />,
      color: 'bg-green-100',
    },
    {
      key: 'rejected',
      title: 'Reprovados',
      value: (s) => s.rejected,
      icon: <XCircle size={22} className="text-red-600" />,
      color: 'bg-red-100',
    },
  ]

  // Aplica o filtro selecionado à lista de solicitações
  const filteredRequests = activeFilter === 'all'
    ? myRequests
    : myRequests.filter((r) => r.status === activeFilter)

  // Alterna o filtro: clicar no mesmo card ativo reseta para 'all'
  function handleCardClick(key: FilterKey) {
    setActiveFilter((prev) => (prev === key ? 'all' : key))
  }

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bem-vindo, <span className="font-medium text-blue-600">{user?.name}</span>
        </p>
      </div>

      {/* Cards de estatísticas — clicáveis para filtrar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value(stats)}
            icon={card.icon}
            color={card.color}
            selected={activeFilter === card.key}  // destaca o card ativo
            onClick={() => handleCardClick(card.key)}
          />
        ))}
      </div>

      {/* Gráfico de barras — recebe todas as solicitações (sem filtro) */}
      <RequestsChart requests={myRequests} />

      {/* Banner de ação rápida — só para quem pode criar solicitações */}
      {(user?.role === 'requester' || user?.role === 'admin') && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-white">
            <p className="font-semibold text-lg">Precisa comprar algo?</p>
            <p className="text-blue-200 text-sm">Crie uma nova solicitação de compra</p>
          </div>
          <Link
            to="/nova-solicitacao"
            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            <ShoppingCart size={16} />
            Nova Solicitação
          </Link>
        </div>
      )}

      {/* Alerta para o supervisor quando há solicitações aguardando */}
      {(user?.role === 'supervisor' || user?.role === 'admin') && stats.awaitingSupervisor > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800 flex-1">
            {stats.awaitingSupervisor} solicitação(ões) aguardando sua aprovação
          </p>
          <Link to="/aprovacao-supervisor" className="text-sm font-medium text-amber-700 hover:underline whitespace-nowrap">
            Ver agora
          </Link>
        </div>
      )}

      {/* Alerta para o financeiro quando há solicitações aguardando */}
      {(user?.role === 'financial' || user?.role === 'admin') && stats.awaitingFinancial > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-purple-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-purple-800 flex-1">
            {stats.awaitingFinancial} solicitação(ões) aguardando aprovação financeira
          </p>
          <Link to="/aprovacao-financeiro" className="text-sm font-medium text-purple-700 hover:underline whitespace-nowrap">
            Ver agora
          </Link>
        </div>
      )}

      {/* Lista de solicitações filtrada pelo card selecionado */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            {/* Título muda conforme o filtro ativo */}
            <h2 className="font-semibold text-slate-800">{FILTER_LABELS[activeFilter]}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredRequests.length} solicitação(ões)
              {/* Link "Limpar filtro" aparece apenas quando um filtro está ativo */}
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="ml-2 text-blue-500 hover:underline"
                >
                  Limpar filtro
                </button>
              )}
            </p>
          </div>
          <Link to="/solicitacoes" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Limita a 10 itens — se houver mais, mostra link "Ver mais" */}
            {filteredRequests.slice(0, 10).map((req) => {
              const st = STATUS_MAP[req.status]
              return (
                <Link
                  key={req.id}
                  to={`/solicitacoes/${req.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{req.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {req.requesterName} • {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                    {st.icon}{st.label}
                  </span>
                </Link>
              )
            })}
            {/* Rodapé com link se houver mais de 10 itens */}
            {filteredRequests.length > 10 && (
              <div className="px-5 py-3 text-center">
                <Link to="/solicitacoes" className="text-sm text-blue-600 hover:underline">
                  Ver mais {filteredRequests.length - 10} solicitações →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
