// ============================================================
// users/UserModal.tsx — Modal de criação e edição de usuário
//
// Componente reutilizado tanto para criar quanto para editar.
// A prop "isEdit" controla o comportamento:
// - isEdit=false → senha obrigatória, botão "Criar Usuário"
// - isEdit=true  → senha opcional (vazio = manter atual), botão "Salvar"
// ============================================================

import { useState, FormEvent } from 'react'
import { UserRole } from '../../types'
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface RoleOption {
  value: UserRole
  label: string
}

// Lista de perfis disponíveis para seleção no <select>
const ROLE_OPTIONS: RoleOption[] = [
  { value: 'requester', label: 'Solicitante' },
  { value: 'area_manager', label: 'Resp. de Área' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'admin', label: 'Administrador' },
]

// Campos do formulário dentro do modal
interface FormState {
  name: string
  email: string
  password: string
  role: UserRole
}

interface Props {
  initial?: FormState  // Dados iniciais para preencher o formulário (edição)
  onSave: (form: FormState) => { success: boolean; message?: string } | void
  onClose: () => void
  isEdit: boolean
}

export default function UserModal({ initial, onSave, onClose, isEdit }: Props) {
  // Se initial for fornecido (edição), usa esses dados; senão, começa vazio
  const [form, setForm] = useState<FormState>(
    initial ?? { name: '', email: '', password: '', role: 'requester' }
  )
  const [showPass, setShowPass] = useState(false)
  // errors: objeto com chaves iguais aos campos do form, valores são mensagens de erro
  const [errors, setErrors] = useState<Partial<FormState>>({})
  // feedback: mensagem de erro retornada pela função onSave (ex: "Email já cadastrado")
  const [feedback, setFeedback] = useState('')

  // Valida os campos antes de salvar — retorna objeto com os erros encontrados
  function validate() {
    const e: Partial<FormState> = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    // Regex simples para validar formato de email
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    // Senha só é obrigatória na criação (isEdit=false)
    if (!isEdit && !form.password.trim()) e.password = 'Campo obrigatório'
    if (!isEdit && form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const e2 = validate()
    // Se há erros, mostra e não prossegue
    if (Object.keys(e2).length > 0) { setErrors(e2); return }
    const result = onSave(form)
    // Se onSave retornou erro (ex: email duplicado), mostra no topo do form
    if (result && !result.success) setFeedback(result.message ?? '')
  }

  return (
    // Overlay com fundo semitransparente
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Erro geral (ex: email duplicado) */}
          {feedback && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
              <AlertCircle size={15} /> {feedback}
            </div>
          )}

          {/* Campo Nome */}
          <div>
            <label className="text-sm font-medium text-slate-700">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              // Aplica borda vermelha quando há erro neste campo
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>

          {/* Campo Email */}
          <div>
            <label className="text-sm font-medium text-slate-700">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          </div>

          {/* Campo Senha — comportamento diferente em criação vs edição */}
          {!isEdit ? (
            // Criação: senha obrigatória
            <div>
              <label className="text-sm font-medium text-slate-700">Senha *</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9 ${errors.password ? 'border-red-400' : 'border-slate-300'}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>
          ) : (
            // Edição: senha opcional — vazio = mantém a atual
            <div>
              <label className="text-sm font-medium text-slate-700">Nova Senha (deixe em branco para manter)</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Campo Perfil — select com os perfis disponíveis */}
          <div>
            <label className="text-sm font-medium text-slate-700">Perfil *</label>
            <select
              value={form.role}
              // "as UserRole" faz o cast do valor string para o tipo correto
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm">
              {isEdit ? 'Salvar' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
