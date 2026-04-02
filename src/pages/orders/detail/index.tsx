// ============================================================
// pages/orders/detail/index.tsx — Detalhe da Ordem de Serviço
//
// Exibe o ServiceOrderDocument completo com 4 botões de ação:
// Imprimir, Baixar PDF, Enviar por Email, Enviar por WhatsApp.
// ============================================================

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, Printer, Download, Mail, MessageCircle } from 'lucide-react'
import { useData } from '../../../context/DataContext'
import { ServiceOrder, PurchaseRequest } from '../../../types'
import ServiceOrderDocument from '../../../components/ServiceOrderDocument'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getServiceOrderById, getRequestById } = useData()

  const order = id ? getServiceOrderById(id) : null
  const request = order ? getRequestById(order.requestId) : null

  // Redireciona se OS não encontrada
  useEffect(() => {
    if (id && !order) navigate('/ordens-servico', { replace: true })
  }, [id, order, navigate])

  if (!order || !request) return null

  // Após o guard, as variáveis são não-nulas — usamos aliases tipados
  return <OrderDetailContent order={order} request={request} />
}

function OrderDetailContent({ order, request }: { order: ServiceOrder; request: PurchaseRequest }) {
  const navigate = useNavigate()

  // ── Ações ────────────────────────────────────────────────

  function handlePrint() {
    window.print()
  }

  async function handleDownloadPdf() {
    const el = document.getElementById('service-order-document')
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, width, height)
    pdf.save(`${order.number}.pdf`)
  }

  function handleShareEmail() {
    const selectedQuotation = request.supervisorApproval?.selectedQuotationId
      ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
      : null
    const financial = request.financialApproval

    const subject = encodeURIComponent(`[${order.number}] Ordem de Serviço - ${request.title}`)
    const body = encodeURIComponent(
      `ORDEM DE SERVIÇO\n` +
      `Número: ${order.number}\n` +
      `Data: ${new Date(order.generatedAt).toLocaleDateString('pt-BR')}\n` +
      `Gerado por: ${order.generatedByName}\n\n` +
      `ITEM\n` +
      `Título: ${request.title}\n` +
      `Quantidade: ${request.quantity} ${request.unit}\n` +
      (request.justification ? `Justificativa: ${request.justification}\n` : '') +
      `\nFORNECEDOR\n` +
      (selectedQuotation
        ? `Fornecedor: ${selectedQuotation.supplier}\n` +
          `Valor: R$ ${selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `Endereço: ${selectedQuotation.supplierAddress || 'Não informado'}\n`
        : '') +
      (financial
        ? `\nPAGAMENTO\n` +
          `Forma: ${financial.paymentMethod}\n` +
          `Prazo: ${financial.paymentTerms}\n` +
          `Data prevista: ${new Date(financial.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n`
        : '')
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  function handleShareWhatsApp() {
    const selectedQuotation = request.supervisorApproval?.selectedQuotationId
      ? request.quotations.find((q) => q.id === request.supervisorApproval!.selectedQuotationId)
      : null
    const financial = request.financialApproval

    const text = encodeURIComponent(
      `*${order.number}*\n` +
      `📋 Ordem de Serviço\n\n` +
      `📦 *Item:* ${request.title}\n` +
      `🔢 *Quantidade:* ${request.quantity} ${request.unit}\n` +
      (selectedQuotation
        ? `🏭 *Fornecedor:* ${selectedQuotation.supplier}\n` +
          `💰 *Valor:* R$ ${selectedQuotation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `📍 *Local:* ${selectedQuotation.supplierAddress || 'Não informado'}\n`
        : '') +
      (financial
        ? `💳 *Pagamento:* ${financial.paymentMethod} — ${financial.paymentTerms}\n` +
          `📅 *Data prevista:* ${new Date(financial.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n`
        : '') +
      `\n_Gerado por ${order.generatedByName}_`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Cabeçalho de navegação */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ordens-servico')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">{order.number}</h1>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Printer size={15} /> Imprimir
        </button>
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Download size={15} /> Baixar PDF
        </button>
        <button
          onClick={handleShareEmail}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Mail size={15} /> Email
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <MessageCircle size={15} /> WhatsApp
        </button>
      </div>

      {/* Documento da OS */}
      <ServiceOrderDocument order={order} request={request} />
    </div>
  )
}
