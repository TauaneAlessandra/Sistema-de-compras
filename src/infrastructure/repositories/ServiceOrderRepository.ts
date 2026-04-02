// ============================================================
// infrastructure/repositories/ServiceOrderRepository.ts
//
// Persistência de Ordens de Serviço no localStorage.
// O contador sequencial (sc_os_counter) garante numeração
// única e incremental por ano: OS-2026-001, OS-2026-002...
// ============================================================

import { ServiceOrder } from '../../types'

const STORAGE_KEY = 'sc_orders'
const COUNTER_KEY = 'sc_os_counter'

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
   * Gera o próximo número de OS no formato OS-YYYY-NNN.
   * O contador persiste no localStorage para sobreviver a reloads.
   */
  nextNumber(): string {
    const current = Number(localStorage.getItem(COUNTER_KEY) ?? '0') + 1
    localStorage.setItem(COUNTER_KEY, String(current))
    const year = new Date().getFullYear()
    return `OS-${year}-${String(current).padStart(3, '0')}`
  },
}
