// ============================================================
// AuthContext.tsx — Contexto de autenticação
//
// Context API do React é uma forma de ter "estado global":
// dados acessíveis em qualquer componente da árvore sem
// precisar passar props de pai para filho.
//
// Este contexto gerencia:
// - Usuário logado (user)
// - Lista de usuários cadastrados (users)
// - Funções de login, logout e CRUD de usuários
// ============================================================

import { createContext, useContext, useState, ReactNode } from 'react'
import { User, SafeUser } from '../types'
import { AuthRepository } from '../infrastructure/repositories/AuthRepository'

// Define quais dados e funções o contexto vai expor.
// Outros componentes que usarem useAuth() terão acesso a tudo isso.
interface AuthContextValue {
  user: SafeUser | null   // null = ninguém logado
  users: User[]
  login: (email: string, password: string) => { success: boolean; message?: string }
  logout: () => void
  addUser: (data: Omit<User, 'id' | 'active' | 'createdAt'>) => { success: boolean; message?: string }
  updateUser: (id: string, data: Partial<User>) => { success: boolean }
  deleteUser: (id: string) => void
  refreshUsers: () => void
}

// createContext cria o "container" do contexto.
// O valor inicial é null — será preenchido pelo Provider.
const AuthContext = createContext<AuthContextValue | null>(null)

// Usuários padrão carregados na primeira vez que o sistema roda.
// Se já houver dados no localStorage, esses são ignorados.
const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Administrador', email: 'admin@empresa.com', password: '123456', role: 'admin', active: true, createdAt: new Date().toISOString() },
  { id: '2', name: 'João Solicitante', email: 'joao@empresa.com', password: '123456', role: 'requester', active: true, createdAt: new Date().toISOString() },
  { id: '3', name: 'Maria Compradora', email: 'maria@empresa.com', password: '123456', role: 'buyer', active: true, createdAt: new Date().toISOString() },
  { id: '4', name: 'Carlos Supervisor', email: 'carlos@empresa.com', password: '123456', role: 'supervisor', active: true, createdAt: new Date().toISOString() },
  { id: '5', name: 'Ana Financeiro', email: 'ana@empresa.com', password: '123456', role: 'financial', active: true, createdAt: new Date().toISOString() },
]

// O Provider é o componente que "envolve" a aplicação e fornece o contexto.
// { children } representa todos os componentes filhos que ele envolve.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado do usuário logado (sem senha) — inicializado via repositório
  const [user, setUser] = useState<SafeUser | null>(() => AuthRepository.getSession())

  // Estado da lista completa de usuários — inicializa com defaults se necessário
  const [users, setUsers] = useState<User[]>(() =>
    AuthRepository.initializeIfEmpty(DEFAULT_USERS)
  )

  // Função de login — valida email, senha e se o usuário está ativo
  function login(email: string, password: string) {
    const allUsers = AuthRepository.getAllUsers()
    const found = allUsers.find((u) => u.email === email && u.password === password && u.active)

    if (found) {
      // Desestruturação com renaming: remove a senha e guarda o restante em safeUser
      const { password: _pw, ...safeUser } = found
      setUser(safeUser)
      AuthRepository.saveSession(safeUser)
      return { success: true }
    }
    return { success: false, message: 'Email ou senha inválidos.' }
  }

  // Logout: limpa o estado e remove a sessão
  function logout() {
    setUser(null)
    AuthRepository.clearSession()
  }

  // Função auxiliar: persiste usuários via repositório e atualiza o state
  function saveUsers(updated: User[]) {
    AuthRepository.saveAllUsers(updated)
    setUsers(updated)
  }

  // Adiciona um novo usuário — verifica se o email já existe antes
  function addUser(data: Omit<User, 'id' | 'active' | 'createdAt'>) {
    const allUsers = AuthRepository.getAllUsers()
    const exists = allUsers.find((u) => u.email === data.email)
    if (exists) return { success: false, message: 'Email já cadastrado.' }
    const newUser: User = {
      ...data,
      id: crypto.randomUUID(),
      active: true,
      createdAt: new Date().toISOString(),
    }
    saveUsers([...allUsers, newUser])
    return { success: true }
  }

  // Atualiza campos de um usuário existente
  function updateUser(id: string, data: Partial<User>) {
    const allUsers = AuthRepository.getAllUsers()
    saveUsers(allUsers.map((u) => (u.id === id ? { ...u, ...data } : u)))
    return { success: true }
  }

  // "Deletar" na verdade desativa o usuário (soft delete)
  // Isso preserva o histórico das solicitações que ele criou
  function deleteUser(id: string) {
    const allUsers = AuthRepository.getAllUsers()
    saveUsers(allUsers.map((u) => (u.id === id ? { ...u, active: false } : u)))
  }

  // Força a releitura dos usuários do repositório para o state
  function refreshUsers() {
    setUsers(AuthRepository.getAllUsers())
  }

  // O Provider envolve os filhos e passa o valor do contexto
  return (
    <AuthContext.Provider value={{ user, users, login, logout, addUser, updateUser, deleteUser, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook customizado — simplifica o uso do contexto nos componentes.
// Em vez de: const ctx = useContext(AuthContext); ctx.user ...
// Usamos: const { user } = useAuth()
// O throw garante que o hook só seja usado dentro do AuthProvider.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
