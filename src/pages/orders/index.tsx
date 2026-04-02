// ============================================================
// pages/orders/index.tsx — Lista de Ordens de Serviço
//
// Exibe todas as OS geradas, em ordem decrescente de geração.
// Qualquer usuário autenticado pode visualizar.
// ============================================================

import { useNavigate } from 'react-router-dom'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { useData } from '../../context/DataContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function OrdersPage() {
  const { getServiceOrders, getRequestById } = useData()
  const navigate = useNavigate()

  // Ordena decrescente por generatedAt (mais recente primeiro)
  const orders = [...getServiceOrders()].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardList size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">Ordens de Serviço</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <ClipboardList size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma ordem de serviço gerada</p>
          <p className="text-slate-400 text-xs mt-1">As OS são criadas automaticamente na aprovação financeira</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const request = getRequestById(order.requestId)
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/ordens-servico/${order.id}`)}
                className="w-full bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-blue-700">{order.number}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {request?.title ?? 'Solicitação não encontrada'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(order.generatedAt)} · {order.generatedByName}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
