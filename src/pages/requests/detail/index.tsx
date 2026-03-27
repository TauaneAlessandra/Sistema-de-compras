// ============================================================
// pages/requests/detail/index.tsx — Detalhe da solicitação
//
// Exibe todos os dados de uma solicitação: informações gerais,
// cotações, aprovação do supervisor e aprovação financeira.
//
// O comprador pode adicionar/remover cotações aqui.
// O ID da solicitação vem da URL via useParams().
// ============================================================

import { useEffect, useState, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { RequestStatus, UrgencyLevel, Quotation } from '../../../types'
import {
  ArrowLeft, Plus, Trash2, Clock, CheckCircle2, XCircle,
  FileSearch, BadgeDollarSign, DollarSign, Truck,
  MessageSquare, User, Calendar,
} from 'lucide-react'
import QuotationForm from './QuotationForm'

interface StatusInfo { label: string; color: string; icon: ReactNode }
interface UrgencyInfo { label: string; color: string }

// Mapeamento de status para exibição com badge colorido
const STATUS_MAP: Record<RequestStatus, StatusInfo> = {
  pending_quotation: { label: 'Aguardando Cotação', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock size={14} /> },
  pending_supervisor: { label: 'Aguardando Supervisor', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FileSearch size={14} /> },
  pending_financial: { label: 'Aguardando Financeiro', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <BadgeDollarSign size={14} /> },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={14} /> },
}

const URGENCY: Record<UrgencyLevel, UrgencyInfo> = {
  low: { label: 'Baixa', color: 'text-green-600 bg-green-50 border border-green-200' },
  medium: { label: 'Média', color: 'text-yellow-600 bg-yellow-50 border border-yellow-200' },
  high: { label: 'Alta', color: 'text-red-600 bg-red-50 border border-red-200' },
}

export default function RequestDetail() {
  // useParams extrai o :id da URL — ex: /solicitacoes/abc-123 → id = "abc-123"
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getRequestById, addQuotation, removeQuotation, loadRequests } = useData()

  // Estado local da solicitação — recarregado a cada ação
  const [request, setRequest] = useState(getRequestById(id!))
  // Controla a visibilidade do formulário de nova cotação
  const [showQuotationForm, setShowQuotationForm] = useState(false)

  // Recarrega do localStorage para garantir dados frescos
  function refresh() {
    loadRequests()
    setRequest(getRequestById(id!))
  }

  // Recarrega quando o ID na URL muda (navegação entre solicitações)
  useEffect(() => { refresh() }, [id])

  // Solicitação não encontrada — exibe mensagem
  if (!request) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Solicitação não encontrada.</p>
      </div>
    )
  }

  const st = STATUS_MAP[request.status]
  const urg = URGENCY[request.urgency]

  // O comprador pode adicionar cotações apenas quando o status é pending_quotation
  const canAddQuotation =
    (user?.role === 'buyer' || user?.role === 'admin') && request.status === 'pending_quotation'

  // Recebe dados do QuotationForm e chama o contexto para salvar
  function handleAddQuotation(data: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>) {
    addQuotation(request!.id, data, user!)
    setShowQuotationForm(false)
    refresh()
  }

  function handleRemoveQuotation(qid: string) {
    if (confirm('Remover esta cotação?')) {
      removeQuotation(request!.id, qid)
      refresh()
    }
  }

  // Recupera a cotação que o supervisor selecionou (para destacá-la)
  const selectedQuotation = request.supervisorApproval?.selectedQuotationId
    ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho com botão voltar, título, badge de urgência e badge de status */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{request.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${urg.color}`}>{urg.label}</span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Solicitado por <span className="font-medium text-slate-600">{request.requesterName}</span> em{' '}
            {new Date(request.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${st.color}`}>
          {st.icon} {st.label}
        </span>
      </div>

      {/* Card de informações gerais */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Detalhes da Solicitação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Quantidade</p>
            <p className="font-semibold text-slate-800">{request.quantity} {request.unit}</p>
          </div>
          {/* col-span-3 faz o campo ocupar toda a largura do grid */}
          {request.description && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-slate-400 text-xs mb-0.5">Descrição</p>
              <p className="text-slate-700">{request.description}</p>
            </div>
          )}
          {request.justification && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-slate-400 text-xs mb-0.5">Justificativa</p>
              <p className="text-slate-700">{request.justification}</p>
            </div>
          )}
        </div>

        {/* Imagem do item — só renderiza se imageUrl existir */}
        {request.imageUrl && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-2">Imagem do item</p>
            <img
              src={request.imageUrl}
              alt="Imagem do item"
              className="rounded-lg border border-slate-200 max-h-64 object-cover w-full"
            />
          </div>
        )}
      </div>

      {/* Card de cotações */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Cotações ({request.quotations?.length || 0}/3)
          </h2>
          {/* Botão de adicionar aparece apenas para comprador/admin com espaço disponível */}
          {canAddQuotation && (request.quotations?.length || 0) < 3 && (
            <button
              onClick={() => setShowQuotationForm(!showQuotationForm)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />Adicionar
            </button>
          )}
        </div>

        {(request.quotations?.length || 0) === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">Nenhuma cotação registrada</p>
        )}

        <div className="space-y-3">
          {request.quotations?.map((q, i) => (
            // Destaque especial na cotação selecionada pelo supervisor
            <div
              key={q.id}
              className={`border rounded-xl p-4 ${selectedQuotation?.id === q.id ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">#{i + 1}</span>
                    <p className="text-sm font-semibold text-slate-800">{q.supplier}</p>
                    {/* Badge "Selecionada" na cotação escolhida pelo supervisor */}
                    {selectedQuotation?.id === q.id && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Selecionada</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-green-700 font-semibold">
                      {/* toLocaleString formata o número com separadores brasileiros */}
                      <DollarSign size={14} />R$ {q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Truck size={14} />{q.deliveryDays} dias
                    </span>
                  </div>
                  {q.observations && <p className="text-xs text-slate-500 mt-1">Obs: {q.observations}</p>}
                  <p className="text-xs text-slate-400 mt-1">Registrado por {q.buyerName}</p>
                </div>
                {/* Botão de remover só aparece para quem pode adicionar */}
                {canAddQuotation && (
                  <button onClick={() => handleRemoveQuotation(q.id)} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulário inline de nova cotação */}
        {showQuotationForm && (
          <QuotationForm onSubmit={handleAddQuotation} onCancel={() => setShowQuotationForm(false)} />
        )}

        {/* Aviso quando as 3 cotações estão prontas */}
        {(request.quotations?.length || 0) >= 3 && request.status === 'pending_supervisor' && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
            3 cotações registradas. Aguardando aprovação do supervisor.
          </div>
        )}
      </div>

      {/* Card de aprovação do supervisor — só aparece se já houve aprovação */}
      {request.supervisorApproval && (
        <div className={`bg-white rounded-xl border p-5 ${request.supervisorApproval.approved ? 'border-green-200' : 'border-red-200'}`}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileSearch size={16} />Aprovação do Supervisor
          </h2>
          <div className="space-y-2 text-sm">
            <span className={`flex items-center gap-1 font-semibold w-fit ${request.supervisorApproval.approved ? 'text-green-600' : 'text-red-600'}`}>
              {request.supervisorApproval.approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {request.supervisorApproval.approved ? 'Aprovado' : 'Reprovado'}
            </span>
            {selectedQuotation && (
              <p className="text-slate-600">
                <span className="text-slate-400">Fornecedor selecionado: </span>
                <span className="font-medium">{selectedQuotation.supplier}</span>
                <span className="text-green-600 font-semibold ml-2">
                  R$ {selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            )}
            {request.supervisorApproval.observation && (
              <div className="bg-slate-50 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MessageSquare size={12} /> Observação:</p>
                <p className="text-slate-700">{request.supervisorApproval.observation}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <User size={12} /> {request.supervisorApproval.supervisorName} •{' '}
              <Calendar size={12} /> {new Date(request.supervisorApproval.approvedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      {/* Card de aprovação financeira — só aparece se já houve aprovação */}
      {request.financialApproval && (
        <div className={`bg-white rounded-xl border p-5 ${request.financialApproval.approved ? 'border-green-200' : 'border-red-200'}`}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <BadgeDollarSign size={16} />Aprovação Financeira
          </h2>
          <div className="space-y-2 text-sm">
            <span className={`flex items-center gap-1 font-semibold w-fit ${request.financialApproval.approved ? 'text-green-600' : 'text-red-600'}`}>
              {request.financialApproval.approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {request.financialApproval.approved ? 'Aprovado' : 'Reprovado'}
            </span>
            {request.financialApproval.purchaseDate && (
              <p className="text-slate-600">
                <span className="text-slate-400">Data prevista para compra: </span>
                <span className="font-semibold text-purple-700">
                  {/* 'T12:00:00' evita problema de fuso horário ao parsear "YYYY-MM-DD" */}
                  {new Date(request.financialApproval.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </p>
            )}
            {request.financialApproval.observation && (
              <div className="bg-slate-50 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MessageSquare size={12} /> Observação:</p>
                <p className="text-slate-700">{request.financialApproval.observation}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <User size={12} /> {request.financialApproval.financialName} •{' '}
              <Calendar size={12} /> {new Date(request.financialApproval.approvedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
