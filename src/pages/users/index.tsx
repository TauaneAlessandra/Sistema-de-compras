// ============================================================
// pages/users/index.tsx — Gerenciamento de usuários
//
// Página exclusiva do Admin para:
// - Listar todos os usuários (ativos e inativos)
// - Criar novo usuário (via modal)
// - Editar usuário existente (via modal)
// - Ativar/desativar usuário (soft delete)
// ============================================================

import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, UserRole } from '../../types'
import { Users as UsersIcon, Plus, Pencil, PowerOff } from 'lucide-react'
import UserModal from './UserModal'

// Tipos locais para manter o código organizado
interface RoleOption { value: UserRole; label: string }
// O modal pode estar no modo "novo" ou "editar" (com user pré-preenchido)
interface ModalState { type: 'new' | 'edit'; user?: User }

// Opções de perfil para exibição
const ROLE_OPTIONS: RoleOption[] = [
  { value: 'requester', label: 'Solicitante' },
  { value: 'area_manager', label: 'Resp. de Área' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'admin', label: 'Administrador' },
]

// Cores de badge por perfil
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  requester: 'bg-blue-100 text-blue-700',
  area_manager: 'bg-teal-100 text-teal-700',
  buyer: 'bg-yellow-100 text-yellow-700',
  supervisor: 'bg-green-100 text-green-700',
  financial: 'bg-red-100 text-red-700',
}

// Tipo dos dados do formulário do modal (usado como parâmetro nas funções)
interface FormState { name: string; email: string; password: string; role: UserRole }

export default function Users() {
  const { users, addUser, updateUser, refreshUsers } = useAuth()

  // null = modal fechado | { type: 'new' } = criação | { type: 'edit', user } = edição
  const [modal, setModal] = useState<ModalState | null>(null)

  // Carrega a lista atualizada ao montar o componente
  useEffect(() => { refreshUsers() }, [])

  // Salva novo usuário e fecha o modal em caso de sucesso
  function handleSaveNew(form: FormState) {
    const result = addUser(form)
    if (result.success) { setModal(null); refreshUsers() }
    return result  // retorna para o modal exibir erro se houver
  }

  // Atualiza usuário existente — senha só é alterada se o campo não estiver vazio
  function handleSaveEdit(form: FormState) {
    if (!modal?.user) return
    // Partial<User> permite passar apenas os campos que queremos atualizar
    const data: Partial<User> = { name: form.name, email: form.email, role: form.role }
    if (form.password.trim()) data.password = form.password  // só atualiza se preencheu
    updateUser(modal.user.id, data)
    setModal(null)
    refreshUsers()
    return { success: true }
  }

  // Alterna entre ativo e inativo — pede confirmação antes
  function handleToggle(id: string, active: boolean) {
    const label = active ? 'desativar' : 'ativar'
    if (confirm(`Deseja ${label} este usuário?`)) {
      updateUser(id, { active: !active })  // inverte o status
      refreshUsers()
    }
  }

  // Ordena os usuários por nome em ordem alfabética
  const all = [...users].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      {/* Cabeçalho com contador e botão de novo usuário */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {all.filter((u) => u.active).length} usuário(s) ativo(s)
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />Novo Usuário
        </button>
      </div>

      {/* Lista de usuários */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {all.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UsersIcon size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {all.map((u) => (
              // Usuários inativos ficam com opacidade reduzida
              <div key={u.id} className={`flex items-center justify-between px-5 py-3.5 ${!u.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  {/* Avatar com inicial do nome */}
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{u.name}</p>
                      {!u.active && <span className="text-xs text-slate-400">(inativo)</span>}
                    </div>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Badge de perfil — hidden em mobile, visível em sm+ */}
                  <span className={`hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                    {ROLE_OPTIONS.find((r) => r.value === u.role)?.label}
                  </span>
                  {/* Botão editar */}
                  <button
                    onClick={() => setModal({ type: 'edit', user: u })}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  {/* Botão ativar/desativar — muda cor conforme o estado */}
                  <button
                    onClick={() => handleToggle(u.id, u.active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      u.active
                        ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                        : 'hover:bg-green-50 text-slate-400 hover:text-green-500'
                    }`}
                    title={u.active ? 'Desativar' : 'Ativar'}
                  >
                    <PowerOff size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação — só renderiza quando modal.type === 'new' */}
      {modal?.type === 'new' && (
        <UserModal onSave={handleSaveNew} onClose={() => setModal(null)} isEdit={false} />
      )}

      {/* Modal de edição — passa os dados do usuário como valor inicial */}
      {modal?.type === 'edit' && modal.user && (
        <UserModal
          initial={{ name: modal.user.name, email: modal.user.email, role: modal.user.role, password: '' }}
          onSave={handleSaveEdit}
          onClose={() => setModal(null)}
          isEdit
        />
      )}
    </div>
  )
}
