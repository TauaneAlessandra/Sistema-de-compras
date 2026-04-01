// ============================================================
// approvals/area/index.tsx — Página de aprovação do responsável de área
//
// Lista as solicitações com status "pending_area_approval".
// O responsável de área expande cada card, escreve uma observação
// e aprova ou reprova a solicitação antes de ir para cotação.
// ============================================================

import { useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { CheckSquare } from 'lucide-react'
import AreaApprovalCard from './AreaApprovalCard'

export default function ApprovalArea() {
  const { user } = useAuth()
  const { requests, loadRequests, areaApprove } = useData()

  useEffect(() => { loadRequests() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = requests.filter((r) => r.status === 'pending_area_approval')

  function handleApprove(requestId: string, data: { approved: boolean; observation: string }) {
    areaApprove(requestId, data, user!)
    loadRequests()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Aprovação de Área</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {pending.length} solicitação(ões) aguardando aprovação da área
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          <CheckSquare size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma solicitação pendente</p>
          <p className="text-xs mt-1">Todas as solicitações foram analisadas!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <AreaApprovalCard key={r.id} request={r} onApprove={handleApprove} />
          ))}
        </div>
      )}
    </div>
  )
}
