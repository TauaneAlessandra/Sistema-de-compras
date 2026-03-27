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

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, SafeUser, UserRole } from '../types'

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
  // Estado do usuário logado (sem senha)
  const [user, setUser] = useState<SafeUser | null>(null)
  // Estado da lista completa de usuários
  const [users, setUsers] = useState<User[]>([])

  // useEffect com [] roda apenas uma vez, quando o componente monta.
  // Aqui carregamos os dados salvos no localStorage.
  useEffect(() => {
    // Tenta carregar usuários do localStorage
    const stored = localStorage.getItem('sc_users')
    if (!stored) {
      // Primeira vez rodando: salva os usuários padrão
      localStorage.setItem('sc_users', JSON.stringify(DEFAULT_USERS))
      setUsers(DEFAULT_USERS)
    } else {
      // Já existe dados salvos: carrega do localStorage
      setUsers(JSON.parse(stored))
    }

    // Verifica se havia uma sessão salva (usuário já estava logado)
    const storedUser = localStorage.getItem('sc_current_user')
    if (storedUser) setUser(JSON.parse(storedUser))
  }, [])

  // Função de login — valida email, senha e se o usuário está ativo
  function login(email: string, password: string) {
    // Sempre lê direto do localStorage para ter dados atualizados
    const allUsers: User[] = JSON.parse(localStorage.getItem('sc_users') || '[]')
    const found = allUsers.find((u) => u.email === email && u.password === password && u.active)

    if (found) {
      // Desestruturação com renaming: remove a senha e guarda o restante em safeUser
      // "{ password: _pw, ...safeUser }" = pega password (chama de _pw para ignorar)
      // e o spread (...safeUser) pega todos os outros campos
      const { password: _pw, ...safeUser } = found
      setUser(safeUser)
      // Salva a sessão no localStorage para persistir após F5
      localStorage.setItem('sc_current_user', JSON.stringify(safeUser))
      return { success: true }
    }
    return { success: false, message: 'Email ou senha inválidos.' }
  }

  // Logout: limpa o estado e remove a sessão do localStorage
  function logout() {
    setUser(null)
    localStorage.removeItem('sc_current_user')
  }

  // Função auxiliar: salva a lista de usuários no localStorage E no state
  function saveUsers(updated: User[]) {
    localStorage.setItem('sc_users', JSON.stringify(updated))
    setUsers(updated)
  }

  // Adiciona um novo usuário — verifica se o email já existe antes
  // Omit<User, 'id' | 'active' | 'createdAt'> significa: recebe o User sem esses 3 campos
  // (eles são gerados automaticamente aqui)
  function addUser(data: Omit<User, 'id' | 'active' | 'createdAt'>) {
    const allUsers: User[] = JSON.parse(localStorage.getItem('sc_users') || '[]')
    const exists = allUsers.find((u) => u.email === data.email)
    if (exists) return { success: false, message: 'Email já cadastrado.' }
    const newUser: User = {
      ...data,                           // spread: copia todos os campos de data
      id: crypto.randomUUID(),           // gera ID único universal
      active: true,
      createdAt: new Date().toISOString(),
    }
    saveUsers([...allUsers, newUser])    // adiciona ao final do array existente
    return { success: true }
  }

  // Atualiza campos de um usuário existente
  // Partial<User> significa: qualquer subconjunto dos campos de User
  function updateUser(id: string, data: Partial<User>) {
    const allUsers: User[] = JSON.parse(localStorage.getItem('sc_users') || '[]')
    // map: percorre o array e retorna um novo array
    // Se o id bate, mescla os dados novos; senão, retorna o usuário sem alteração
    saveUsers(allUsers.map((u) => (u.id === id ? { ...u, ...data } : u)))
    return { success: true }
  }

  // "Deletar" na verdade desativa o usuário (soft delete)
  // Isso preserva o histórico das solicitações que ele criou
  function deleteUser(id: string) {
    const allUsers: User[] = JSON.parse(localStorage.getItem('sc_users') || '[]')
    saveUsers(allUsers.map((u) => (u.id === id ? { ...u, active: false } : u)))
  }

  // Força a releitura dos usuários do localStorage para o state
  function refreshUsers() {
    setUsers(JSON.parse(localStorage.getItem('sc_users') || '[]'))
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
