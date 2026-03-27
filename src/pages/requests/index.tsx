// ============================================================
// pages/requests/index.tsx — Lista de solicitações
//
// Exibe todas as solicitações com:
// - Filtro por texto (título ou nome do solicitante)
// - Filtro por status (dropdown)
// - Cada item é um link para a página de detalhe
//
// Solicitantes veem apenas suas próprias solicitações.
// Outros perfis veem todas.
// ============================================================

import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { RequestStatus, UrgencyLevel } from '../../types'
import {
  ClipboardList, Search, Clock, CheckCircle2, XCircle,
  FileSearch, BadgeDollarSign, ChevronRight, Plus,
} from 'lucide-react'

// Mapeamento de status para exibição (label, cor de badge, ícone)
interface StatusInfo { label: string; color: string; icon: ReactNode }
interface UrgencyInfo { label: string; color: string }

const STATUS_MAP: Record<RequestStatus, StatusInfo> = {
  pending_quotation: { label: 'Aguard. Cotação', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
  pending_supervisor: { label: 'Aguard. Supervisor', color: 'bg-blue-100 text-blue-700', icon: <FileSearch size={12} /> },
  pending_financial: { label: 'Aguard. Financeiro', color: 'bg-purple-100 text-purple-700', icon: <BadgeDollarSign size={12} /> },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
}

const URGENCY: Record<UrgencyLevel, UrgencyInfo> = {
  low: { label: 'Baixa', color: 'text-green-600' },
  medium: { label: 'Média', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-red-600' },
}

export default function Requests() {
  const { user } = useAuth()
  const { requests, loadRequests } = useData()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all')

  useEffect(() => { loadRequests() }, [])

  // Filtra as solicitações visíveis conforme o perfil do usuário
  let visible = user.role === 'requester'
    ? requests.filter((r) => r.requesterId === user.id)  // solicitante: só as suas
    : requests                                             // outros: todas

  // Filtro de busca por texto — toLowerCase para busca case-insensitive
  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter((r) =>
      r.title.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q)
    )
  }

  // Filtro por status — só aplica se não for 'all'
  if (filterStatus !== 'all') {
    visible = visible.filter((r) => r.status === filterStatus)
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho com contador */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitações</h1>
          <p className="text-slate-500 text-sm mt-0.5">{visible.length} solicitação(ões)</p>
        </div>
        {/* Botão "Nova" só aparece para quem pode criar solicitações */}
        {(user.role === 'requester' || user.role === 'admin') && (
          <Link
            to="/nova-solicitacao"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />Nova
          </Link>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        {/* Campo de busca com ícone de lupa posicionado absolutamente */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por item ou solicitante..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Dropdown de filtro por status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as RequestStatus | 'all')}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos os status</option>
          <option value="pending_quotation">Aguard. Cotação</option>
          <option value="pending_supervisor">Aguard. Supervisor</option>
          <option value="pending_financial">Aguard. Financeiro</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Reprovado</option>
        </select>
      </div>

      {/* Lista de solicitações */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((req) => {
              const st = STATUS_MAP[req.status]
              const urg = URGENCY[req.urgency]
              return (
                // Cada item é um Link — toda a linha é clicável
                <Link
                  key={req.id}
                  to={`/solicitacoes/${req.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{req.title}</p>
                      <span className={`text-xs font-medium ${urg.color}`}>• {urg.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {req.requesterName} • {req.quantity} {req.unit} • {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{req.quotations?.length || 0}/3 cotações</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Badge de status — hidden em mobile */}
                    <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                      {st.icon}{st.label}
                    </span>
                    {/* Ícone de seta — muda de cor ao hover */}
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
