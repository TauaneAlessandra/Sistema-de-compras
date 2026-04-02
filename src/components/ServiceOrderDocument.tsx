// ============================================================
// ServiceOrderDocument.tsx — Layout visual da Ordem de Serviço
//
// Componente "de impressão": exibe todos os dados da OS em 4 seções.
// Recebe a OS e a solicitação de compra vinculada.
// Usado na página de detalhe e capturado pelo html2canvas para PDF.
// ============================================================

import { ServiceOrder, PurchaseRequest } from '../types'

const URGENCY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  urgent: 'Urgente',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  order: ServiceOrder
  request: PurchaseRequest
}

export default function ServiceOrderDocument({ order, request }: Props) {
  // Cotação selecionada pelo supervisor (se houver)
  const selectedQuotation = request.supervisorApproval?.selectedQuotationId
    ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
    : null

  const financial = request.financialApproval

  return (
    <div id="service-order-document" className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 max-w-2xl mx-auto print:border-0 print:rounded-none print:p-0">

      {/* ── Seção 1: Cabeçalho ─────────────────────────────── */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ordem de Serviço</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{order.number}</h1>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Gerado em: {formatDateTime(order.generatedAt)}</p>
            <p className="mt-0.5">Por: <span className="font-medium text-slate-700">{order.generatedByName}</span></p>
          </div>
        </div>
      </div>

      {/* ── Seção 2: Dados do item ──────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Dados do Item</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="col-span-2">
            <p className="text-xs text-slate-400">Título</p>
            <p className="font-semibold text-slate-800">{request.title}</p>
          </div>
          {request.description && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Descrição</p>
              <p className="text-slate-700">{request.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400">Quantidade</p>
            <p className="font-medium text-slate-800">{request.quantity} {request.unit}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Urgência</p>
            <p className={`font-medium ${request.urgency === 'urgent' ? 'text-red-600' : request.urgency === 'medium' ? 'text-amber-600' : 'text-slate-700'}`}>
              {URGENCY_LABELS[request.urgency] ?? request.urgency}
            </p>
          </div>
          {request.justification && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Justificativa</p>
              <p className="text-slate-700">{request.justification}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção 3: Fornecedor ─────────────────────────────── */}
      {selectedQuotation && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Fornecedor</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Nome do fornecedor</p>
              <p className="font-medium text-slate-800">{selectedQuotation.supplier}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Valor total</p>
              <p className="font-semibold text-green-700">
                R$ {selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Prazo de entrega</p>
              <p className="font-medium text-slate-800">{selectedQuotation.deliveryDays} dias</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Endereço / local de compra</p>
              <p className="font-medium text-slate-800">{selectedQuotation.supplierAddress || 'Não informado'}</p>
            </div>
            {selectedQuotation.observations && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Observações da cotação</p>
                <p className="text-slate-700">{selectedQuotation.observations}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Seção 4: Pagamento ──────────────────────────────── */}
      {financial && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Informações de Pagamento</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Forma de pagamento</p>
              <p className="font-medium text-slate-800">{financial.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Prazo de pagamento</p>
              <p className="font-medium text-slate-800">{financial.paymentTerms}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Data prevista de compra</p>
              <p className="font-medium text-slate-800">
                {new Date(financial.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
            {financial.supplierBankInfo && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Dados bancários do fornecedor</p>
                <p className="text-slate-700 whitespace-pre-line">{financial.supplierBankInfo}</p>
              </div>
            )}
            {financial.observation && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Observação do financeiro</p>
                <p className="text-slate-700">{financial.observation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
