// ============================================================
// pages/requests/detail/index.tsx — Detalhe da solicitação
//
// Exibe todos os dados de uma solicitação: informações gerais,
// cotações, aprovações e histórico completo de eventos.
// ============================================================

import { useEffect, useState, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { RequestStatus, UrgencyLevel, Quotation, AuditEventType } from '../../../types'
import {
  canAddQuotation as workflowCanAddQuotation,
  canRemoveQuotation as workflowCanRemoveQuotation,
} from '../../../domain/workflow'
import {
  ArrowLeft, Plus, Trash2, Clock, CheckCircle2, XCircle,
  FileSearch, BadgeDollarSign, DollarSign, Truck,
  MessageSquare, User, Calendar, Package, History,
  ShoppingCart, FileText,
} from 'lucide-react'
import type { UserRole } from '../../../types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  requester: 'Solicitante',
  area_manager: 'Resp. de Área',
  buyer: 'Compras',
  supervisor: 'Dir. Financeiro',
  financial: 'Financeiro',
}
import QuotationForm from './QuotationForm'

interface StatusInfo { label: string; color: string; icon: ReactNode }
interface UrgencyInfo { label: string; color: string }

const STATUS_MAP: Record<RequestStatus, StatusInfo> = {
  draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Clock size={14} /> },
  pending_area_approval: { label: 'Aguardando Área', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock size={14} /> },
  pending_quotation: { label: 'Aguardando Cotação', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock size={14} /> },
  pending_supervisor: { label: 'Aguardando Supervisor', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FileSearch size={14} /> },
  pending_financial: { label: 'Aguardando Financeiro', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <BadgeDollarSign size={14} /> },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={14} /> },
  fulfilled_by_stock: { label: 'Atendido por Estoque', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <CheckCircle2 size={14} /> },
}

const URGENCY: Record<UrgencyLevel, UrgencyInfo> = {
  low: { label: 'Baixa', color: 'text-green-600 bg-green-50 border border-green-200' },
  medium: { label: 'Média', color: 'text-yellow-600 bg-yellow-50 border border-yellow-200' },
  urgent: { label: 'Urgente', color: 'text-red-600 bg-red-50 border border-red-200' },
}

// Rótulos legíveis para cada tipo de evento de auditoria
const AUDIT_LABELS: Record<AuditEventType, string> = {
  created: 'Solicitação criada',
  submitted: 'Solicitação submetida',
  area_approved: 'Aprovado pela área',
  area_rejected: 'Reprovado pela área',
  quotation_added: 'Cotação adicionada',
  quotation_removed: 'Cotação removida',
  supervisor_approved: 'Aprovado pelo supervisor',
  supervisor_rejected: 'Reprovado pelo supervisor',
  financial_approved: 'Aprovado pelo financeiro',
  financial_rejected: 'Reprovado pelo financeiro',
  fulfilled_by_stock: 'Atendido por estoque',
  os_generated: 'Ordem de Serviço gerada',
}

// Ícone e cor por tipo de evento
function AuditIcon({ type }: { type: AuditEventType }) {
  const base = 'shrink-0'
  switch (type) {
    case 'created':            return <Plus size={14} className={`${base} text-slate-500`} />
    case 'submitted':          return <ShoppingCart size={14} className={`${base} text-blue-600`} />
    case 'quotation_added':    return <DollarSign size={14} className={`${base} text-blue-500`} />
    case 'quotation_removed':  return <Trash2 size={14} className={`${base} text-slate-400`} />
    case 'area_approved':
    case 'supervisor_approved':
    case 'financial_approved': return <CheckCircle2 size={14} className={`${base} text-green-600`} />
    case 'area_rejected':
    case 'supervisor_rejected':
    case 'financial_rejected': return <XCircle size={14} className={`${base} text-red-500`} />
    case 'fulfilled_by_stock': return <Package size={14} className={`${base} text-teal-600`} />
    case 'os_generated':       return <ShoppingCart size={14} className={`${base} text-blue-500`} />
  }
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getRequestById, submitRequest, addQuotation, removeQuotation, confirmStock, loadRequests } = useData()

  const [request, setRequest] = useState(getRequestById(id!))
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  // Controla o formulário inline de encerramento por estoque
  const [showStockForm, setShowStockForm] = useState(false)
  const [stockObservation, setStockObservation] = useState('')
  // Remoção de cotação: armazena o ID em remoção e a justificativa
  const [removingQuotationId, setRemovingQuotationId] = useState<string | null>(null)
  const [removalReason, setRemovalReason] = useState('')
  const [removalError, setRemovalError] = useState('')

  function refresh() {
    loadRequests()
    setRequest(getRequestById(id!))
  }

  useEffect(() => { refresh() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!request) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Solicitação não encontrada.</p>
      </div>
    )
  }

  // 7.1 — Apenas o dono ou perfis privilegiados podem visualizar
  const isPrivileged = user?.role !== 'requester'
  if (!isPrivileged && request.requesterId !== user?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Acesso não autorizado.</p>
      </div>
    )
  }

  const st = STATUS_MAP[request.status]
  const urg = URGENCY[request.urgency]

  const canAddQuotation =
    (user?.role === 'buyer' || user?.role === 'admin') && workflowCanAddQuotation(request.status)

  const canRemoveQuotation =
    (user?.role === 'buyer' || user?.role === 'admin') && workflowCanRemoveQuotation(request.status)

  // Comprador/admin pode atender por estoque quando ainda aguarda cotação
  const canConfirmStock =
    (user?.role === 'buyer' || user?.role === 'admin') && request.status === 'pending_quotation'

  // Apenas o criador da solicitação pode submeter um rascunho
  const canSubmit = request.status === 'draft' && request.requesterId === user?.id

  function handleAddQuotation(data: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>) {
    addQuotation(request!.id, data, user!)
    setShowQuotationForm(false)
    refresh()
  }

  function handleRemoveQuotation(qid: string) {
    setRemovingQuotationId(qid)
    setRemovalReason('')
    setRemovalError('')
  }

  function confirmRemoveQuotation() {
    if (!removalReason.trim()) { setRemovalError('Justificativa obrigatória.'); return }
    removeQuotation(request!.id, removingQuotationId!, user!, removalReason)
    setRemovingQuotationId(null)
    setRemovalReason('')
    setRemovalError('')
    refresh()
  }

  function handleSubmitRequest() {
    if (!confirm('Submeter esta solicitação para aprovação?')) return
    submitRequest(request!.id, user!)
    refresh()
  }

  function handleConfirmStock() {
    confirmStock(request!.id, stockObservation, user!)
    setShowStockForm(false)
    setStockObservation('')
    refresh()
  }

  const selectedQuotation = request.supervisorApproval?.selectedQuotationId
    ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
    : null

  // Histórico em ordem cronológica (mais antigo primeiro)
  const history = request.history ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho */}
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

      {/* Detalhes gerais */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Detalhes da Solicitação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Quantidade</p>
            <p className="font-semibold text-slate-800">{request.quantity} {request.unit}</p>
          </div>
          {request.deliveryLocation && (
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Local de entrega</p>
              <p className="font-medium text-slate-800">{request.deliveryLocation}</p>
            </div>
          )}
          {request.deliveryDeadline && (
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Prazo de entrega</p>
              <p className="font-medium text-slate-800">
                {new Date(request.deliveryDeadline + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {request.description && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-slate-400 text-xs mb-0.5">Observação</p>
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

      {/* ── Bloco de submissão — visível apenas em rascunho para o criador ── */}
      {canSubmit && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-800">Rascunho</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Esta solicitação ainda não foi submetida. Revise os dados e clique em Submeter para iniciar o fluxo de aprovação.
            </p>
          </div>
          <button
            onClick={handleSubmitRequest}
            className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            <ShoppingCart size={15} /> Submeter Solicitação
          </button>
        </div>
      )}

      {/* ── Card aprovação de área (T06) ── */}
      {request.areaApproval && (
        <div className={`bg-white rounded-xl border p-5 ${request.areaApproval.approved ? 'border-green-200' : 'border-red-200'}`}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileSearch size={16} />Aprovação de Área
          </h2>
          <div className="space-y-2 text-sm">
            <span className={`flex items-center gap-1 font-semibold w-fit ${request.areaApproval.approved ? 'text-green-600' : 'text-red-600'}`}>
              {request.areaApproval.approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {request.areaApproval.approved ? 'Aprovado' : 'Reprovado'}
            </span>
            {request.areaApproval.observation && (
              <div className="bg-slate-50 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MessageSquare size={12} /> Observação:</p>
                <p className="text-slate-700">{request.areaApproval.observation}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <User size={12} /> {request.areaApproval.approverName} •{' '}
              <Calendar size={12} /> {new Date(request.areaApproval.approvedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      {/* ── Cotações ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Cotações ({request.quotations?.length || 0}/3)
          </h2>
          <div className="flex items-center gap-3">
            {/* Botão Atender por Estoque (T07) */}
            {canConfirmStock && !showStockForm && (
              <button
                onClick={() => setShowStockForm(true)}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <Package size={16} />Atender por Estoque
              </button>
            )}
            {canAddQuotation && (
              <button
                onClick={() => setShowQuotationForm(!showQuotationForm)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={16} />Adicionar
              </button>
            )}
          </div>
        </div>

        {/* Formulário inline de encerramento por estoque (T07) */}
        {showStockForm && (
          <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
              <ShoppingCart size={16} />Atender por Estoque
            </p>
            <p className="text-xs text-teal-700">O item está disponível em estoque. Esta ação encerra o fluxo de cotação.</p>
            <textarea
              value={stockObservation}
              onChange={(e) => setStockObservation(e.target.value)}
              placeholder="Observação (opcional) — ex: item retirado do almoxarifado central"
              rows={2}
              className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowStockForm(false); setStockObservation('') }}
                className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStock}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* Card informativo quando atendido por estoque */}
        {request.stockFulfilled && (
          <div className="mb-4 bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
            <Package size={18} className="text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Atendido por estoque</p>
              {request.stockObservation && (
                <p className="text-xs text-teal-700 mt-0.5">{request.stockObservation}</p>
              )}
            </div>
          </div>
        )}

        {(request.quotations?.length || 0) === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">Nenhuma cotação registrada</p>
        )}

        <div className="space-y-3">
          {request.quotations?.map((q, i) => (
            <div
              key={q.id}
              className={`border rounded-xl p-4 ${selectedQuotation?.id === q.id ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">#{i + 1}</span>
                    <p className="text-sm font-semibold text-slate-800">{q.supplier}</p>
                    {selectedQuotation?.id === q.id && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Selecionada</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-green-700 font-semibold">
                      <DollarSign size={14} />R$ {q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Truck size={14} />{q.deliveryDays} dias
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {q.phone && <span>Tel: {q.phone}</span>}
                    {q.cnpj && <span>CNPJ: {q.cnpj}</span>}
                    {q.paymentMethod && (
                      <span>
                        Pgto: {q.paymentMethod === 'pix' ? 'PIX' : q.paymentMethod === 'cash' ? 'Dinheiro' : q.paymentMethod === 'boleto' ? `Boleto${q.boletoParcelas ? ` ${q.boletoParcelas}x` : ''}${q.boletoVencimento ? ` (venc. ${new Date(q.boletoVencimento + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''}` : `Crédito ${q.creditParcelas}x`}
                      </span>
                    )}
                  </div>
                  {q.observations && <p className="text-xs text-slate-500 mt-1">Obs: {q.observations}</p>}
                  <p className="text-xs text-slate-400 mt-1">Registrado por {q.buyerName}</p>
                </div>
                {canRemoveQuotation && removingQuotationId !== q.id && (
                  <button onClick={() => handleRemoveQuotation(q.id)} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {/* Formulário inline de justificativa de remoção */}
              {removingQuotationId === q.id && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-red-700">Justifique a remoção desta cotação:</p>
                  <textarea
                    value={removalReason}
                    onChange={(e) => { setRemovalReason(e.target.value); setRemovalError('') }}
                    placeholder="Motivo da remoção..."
                    rows={2}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${removalError ? 'border-red-400' : 'border-slate-300'}`}
                  />
                  {removalError && <p className="text-xs text-red-500">{removalError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRemovingQuotationId(null); setRemovalReason(''); setRemovalError('') }}
                      className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmRemoveQuotation}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Confirmar Remoção
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showQuotationForm && (
          <QuotationForm onSubmit={handleAddQuotation} onCancel={() => setShowQuotationForm(false)} />
        )}

        {(request.quotations?.length || 0) >= 3 && request.status === 'pending_supervisor' && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
            3 cotações registradas. Aguardando aprovação do supervisor.
          </div>
        )}
      </div>

      {/* Aprovação do supervisor */}
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

      {/* Aprovação financeira */}
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

      {/* ── Histórico de eventos (T08) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <History size={16} />Histórico
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum evento registrado</p>
        ) : (
          <ol className="relative border-l border-slate-200 space-y-4 ml-2">
            {history.map((event) => (
              <li key={event.id} className="pl-5 relative">
                {/* Bolinha na linha do tempo */}
                <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                  <AuditIcon type={event.type} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{AUDIT_LABELS[event.type]}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {event.actorName}
                    <span className="text-slate-400"> ({ROLE_LABELS[event.actorRole]})</span>
                    {' • '}
                    {new Date(event.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {event.metadata?.supplier && (
                    <p className="text-xs text-slate-500 mt-0.5">Fornecedor: {event.metadata.supplier}</p>
                  )}
                  {event.metadata?.osNumber && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <FileText size={11} />OS: <span className="font-mono font-medium text-slate-700">{event.metadata.osNumber}</span>
                    </p>
                  )}
                  {event.observation && (
                    <p className="text-xs text-slate-600 mt-0.5 italic">"{event.observation}"</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
