// ============================================================
// infrastructure/repositories/ServiceOrderRepository.ts
//
// Persistência de Ordens de Serviço no localStorage.
// O número da OS é gerado a partir do nome do usuário + timestamp:
// Formato: {nome_usuario}_{MM}:{DD}:{YYYY}/{HH}:{mm}:{ss}
// Exemplo: JoaoSilva_04:02:2026/09:30:45
// ============================================================

import { ServiceOrder } from '../../types'

const STORAGE_KEY = 'sc_orders'

export const ServiceOrderRepository = {
  /** Carrega todas as ordens de serviço do storage */
  getAll(): ServiceOrder[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  },

  /** Busca uma OS pelo ID. Retorna null se não encontrada. */
  getById(id: string): ServiceOrder | null {
    return this.getAll().find((o) => o.id === id) ?? null
  },

  /** Busca uma OS pelo requestId. Retorna null se não encontrada. */
  getByRequestId(requestId: string): ServiceOrder | null {
    return this.getAll().find((o) => o.requestId === requestId) ?? null
  },

  /** Adiciona uma nova OS no início do array (mais recente primeiro) */
  add(order: ServiceOrder): void {
    const all = this.getAll()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([order, ...all]))
  },

  /**
   * Gera o número da OS a partir do nome do usuário e do momento atual.
   * Formato: {nome_usuario}_{MM}:{DD}:{YYYY}/{HH}:{mm}:{ss}
   * Exemplo: JoaoSilva_04:02:2026/09:30:45
   *
   * O nome é normalizado: acentos removidos, espaços removidos.
   */
  generateNumber(userName: string): string {
    // Remove acentos (NFD decompõe, então filtramos os diacríticos U+0300–U+036F)
    const name = userName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')

    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const yyyy = now.getFullYear()
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')

    return `${name}_${mm}:${dd}:${yyyy}/${hh}:${min}:${ss}`
  },
}
