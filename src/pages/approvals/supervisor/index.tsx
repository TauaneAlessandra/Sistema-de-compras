// ============================================================
// approvals/supervisor/index.tsx — Página de aprovação do supervisor
//
// Lista as solicitações com status "pending_supervisor".
// O supervisor expande cada card, seleciona o fornecedor preferido,
// escreve uma observação e aprova ou reprova.
// ============================================================

import { useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { SupervisorApproval } from '../../../types'
import { CheckSquare } from 'lucide-react'
import ApprovalCard from './ApprovalCard'

// Omit remove os campos preenchidos automaticamente pelo contexto ao salvar
type ApprovalData = Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>

export default function ApprovalSupervisor() {
  const { user } = useAuth()
  const { requests, loadRequests, supervisorApprove } = useData()

  // Carrega as solicitações ao abrir a página
  useEffect(() => { loadRequests() }, [])

  // Filtra apenas as que estão aguardando o supervisor
  const pending = requests.filter((r) => r.status === 'pending_supervisor')

  // Chamada quando o ApprovalCard confirma a decisão
  function handleApprove(requestId: string, data: ApprovalData) {
    supervisorApprove(requestId, data, user)
    loadRequests()  // recarrega para remover o card aprovado da lista
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Aprovação do Supervisor</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {pending.length} solicitação(ões) aguardando aprovação
        </p>
      </div>

      {/* Estado vazio */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          <CheckSquare size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma solicitação pendente</p>
          <p className="text-xs mt-1">Todas as cotações foram analisadas!</p>
        </div>
      ) : (
        // Renderiza um ApprovalCard para cada solicitação pendente
        <div className="space-y-4">
          {pending.map((r) => (
            <ApprovalCard key={r.id} request={r} onApprove={handleApprove} />
          ))}
        </div>
      )}
    </div>
  )
}
