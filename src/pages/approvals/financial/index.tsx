// ============================================================
// approvals/financial/index.tsx — Página de aprovação financeira
//
// Etapa final do fluxo de compra.
// Lista as solicitações com status "pending_financial".
// O financeiro informa a data prevista de compra e aprova/reprova.
// ============================================================

import { useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { FinancialApproval } from '../../../types'
import { BadgeDollarSign } from 'lucide-react'
import FinancialCard from './FinancialCard'

// Remove os campos preenchidos automaticamente (quem aprovou, quando)
type ApprovalData = Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>

export default function ApprovalFinancial() {
  const { user } = useAuth()
  const { requests, loadRequests, financialApprove } = useData()

  useEffect(() => { loadRequests() }, [])

  // Filtra apenas as que chegaram até o financeiro
  const pending = requests.filter((r) => r.status === 'pending_financial')

  function handleApprove(requestId: string, data: ApprovalData) {
    // user! — o "!" diz ao TypeScript que garantimos que user não é null aqui,
    // pois esta página só é acessível por usuários logados (ProtectedRoute)
    financialApprove(requestId, data, user!)
    loadRequests()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Aprovação Financeira</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {pending.length} solicitação(ões) aguardando aprovação financeira
        </p>
      </div>

      {/* Estado vazio */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          <BadgeDollarSign size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma solicitação pendente</p>
          <p className="text-xs mt-1">Nenhuma compra aguardando aprovação financeira!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <FinancialCard key={r.id} request={r} onApprove={handleApprove} />
          ))}
        </div>
      )}
    </div>
  )
}
