// ============================================================
// approvals/financial/FinancialCard.tsx — Card do financeiro
//
// Exibe uma solicitação para aprovação financeira.
// Semelhante ao ApprovalCard do supervisor, mas:
// - Mostra um resumo completo da compra (item, valor, fornecedor)
// - Exige uma data prevista de compra para aprovar
// - Mostra a observação do supervisor (se houver)
// ============================================================

import { useState } from 'react'
import { z } from 'zod'
import { PurchaseRequest, FinancialApproval } from '../../../types'
import { DollarSign, Truck, Check, X, MessageSquare, ChevronDown, ChevronUp, Calendar, CreditCard, Clock, Building2 } from 'lucide-react'

const financialApprovalSchema = z.object({
  approved: z.boolean(),
  purchaseDate: z.string(),
  paymentMethod: z.string(),
  paymentTerms: z.string(),
  supplierBankInfo: z.string(),
  observation: z.string(),
}).superRefine((data, ctx) => {
  if (data.approved && !data.purchaseDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a data prevista para compra.', path: ['purchaseDate'] })
  }
  if (data.approved && !data.paymentMethod.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Forma de pagamento obrigatória.', path: ['paymentMethod'] })
  }
  if (data.approved && !data.paymentTerms.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prazo de pagamento obrigatório.', path: ['paymentTerms'] })
  }
  if (data.observation.trim().length > 0 && data.observation.trim().length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 5 caracteres.', path: ['observation'] })
  }
})

type ApprovalData = Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>

interface Props {
  request: PurchaseRequest
  onApprove: (requestId: string, data: ApprovalData) => void
}

export default function FinancialCard({ request, onApprove }: Props) {
  const [open, setOpen] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [supplierBankInfo, setSupplierBankInfo] = useState('')
  const [observation, setObservation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // Recupera a cotação selecionada pelo supervisor para exibir no resumo.
  // O operador "?." (optional chaining) evita erro se supervisorApproval for null.
  const selectedQuotation = request.supervisorApproval?.selectedQuotationId
    ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
    : null

  function handleSubmit(approved: boolean) {
    const result = financialApprovalSchema.safeParse({ approved, purchaseDate, paymentMethod, paymentTerms, supplierBankInfo, observation })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0])
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      })
      setErrors(fieldErrors)
      setError(result.error.issues[0].message)
      return
    }
    setErrors({})
    setError('')
    onApprove(request.id, { approved, purchaseDate, paymentMethod, paymentTerms, supplierBankInfo: supplierBankInfo || undefined, observation })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabeçalho clicável com resumo rápido */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">{request.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {request.requesterName} • {request.quantity} {request.unit}
          </p>
          {/* Mostra o fornecedor selecionado no cabeçalho para consulta rápida */}
          {selectedQuotation && (
            <p className="text-xs text-green-600 font-medium mt-0.5">
              Fornecedor: {selectedQuotation.supplier} • R$ {selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {/* Conteúdo expandido */}
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Resumo completo da compra */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-slate-500 mb-2">Resumo da compra</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Item</p>
                <p className="font-medium text-slate-800">{request.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Quantidade</p>
                <p className="font-medium text-slate-800">{request.quantity} {request.unit}</p>
              </div>
              {/* Dados da cotação selecionada — renderiza apenas se existir */}
              {selectedQuotation && (
                <>
                  <div>
                    <p className="text-xs text-slate-400">Fornecedor</p>
                    <p className="font-medium text-slate-800">{selectedQuotation.supplier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Valor</p>
                    <p className="font-semibold text-green-700 flex items-center gap-1">
                      <DollarSign size={13} />R$ {selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Prazo entrega</p>
                    <p className="font-medium text-slate-800 flex items-center gap-1">
                      <Truck size={13} />{selectedQuotation.deliveryDays} dias
                    </p>
                  </div>
                </>
              )}
            </div>
            {/* Observação do supervisor — exibida como contexto para o financeiro */}
            {request.supervisorApproval?.observation && (
              <div className="border-t border-slate-200 pt-2 mt-2">
                <p className="text-xs text-slate-400">Obs. do supervisor:</p>
                <p className="text-slate-700 text-xs mt-0.5">{request.supervisorApproval.observation}</p>
              </div>
            )}
          </div>

          {/* Campo de data — min garante que não selecione datas passadas */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Calendar size={12} /> Data prevista para compra *
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.purchaseDate ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.purchaseDate && <p className="text-xs text-red-500 mt-0.5">{errors.purchaseDate}</p>}
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <CreditCard size={12} /> Forma de pagamento *
            </label>
            <input
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Ex: PIX, Boleto, Cartão, Transferência..."
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentMethod ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.paymentMethod && <p className="text-xs text-red-500 mt-0.5">{errors.paymentMethod}</p>}
          </div>

          {/* Prazo de pagamento */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Clock size={12} /> Prazo de pagamento *
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Ex: À vista, 30 dias, 30/60/90 dias..."
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentTerms ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.paymentTerms && <p className="text-xs text-red-500 mt-0.5">{errors.paymentTerms}</p>}
          </div>

          {/* Dados bancários do fornecedor */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 size={12} /> Dados bancários do fornecedor (opcional)
            </label>
            <textarea
              value={supplierBankInfo}
              onChange={(e) => setSupplierBankInfo(e.target.value)}
              placeholder="Banco, agência, conta, chave PIX..."
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Observação financeira */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Observação financeira (opcional)
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: verba disponível, autorização nº..."
              rows={2}
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.observation ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.observation && <p className="text-xs text-red-500 mt-0.5">{errors.observation}</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Botões de decisão final */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}
              className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <X size={16} />Reprovar
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Check size={16} />Aprovar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
