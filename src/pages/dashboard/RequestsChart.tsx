// ============================================================
// dashboard/RequestsChart.tsx — Gráfico de barras por período
//
// Exibe a quantidade de solicitações agrupadas por:
// Dia (24 horas), Semana (7 dias), Mês (dias do mês), Ano (12 meses)
//
// Usa a biblioteca "recharts" para renderizar o gráfico.
// ============================================================

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { PurchaseRequest } from '../../types'

// Tipo que representa os 4 períodos possíveis
type Period = 'day' | 'week' | 'month' | 'year'

interface Props {
  requests: PurchaseRequest[]
}

// Configuração dos botões de período no cabeçalho
const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
]

// Cores das três séries do gráfico (abertas, aprovadas, reprovadas)
const STATUS_COLORS = {
  Abertas: '#3b82f6',    // azul
  Aprovadas: '#22c55e',  // verde
  Reprovadas: '#ef4444', // vermelho
}

// Formata uma data para o label do eixo X conforme o período
function fmt(date: Date, period: Period): string {
  if (period === 'day') {
    // Ex: "08h", "14h"
    return `${String(date.getHours()).padStart(2, '0')}h`
  }
  if (period === 'week' || period === 'month') {
    // Ex: "15/01"
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  // Ex: "jan", "fev" (remove o ponto do toLocaleDateString)
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

// Gera todos os "slots" (colunas do gráfico) para o período selecionado.
// Cada slot é um ponto no tempo com uma chave única e um label para exibição.
function buildSlots(period: Period): { key: string; label: string; date: Date }[] {
  const now = new Date()
  const slots: { key: string; label: string; date: Date }[] = []

  if (period === 'day') {
    // 24 slots — um por hora do dia atual
    for (let h = 0; h < 24; h++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h)
      slots.push({ key: String(h), label: `${String(h).padStart(2, '0')}h`, date: d })
    }
  } else if (period === 'week') {
    // 7 slots — últimos 7 dias incluindo hoje
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      d.setHours(0, 0, 0, 0)  // zera horas para comparar apenas a data
      slots.push({ key: d.toDateString(), label: fmt(d, 'week'), date: d })
    }
  } else if (period === 'month') {
    // Todos os dias do mês atual
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day)
      slots.push({ key: `${now.getMonth()}-${day}`, label: fmt(d, 'month'), date: d })
    }
  } else {
    // 12 slots — um por mês do ano atual
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), m, 1)
      slots.push({ key: String(m), label: fmt(d, 'year'), date: d })
    }
  }

  return slots
}

// Retorna a chave do slot correspondente a uma data — deve bater com as chaves do buildSlots
function getSlotKey(date: Date, period: Period): string {
  if (period === 'day') return String(date.getHours())
  if (period === 'week') {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.toDateString()
  }
  if (period === 'month') return `${date.getMonth()}-${date.getDate()}`
  return String(date.getMonth())
}

// Verifica se uma data está dentro do período selecionado
function isInPeriod(date: Date, period: Period): boolean {
  const now = new Date()
  if (period === 'day') {
    // Mesmo dia (sem importar a hora)
    return date.toDateString() === now.toDateString()
  }
  if (period === 'week') {
    // Nos últimos 7 dias
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 6)
    weekAgo.setHours(0, 0, 0, 0)
    return date >= weekAgo
  }
  if (period === 'month') {
    // Mesmo mês e ano
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }
  // Mesmo ano
  return date.getFullYear() === now.getFullYear()
}

export default function RequestsChart({ requests }: Props) {
  // Período selecionado — começa em 'week'
  const [period, setPeriod] = useState<Period>('week')

  // useMemo recalcula chartData apenas quando requests ou period mudam.
  // Evita reprocessar todos os dados em cada render desnecessário.
  const chartData = useMemo(() => {
    const slots = buildSlots(period)

    // Inicializa o mapa com todos os slots zerados
    const map: Record<string, { Abertas: number; Aprovadas: number; Reprovadas: number }> = {}
    slots.forEach(({ key }) => { map[key] = { Abertas: 0, Aprovadas: 0, Reprovadas: 0 } })

    // Distribui cada solicitação no slot correto
    requests.forEach((r) => {
      const d = new Date(r.createdAt)
      if (!isInPeriod(d, period)) return  // fora do período — ignora
      const key = getSlotKey(d, period)
      if (!map[key]) return               // slot não existe — ignora
      if (r.status === 'approved') map[key].Aprovadas++
      else if (r.status === 'rejected') map[key].Reprovadas++
      else map[key].Abertas++             // qualquer outro status = em aberto
    })

    // Converte o mapa para o formato esperado pelo recharts: array de objetos
    return slots.map(({ key, label }) => ({ label, ...map[key] }))
  }, [requests, period])

  // Total de itens no período (para o subtítulo)
  const total = chartData.reduce(
    (acc, d) => acc + d.Abertas + d.Aprovadas + d.Reprovadas, 0,
  )

  // Labels do subtítulo por período
  const periodLabel: Record<Period, string> = {
    day: 'hoje',
    week: 'nos últimos 7 dias',
    month: 'neste mês',
    year: 'neste ano',
  }

  // No mês há muitos dias — mostramos apenas 1 label a cada 4 para não poluir
  const tickInterval = period === 'month' ? 4 : period === 'year' ? 0 : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Cabeçalho: título + seletor de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-semibold text-slate-800">Solicitações por período</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-600">{total}</span> solicitação(ões) {periodLabel[period]}
          </p>
        </div>

        {/* Abas de seleção de período */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'  // aba ativa
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico ou estado vazio */}
      {total === 0 ? (
        // Exibe ícone e mensagem quando não há dados no período
        <div className="flex flex-col items-center justify-center h-52 text-slate-300">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 4-8" />
          </svg>
          <p className="text-sm mt-2 text-slate-400">Nenhum dado para este período</p>
        </div>
      ) : (
        // ResponsiveContainer adapta o gráfico à largura do container pai
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={period === 'month' ? 6 : 14} barGap={2}>
            {/* Grade horizontal tracejada */}
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            {/* Eixo X — usa o campo "label" de cada item do chartData */}
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}  // pula labels para não poluir
            />

            {/* Eixo Y — sem decimais, com largura fixa para alinhar */}
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />

            {/* Tooltip ao passar o mouse sobre as barras */}
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              cursor={{ fill: '#f8fafc' }}
            />

            {/* Legenda das séries */}
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              iconType="circle"
              iconSize={8}
            />

            {/* Três séries de barras — cada uma usa um dataKey do chartData */}
            <Bar dataKey="Abertas" fill={STATUS_COLORS.Abertas} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Aprovadas" fill={STATUS_COLORS.Aprovadas} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Reprovadas" fill={STATUS_COLORS.Reprovadas} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
