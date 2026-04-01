// ============================================================
// requests/detail/QuotationForm.tsx — Formulário de cotação
//
// Subcomponente do detalhe da solicitação.
// O comprador usa este formulário para registrar uma cotação
// de um fornecedor (fornecedor, preço, prazo, observações).
//
// Após submissão válida, chama onSubmit com os dados formatados.
// ============================================================

import { useState, FormEvent } from 'react'
import { z } from 'zod'
import { Quotation } from '../../../types'

const quotationSchema = z.object({
  supplier: z.string().min(2, 'Mínimo 2 caracteres'),
  price: z.coerce.number().positive('Deve ser maior que zero'),
  deliveryDays: z.coerce.number().int('Deve ser inteiro').positive('Deve ser maior que zero'),
  observations: z.string(),
})

// Omit remove os campos gerados automaticamente ao salvar (id, buyerId, etc.)
// QuotationInput é apenas o que o usuário precisa preencher
type QuotationInput = Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>

interface Props {
  onSubmit: (data: QuotationInput) => void
  onCancel: () => void
}

export default function QuotationForm({ onSubmit, onCancel }: Props) {
  // Estado do formulário — todos os valores são strings para o input controlado
  // Serão convertidos para number no momento do submit
  const [form, setForm] = useState({ supplier: '', price: '', deliveryDays: '', observations: '' })

  // typeof form retorna o tipo do objeto form — evita redeclarar a interface
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = quotationSchema.safeParse(form)
    if (!result.success) {
      const e2: Partial<typeof form> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof typeof form
        if (!e2[key]) e2[key] = issue.message
      })
      setErrors(e2)
      return
    }
    setErrors({})
    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3">
      <p className="text-sm font-semibold text-slate-700">Adicionar Cotação</p>

      {/* Grid de 2 colunas em telas maiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fornecedor */}
        <div>
          <label className="text-xs font-medium text-slate-600">Fornecedor *</label>
          <input
            type="text"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            placeholder="Nome do fornecedor"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.supplier && <p className="text-xs text-red-500 mt-0.5">{errors.supplier}</p>}
        </div>

        {/* Preço — step="0.01" permite centavos */}
        <div>
          <label className="text-xs font-medium text-slate-600">Valor Total (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
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
            onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
            placeholder="Ex: 5"
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryDays ? 'border-red-400' : 'border-slate-300'}`}
          />
          {errors.deliveryDays && <p className="text-xs text-red-500 mt-0.5">{errors.deliveryDays}</p>}
        </div>

        {/* Observações — campo opcional */}
        <div>
          <label className="text-xs font-medium text-slate-600">Observações</label>
          <input
            type="text"
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            placeholder="Condições, pagamento..."
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
