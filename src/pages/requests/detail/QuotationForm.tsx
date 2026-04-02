// ============================================================
// requests/detail/QuotationForm.tsx — Formulário de cotação
//
// Subcomponente do detalhe da solicitação.
// O comprador usa este formulário para registrar uma cotação
// de um fornecedor: nome, telefone, CNPJ, valor, prazo,
// forma de pagamento e observações.
// ============================================================

import { useState, FormEvent } from 'react'
import { z } from 'zod'
import { Quotation, QuotationPaymentMethod } from '../../../types'

const quotationSchema = z.object({
  supplier: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().min(8, 'Telefone inválido'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  price: z.coerce.number().positive('Deve ser maior que zero'),
  deliveryDays: z.coerce.number().int('Deve ser inteiro').positive('Deve ser maior que zero'),
  paymentMethod: z.enum(['pix', 'cash', 'boleto', 'credit'] as const),
  boletoVencimento: z.string().optional(),
  boletoParcelas: z.string().optional(),
  creditParcelas: z.string().optional(),
  observations: z.string(),
  supplierAddress: z.string(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'boleto' && !data.boletoVencimento) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o vencimento do boleto.', path: ['boletoVencimento'] })
  }
  if (data.paymentMethod === 'credit' && !data.creditParcelas?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o número de parcelas.', path: ['creditParcelas'] })
  }
})

// Omit remove os campos gerados automaticamente ao salvar (id, buyerId, etc.)
type QuotationInput = Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>

interface Props {
  onSubmit: (data: QuotationInput) => void
  onCancel: () => void
}

const PAYMENT_LABELS: Record<QuotationPaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  credit: 'Crédito (parcelado)',
}

export default function QuotationForm({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    supplier: '',
    phone: '',
    cnpj: '',
    price: '',
    deliveryDays: '',
    paymentMethod: '' as QuotationPaymentMethod | '',
    boletoVencimento: '',
    boletoParcelas: '',
    creditParcelas: '',
    observations: '',
    supplierAddress: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = quotationSchema.safeParse(form)
    if (!result.success) {
      const e2: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0])
        if (!e2[key]) e2[key] = issue.message
      })
      setErrors(e2)
      return
    }
    setErrors({})
    const data = result.data
    onSubmit({
      supplier: data.supplier,
      phone: data.phone,
      cnpj: data.cnpj,
      price: data.price,
      deliveryDays: data.deliveryDays,
      paymentMethod: data.paymentMethod,
      boletoVencimento: data.paymentMethod === 'boleto' ? data.boletoVencimento : undefined,
      boletoParcelas: data.paymentMethod === 'boleto' && data.boletoParcelas ? Number(data.boletoParcelas) : undefined,
      creditParcelas: data.paymentMethod === 'credit' && data.creditParcelas ? Number(data.creditParcelas) : undefined,
      observations: data.observations,
      supplierAddress: data.supplierAddress || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3">
      <p className="text-sm font-semibold text-slate-700">Adicionar Cotação</p>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fornecedor */}
        <div>
          <label className="text-xs font-medium text-slate-600">Nome da loja/fornecedor *</label>
          <input
            type="text"
            value={form.supplier}
            onChange={(e) => set('supplier', e.target.value)}
            placeholder="Nome da loja"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.supplier && <p className="text-xs text-red-500 mt-0.5">{errors.supplier}</p>}
        </div>

        {/* Telefone */}
        <div>
          <label className="text-xs font-medium text-slate-600">Telefone *</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
        </div>

        {/* CNPJ */}
        <div>
          <label className="text-xs font-medium text-slate-600">CNPJ *</label>
          <input
            type="text"
            value={form.cnpj}
            onChange={(e) => set('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cnpj ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.cnpj && <p className="text-xs text-red-500 mt-0.5">{errors.cnpj}</p>}
        </div>

        {/* Valor */}
        <div>
          <label className="text-xs font-medium text-slate-600">Valor Total (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="0,00"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.price && <p className="text-xs text-red-500 mt-0.5">{errors.price}</p>}
        </div>

        {/* Prazo em dias */}
        <div>
          <label className="text-xs font-medium text-slate-600">Prazo de Entrega (dias) *</label>
          <input
            type="number"
            min="1"
            value={form.deliveryDays}
            onChange={(e) => set('deliveryDays', e.target.value)}
            placeholder="Ex: 5"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryDays ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.deliveryDays && <p className="text-xs text-red-500 mt-0.5">{errors.deliveryDays}</p>}
        </div>

        {/* Forma de pagamento */}
        <div>
          <label className="text-xs font-medium text-slate-600">Forma de pagamento *</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value)}
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentMethod ? 'border-red-400' : 'border-slate-300'}`}
          >
            <option value="">Selecione...</option>
            {(Object.keys(PAYMENT_LABELS) as QuotationPaymentMethod[]).map((k) => (
              <option key={k} value={k}>{PAYMENT_LABELS[k]}</option>
            ))}
          </select>
          {errors.paymentMethod && <p className="text-xs text-red-500 mt-0.5">{errors.paymentMethod}</p>}
        </div>
      </div>

      {/* Campos condicionais de pagamento */}
      {form.paymentMethod === 'boleto' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Vencimento do boleto *</label>
            <input
              type="date"
              value={form.boletoVencimento}
              onChange={(e) => set('boletoVencimento', e.target.value)}
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.boletoVencimento ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.boletoVencimento && <p className="text-xs text-red-500 mt-0.5">{errors.boletoVencimento}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Parcelas do boleto (opcional)</label>
            <input
              type="number"
              min="1"
              value={form.boletoParcelas}
              onChange={(e) => set('boletoParcelas', e.target.value)}
              placeholder="Deixe vazio se à vista"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {form.paymentMethod === 'credit' && (
        <div>
          <label className="text-xs font-medium text-slate-600">Número de parcelas *</label>
          <input
            type="number"
            min="1"
            value={form.creditParcelas}
            onChange={(e) => set('creditParcelas', e.target.value)}
            placeholder="Ex: 3"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.creditParcelas ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.creditParcelas && <p className="text-xs text-red-500 mt-0.5">{errors.creditParcelas}</p>}
        </div>
      )}

      {/* Observações */}
      <div>
        <label className="text-xs font-medium text-slate-600">Observações</label>
        <input
          type="text"
          value={form.observations}
          onChange={(e) => set('observations', e.target.value)}
          placeholder="Condições adicionais..."
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Endereço do fornecedor */}
      <div>
        <label className="text-xs font-medium text-slate-600">Endereço/localização (opcional)</label>
        <input
          type="text"
          value={form.supplierAddress}
          onChange={(e) => set('supplierAddress', e.target.value)}
          placeholder="Endereço/localização do fornecedor"
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Salvar Cotação
        </button>
      </div>
    </form>
  )
}
