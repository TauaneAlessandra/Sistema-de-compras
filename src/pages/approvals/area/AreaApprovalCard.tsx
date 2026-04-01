// ============================================================
// approvals/area/AreaApprovalCard.tsx — Card de aprovação de área
//
// Exibe uma solicitação para o responsável da área avaliar.
// Diferente do supervisor: não há seleção de cotação — apenas
// aprovação/reprovação com observação obrigatória.
// ============================================================

import { useState } from 'react'
import { z } from 'zod'
import { PurchaseRequest } from '../../../types'
import { Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

const areaApprovalSchema = z.object({
  observation: z.string().min(5, 'Observação obrigatória (mínimo 5 caracteres).'),
})

interface Props {
  request: PurchaseRequest
  onApprove: (requestId: string, data: { approved: boolean; observation: string }) => void
}

export default function AreaApprovalCard({ request, onApprove }: Props) {
  const [open, setOpen] = useState(false)
  const [observation, setObservation] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(approved: boolean) {
    const result = areaApprovalSchema.safeParse({ observation: observation.trim() })
    if (!result.success) { setError(result.error.issues[0].message); return }
    setError('')
    onApprove(request.id, { approved, observation: observation.trim() })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
          <span className="hidden sm:block text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
            Aguardando área
          </span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Detalhes da solicitação */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            {request.description && (
              <p className="text-slate-600"><span className="text-slate-400 text-xs">Descrição: </span>{request.description}</p>
            )}
            {request.justification && (
              <p className="text-slate-600"><span className="text-slate-400 text-xs">Justificativa: </span>{request.justification}</p>
            )}
          </div>

          {/* Observação obrigatória */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Observação (obrigatória)
            </label>
            <textarea
              value={observation}
              onChange={(e) => { setObservation(e.target.value); setError('') }}
              placeholder="Justifique sua decisão..."
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

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
              <Check size={16} />Aprovar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
