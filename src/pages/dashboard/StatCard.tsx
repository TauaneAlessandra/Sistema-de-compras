// ============================================================
// dashboard/StatCard.tsx — Card de estatística clicável
//
// Exibe um número grande com título e ícone.
// Quando clicável (onClick passado), aplica borda azul se selecionado.
// Usado no Dashboard para filtrar as solicitações por status.
// ============================================================

import { ReactNode } from 'react'

interface Props {
  title: string      // Texto abaixo do número
  value: number      // Número em destaque
  icon: ReactNode    // Ícone da esquerda
  color: string      // Classe de cor de fundo do ícone (Tailwind)
  selected?: boolean // Se o card está selecionado (filtro ativo)
  onClick?: () => void // Função chamada ao clicar
}

export default function StatCard({ title, value, icon, color, selected, onClick }: Props) {
  return (
    // Usando <button> em vez de <div> para ser acessível (teclado, leitores de tela)
    // w-full text-left garante que o botão ocupe toda a largura e alinhe o texto à esquerda
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 flex items-center gap-4 w-full text-left transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'  // estilo quando selecionado
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Ícone com fundo colorido */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        {/* Número principal em destaque */}
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </button>
  )
}
