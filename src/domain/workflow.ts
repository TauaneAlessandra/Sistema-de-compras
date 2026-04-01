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

// Número mínimo de cotações para avançar para pending_supervisor.
// Não há máximo — o spec permite mais de 3.
export const MIN_QUOTATIONS_TO_ADVANCE = 3

// ── Predicados de estado ────────────────────────────────────

/** Solicitação pode receber cotações */
export function canAddQuotation(status: RequestStatus): boolean {
  return status === 'pending_quotation' || status === 'pending_supervisor'
}

/** Solicitação pode ter cotação removida */
export function canRemoveQuotation(status: RequestStatus): boolean {
  return status === 'pending_quotation' || status === 'pending_supervisor'
}

/** Solicitação pode ser aprovada pelo responsável da área */
export function canApproveArea(status: RequestStatus): boolean {
  return status === 'pending_area_approval'
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
 * Calcula o status inicial de uma solicitação após a criação.
 * Se o solicitante é area_manager, vai direto para pending_quotation.
 * Caso contrário, passa por pending_area_approval.
 */
export function statusAfterCreation(isAreaManager: boolean): RequestStatus {
  return isAreaManager ? 'pending_quotation' : 'pending_area_approval'
}

/**
 * Calcula o próximo status após decisão do responsável da área.
 * approved=true  → pending_quotation
 * approved=false → rejected
 */
export function statusAfterAreaDecision(approved: boolean): RequestStatus {
  return approved ? 'pending_quotation' : 'rejected'
}

/**
 * Calcula o próximo status após adicionar uma cotação.
 * Ao atingir MIN_QUOTATIONS_TO_ADVANCE a partir de pending_quotation, avança para pending_supervisor.
 * Se já estiver em pending_supervisor (cotação extra), permanece lá.
 */
export function statusAfterAddQuotation(
  current: RequestStatus,
  newCount: number
): RequestStatus {
  if (current === 'pending_quotation' && newCount >= MIN_QUOTATIONS_TO_ADVANCE) {
    return 'pending_supervisor'
  }
  return current
}

/**
 * Calcula o próximo status após remover uma cotação.
 * Se ficar abaixo de MIN_QUOTATIONS_TO_ADVANCE, reverte para pending_quotation.
 */
export function statusAfterRemoveQuotation(
  current: RequestStatus,
  newCount: number
): RequestStatus {
  if (newCount < MIN_QUOTATIONS_TO_ADVANCE) return 'pending_quotation'
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

/**
 * Calcula o próximo status após confirmação de estoque pelo comprador.
 * Sempre retorna fulfilled_by_stock.
 */
export function statusAfterStockConfirmation(): RequestStatus {
  return 'fulfilled_by_stock'
}

// ── Permissões por role ────────────────────────────────────

/** Roles que podem criar solicitações */
export function canCreateRequest(role: UserRole): boolean {
  return role === 'requester' || role === 'area_manager' || role === 'admin'
}

/** Roles que podem aprovar na etapa da área */
export function canActAsAreaManager(role: UserRole): boolean {
  return role === 'area_manager' || role === 'admin'
}

/** Roles que podem gerenciar cotações */
export function canManageQuotations(role: UserRole): boolean {
  return role === 'buyer' || role === 'admin'
}

/** Roles que podem confirmar estoque disponível */
export function canConfirmStock(role: UserRole): boolean {
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
