// ============================================================
// pages/requests/new/index.tsx — Criar nova solicitação
//
// Formulário para o solicitante/admin criar uma solicitação de compra.
// Campos: título, descrição, quantidade, unidade, urgência, justificativa.
// Opcional: upload de imagem com recorte antes de salvar.
//
// Após submissão válida, redireciona para /solicitacoes.
// ============================================================

import { useState, useRef, FormEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { UrgencyLevel } from '../../../types'
import { ShoppingCart, ArrowLeft, CheckCircle2, ImagePlus, X, Crop } from 'lucide-react'
import ImageCropper from '../../../components/ImageCropper'

const newRequestSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string(),
  quantity: z.coerce.number().positive('Deve ser maior que zero'),
  unit: z.string().min(1, 'Campo obrigatório'),
  urgency: z.enum(['low', 'medium', 'urgent'] as const),
  justification: z.string(),
}).superRefine((data, ctx) => {
  if (data.urgency === 'urgent' && !data.justification.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Justificativa obrigatória para urgência Urgente', path: ['justification'] })
  }
})

interface UrgencyOption {
  value: UrgencyLevel
  label: string
  color: string
}

// Configuração dos botões de urgência
const URGENCY_OPTIONS: UrgencyOption[] = [
  { value: 'low', label: 'Baixa', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'medium', label: 'Média', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600 bg-red-50 border-red-200' },
]

// Tipo dos campos do formulário — todos string para funcionar com input controlado
interface FormState {
  title: string
  description: string
  quantity: string   // string aqui, convertido para number no submit
  unit: string
  urgency: UrgencyLevel
  justification: string
}

export default function NewRequest() {
  const { user } = useAuth()
  const { createRequest } = useData()
  const navigate = useNavigate()

  // useRef cria uma referência ao elemento <input type="file"> no DOM.
  // Usamos para acionar o clique programaticamente (botão customizado).
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Exibe tela de sucesso após criar
  const [success, setSuccess] = useState(false)

  // Estado inicial do formulário
  const [form, setForm] = useState<FormState>({
    title: '', description: '', quantity: '', unit: '', urgency: 'medium', justification: '',
  })

  // Errors: objeto com as mesmas chaves do FormState, com mensagens de erro
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Estados para o fluxo de imagem:
  // rawImageSrc = imagem original (antes do recorte)
  // croppedImage = imagem final após recorte (base64 JPEG)
  // showCropper = controla a visibilidade do modal de recorte
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = newRequestSchema.safeParse(form)
    if (!result.success) {
      const e2: Partial<Record<keyof FormState, string>> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormState
        if (!e2[key]) e2[key] = issue.message
      })
      setErrors(e2)
      return
    }
    setErrors({})

    // Cria a solicitação passando os dados do form
    // quantity é convertida de string para number aqui
    // imageUrl usa o operador "??" — se croppedImage for null, passa undefined
    createRequest(
      { ...form, quantity: Number(form.quantity), imageUrl: croppedImage ?? undefined },
      user!,
    )
    setSuccess(true)
    // Redireciona após 2 segundos para o usuário ver a mensagem de sucesso
    setTimeout(() => navigate('/solicitacoes'), 2000)
  }

  // ChangeEvent<HTMLInputElement> é o tipo do evento do input file
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]  // pega o primeiro arquivo selecionado
    if (!file) return

    // Reseta o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''

    // FileReader converte o arquivo em base64 (DataURL) para uso no cropper
    const reader = new FileReader()
    reader.onload = () => {
      setRawImageSrc(reader.result as string)
      setShowCropper(true)  // abre o modal de recorte
    }
    reader.readAsDataURL(file)
  }

  // Recebe a imagem recortada do ImageCropper e fecha o modal
  function handleCropConfirm(dataUrl: string) {
    setCroppedImage(dataUrl)
    setShowCropper(false)
    setRawImageSrc(null)
  }

  function handleCropCancel() {
    setShowCropper(false)
    setRawImageSrc(null)
  }

  // Re-abre o cropper com a imagem já recortada (para ajustar o recorte)
  function handleReCrop() {
    if (!croppedImage) return
    setRawImageSrc(croppedImage)
    setShowCropper(true)
  }

  // Remove a imagem selecionada
  function handleRemoveImage() {
    setCroppedImage(null)
    setRawImageSrc(null)
  }

  // Tela de sucesso — exibida após criar a solicitação
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <CheckCircle2 size={56} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Solicitação criada!</h2>
          <p className="text-slate-500 text-sm mt-1">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    // Fragment (<>) agrupa o modal e o formulário sem criar elemento extra no DOM
    <>
      {/* Modal de recorte — renderiza condicionalmente */}
      {showCropper && rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho com botão voltar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}  // -1 = página anterior no histórico
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nova Solicitação</h1>
            <p className="text-slate-500 text-sm">Preencha os dados do item a ser comprado</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Campo: Título / Produto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Item / Produto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Papel A4, Cadeira de escritório..."
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Campo: Descrição */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição / Especificações
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva as especificações do item..."
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Campos: Quantidade + Unidade (lado a lado) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.quantity ? 'border-red-400' : 'border-slate-300'}`}
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="Ex: un, kg, cx, m²"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.unit ? 'border-red-400' : 'border-slate-300'}`}
                />
                {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
              </div>
            </div>

            {/* Campo: Urgência — botões de seleção exclusiva */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Urgência</label>
              <div className="flex gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"  // importante! sem isso, clicaria em submit
                    onClick={() => setForm({ ...form, urgency: opt.value })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.urgency === opt.value
                        ? opt.color + ' ring-2 ring-offset-1 ring-current'  // selecionado
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo: Justificativa — obrigatório quando urgência = Urgente */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Justificativa
                {form.urgency === 'urgent' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder={form.urgency === 'urgent' ? 'Obrigatório: explique a urgência desta compra' : 'Por que esta compra é necessária?'}
                rows={2}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.justification ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.justification && <p className="text-xs text-red-500 mt-1">{errors.justification}</p>}
            </div>

            {/* Campo: Upload de imagem */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Foto / Imagem do item
                <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
              </label>

              {croppedImage ? (
                // Preview da imagem recortada com botões de ação
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={croppedImage}
                    alt="Preview"
                    className="w-full max-h-56 object-cover"
                  />
                  {/* Botões flutuantes sobre a imagem */}
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleReCrop}
                      className="flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Crop size={13} /> Recortar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-1 bg-red-600/80 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <X size={13} /> Remover
                    </button>
                  </div>
                </div>
              ) : (
                // Área de upload — clica para abrir o seletor de arquivo
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}  // aciona o input escondido
                  className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl py-8 flex flex-col items-center gap-2 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <ImagePlus size={20} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 group-hover:text-blue-600">
                      Clique para selecionar uma imagem
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">PNG, JPG ou WEBP • Será recortada antes de salvar</p>
                  </div>
                </button>
              )}

              {/* Input file escondido — acionado programaticamente pelo botão acima */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Botões de ação do formulário */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                Criar Solicitação
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
