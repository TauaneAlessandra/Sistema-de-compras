// ============================================================
// approvals/supervisor/ApprovalCard.tsx — Card de aprovação
//
// Exibe uma solicitação para o supervisor avaliar.
// Comportamento:
// - Começa colapsado (fechado) — clique no cabeçalho abre
// - Dentro: lista de cotações com seleção por radio button
// - Campo de observação opcional
// - Botões Reprovar (sem precisar selecionar) e Aprovar (exige seleção)
// ============================================================

import { useState } from 'react'
import { z } from 'zod'
import { PurchaseRequest, SupervisorApproval } from '../../../types'
import { DollarSign, Truck, Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

const supervisorApprovalSchema = z.object({
  approved: z.boolean(),
  selectedQuotationId: z.string(),
  observation: z.string(),
}).superRefine((data, ctx) => {
  if (data.approved && !data.selectedQuotationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione um fornecedor para aprovar.', path: ['selectedQuotationId'] })
  }
  if (!data.approved && !data.observation.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Motivo é obrigatório ao reprovar.', path: ['observation'] })
  }
  if (data.observation.trim().length > 0 && data.observation.trim().length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 5 caracteres.', path: ['observation'] })
  }
})

type ApprovalData = Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>

interface Props {
  request: PurchaseRequest
  onApprove: (requestId: string, data: ApprovalData) => void
}

export default function ApprovalCard({ request, onApprove }: Props) {
  const [open, setOpen] = useState(false)           // controla se o card está expandido
  const [selectedId, setSelectedId] = useState('')  // ID da cotação selecionada
  const [observation, setObservation] = useState('') // texto da observação
  const [error, setError] = useState('')            // mensagem de validação

  function handleSubmit(approved: boolean) {
    const result = supervisorApprovalSchema.safeParse({ approved, selectedQuotationId: selectedId, observation })
    if (!result.success) { setError(result.error.issues[0].message); return }
    setError('')
    onApprove(request.id, { approved, selectedQuotationId: selectedId, observation })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabeçalho clicável — expande/colapsa o conteúdo */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">{request.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {request.requesterName} • {request.quantity} {request.unit} • {new Date(request.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {request.quotations.length} cotações
          </span>
          {/* Ícone de seta indica se está aberto ou fechado */}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Conteúdo expandido — só renderiza quando open=true */}
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Lista de cotações com radio buttons */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Selecione o fornecedor:</p>
            <div className="space-y-2">
              {request.quotations.map((q, i) => (
                // <label> envolve o radio + conteúdo para tornar a linha inteira clicável
                <label
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === q.id
                      ? 'border-blue-400 bg-blue-50'  // selecionado: destaque azul
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Radio button — name igual agrupa os radios para seleção exclusiva */}
                  <input
                    type="radio"
                    name={`quotation-${request.id}`}  // group por solicitação
                    value={q.id}
                    checked={selectedId === q.id}
                    onChange={() => setSelectedId(q.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">#{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{q.supplier}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="flex items-center gap-1 text-green-700 font-semibold">
                        <DollarSign size={13} />R$ {q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs">
                        <Truck size={13} />{q.deliveryDays} dias
                      </span>
                    </div>
                    {q.observations && <p className="text-xs text-slate-400 mt-0.5">Obs: {q.observations}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Campo de observação — opcional */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Observação <span className="text-slate-400">(obrigatório ao reprovar)</span>
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Escreva uma observação para esta aprovação..."
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Mensagem de erro de validação */}
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Botões de decisão */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}  // false = reprovar
              className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <X size={16} />Reprovar
            </button>
            <button
              onClick={() => handleSubmit(true)}   // true = aprovar
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Check size={16} />Aprovar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
