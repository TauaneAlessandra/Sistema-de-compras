// ============================================================
// infrastructure/repositories/PurchaseRequestRepository.ts
//
// Encapsula toda a persistência de solicitações de compra.
// O DataContext usa este repositório em vez de acessar
// o localStorage diretamente.
//
// Benefício: trocar localStorage por uma API REST no futuro
// exige alterar apenas este arquivo.
// ============================================================

import { PurchaseRequest } from '../../types'

const STORAGE_KEY = 'sc_requests'

export const PurchaseRequestRepository = {
  /** Carrega todas as solicitações do storage */
  getAll(): PurchaseRequest[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  },

  /** Busca uma solicitação pelo ID. Retorna null se não encontrada. */
  getById(id: string): PurchaseRequest | null {
    return this.getAll().find((r) => r.id === id) ?? null
  },

  /** Persiste o array completo de solicitações */
  saveAll(requests: PurchaseRequest[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  },

  /** Adiciona uma nova solicitação no início do array (mais recente primeiro) */
  add(request: PurchaseRequest): void {
    const all = this.getAll()
    this.saveAll([request, ...all])
  },

  /** Atualiza uma solicitação existente pelo ID */
  update(id: string, changes: Partial<PurchaseRequest>): void {
    const all = this.getAll()
    this.saveAll(all.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  },
}
