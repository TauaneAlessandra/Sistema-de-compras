// ============================================================
// domain/workflow.ts — Regras de transição de status
//
// Este módulo centraliza toda a lógica de fluxo do domínio:
// - quais transições são válidas
// - qual o próximo status dado um evento
// - predicados de permissão por etapa
//
// Funções puras: sem dependência de React, context ou storage.
// Testáveis de forma isolada.
// ============================================================

import { RequestStatus, UserRole } from '../types'

// Máximo de cotações por solicitação (regra de negócio)
export const MAX_QUOTATIONS = 3

// ── Predicados de estado ────────────────────────────────────

/** Solicitação pode receber cotações */
export function canAddQuotation(status: RequestStatus, currentCount: number): boolean {
  return status === 'pending_quotation' && currentCount < MAX_QUOTATIONS
}

/** Solicitação pode ter cotação removida */
export function canRemoveQuotation(status: RequestStatus): boolean {
  return status === 'pending_quotation' || status === 'pending_supervisor'
}

/** Solicitação pode ser analisada pelo supervisor */
export function canApproveSupervisor(status: RequestStatus): boolean {
  return status === 'pending_supervisor'
}

/** Solicitação pode ser analisada pelo financeiro */
export function canApproveFinancial(status: RequestStatus): boolean {
  return status === 'pending_financial'
}

// ── Transições de status ────────────────────────────────────

/**
 * Calcula o próximo status após adicionar uma cotação.
 * Ao atingir MAX_QUOTATIONS, avança para pending_supervisor.
 */
export function statusAfterAddQuotation(
  current: RequestStatus,
  newCount: number
): RequestStatus {
  if (newCount >= MAX_QUOTATIONS) return 'pending_supervisor'
  return current
}

/**
 * Calcula o próximo status após remover uma cotação.
 * Se ficar abaixo de MAX_QUOTATIONS, reverte para pending_quotation.
 */
export function statusAfterRemoveQuotation(
  current: RequestStatus,
  newCount: number
): RequestStatus {
  if (newCount < MAX_QUOTATIONS) return 'pending_quotation'
  return current
}

/**
 * Calcula o próximo status após decisão do supervisor.
 * approved=true  → pending_financial
 * approved=false → rejected
 */
export function statusAfterSupervisorDecision(approved: boolean): RequestStatus {
  return approved ? 'pending_financial' : 'rejected'
}

/**
 * Calcula o próximo status após decisão do financeiro.
 * approved=true  → approved
 * approved=false → rejected
 */
export function statusAfterFinancialDecision(approved: boolean): RequestStatus {
  return approved ? 'approved' : 'rejected'
}

// ── Permissões por role ────────────────────────────────────

/** Roles que podem criar solicitações */
export function canCreateRequest(role: UserRole): boolean {
  return role === 'requester' || role === 'admin'
}

/** Roles que podem gerenciar cotações */
export function canManageQuotations(role: UserRole): boolean {
  return role === 'buyer' || role === 'admin'
}

/** Roles que podem aprovar na etapa do supervisor */
export function canActAsSupervisor(role: UserRole): boolean {
  return role === 'supervisor' || role === 'admin'
}

/** Roles que podem aprovar na etapa financeira */
export function canActAsFinancial(role: UserRole): boolean {
  return role === 'financial' || role === 'admin'
}

/** Roles que podem gerenciar usuários */
export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}
