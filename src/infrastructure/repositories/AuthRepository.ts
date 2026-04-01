// ============================================================
// infrastructure/repositories/AuthRepository.ts
//
// Encapsula toda a persistência de usuários e sessão.
// O AuthContext usa este repositório em vez de acessar
// o localStorage diretamente.
// ============================================================

import { User, SafeUser } from '../../types'

const USERS_KEY = 'sc_users'
const SESSION_KEY = 'sc_current_user'

export const AuthRepository = {
  // ── Usuários ───────────────────────────────────────────────

  /** Carrega todos os usuários do storage */
  getAllUsers(): User[] {
    const stored = localStorage.getItem(USERS_KEY)
    return stored ? JSON.parse(stored) : []
  },

  /** Persiste o array completo de usuários */
  saveAllUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  },

  /** Inicializa o storage com os usuários padrão, se ainda não existir */
  initializeIfEmpty(defaultUsers: User[]): User[] {
    const stored = localStorage.getItem(USERS_KEY)
    if (!stored) {
      this.saveAllUsers(defaultUsers)
      return defaultUsers
    }
    return JSON.parse(stored)
  },

  /** Adiciona um novo usuário */
  addUser(user: User): void {
    const all = this.getAllUsers()
    this.saveAllUsers([...all, user])
  },

  /** Atualiza campos de um usuário existente */
  updateUser(id: string, changes: Partial<User>): void {
    const all = this.getAllUsers()
    this.saveAllUsers(all.map((u) => (u.id === id ? { ...u, ...changes } : u)))
  },

  // ── Sessão ────────────────────────────────────────────────

  /** Retorna o usuário da sessão atual (sem senha), ou null se não há sessão */
  getSession(): SafeUser | null {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  },

  /** Persiste a sessão do usuário logado */
  saveSession(user: SafeUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  },

  /** Remove a sessão (logout) */
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY)
  },
}
