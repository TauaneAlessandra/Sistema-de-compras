// ============================================================
// pages/login/index.tsx — Tela de login
//
// Primeira tela do sistema. O usuário informa email e senha
// e ao submeter o formulário, chama login() do AuthContext.
// ============================================================

import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShoppingCart, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()         // pega a função login do contexto
  const navigate = useNavigate()       // para redirecionar após o login

  // Estado do formulário — um objeto com os dois campos
  const [form, setForm] = useState({ email: '', password: '' })
  // Controla se a senha está visível ou como "••••"
  const [showPass, setShowPass] = useState(false)
  // Mensagem de erro exibida quando o login falha
  const [error, setError] = useState('')
  // Controla o estado de "carregando" enquanto processa
  const [loading, setLoading] = useState(false)

  // FormEvent é o tipo correto para o evento de submit de formulário no React
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()   // evita o comportamento padrão (recarregar a página)
    setError('')          // limpa erros anteriores
    setLoading(true)

    // Simulação de delay de rede (400ms) para UX mais natural
    await new Promise((r) => setTimeout(r, 400))

    const result = login(form.email, form.password)
    setLoading(false)

    if (result.success) {
      navigate('/dashboard')  // login OK → vai para o dashboard
    } else {
      // O operador "??" fornece um valor padrão caso result.message seja undefined
      setError(result.message ?? 'Erro ao fazer login.')
    }
  }

  return (
    // Tela cheia com gradiente azul + centralização vertical e horizontal
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <ShoppingCart size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">SisCompras</h1>
          <p className="text-blue-200 mt-1 text-sm">Sistema de Gestão de Compras</p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Bem-vindo!</h2>
          <p className="text-slate-500 text-sm mb-6">Faça login para acessar o sistema</p>

          {/* Exibe mensagem de erro quando existe */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                // Spread mantém os outros campos e sobrescreve só o email
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Campo Senha com botão de mostrar/ocultar */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                {/* type="password" mostra "••••", type="text" mostra o texto */}
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                {/* Botão posicionado absolutamente dentro do input */}
                <button
                  type="button"  // type="button" para não submeter o form
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão de submit — desabilitado durante o loading */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Caixa de ajuda com usuários de teste */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2">Usuários de teste:</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-medium">Admin:</span> admin@empresa.com</p>
              <p><span className="font-medium">Solicitante:</span> joao@empresa.com</p>
              <p><span className="font-medium">Comprador:</span> maria@empresa.com</p>
              <p><span className="font-medium">Supervisor:</span> carlos@empresa.com</p>
              <p><span className="font-medium">Financeiro:</span> ana@empresa.com</p>
              <p className="text-slate-400 mt-1">Senha de todos: 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
