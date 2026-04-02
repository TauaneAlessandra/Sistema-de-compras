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

// ── Tabela declarativa de transições (Seção 10 do design) ───
//
// Mapeia cada evento de domínio ao seu estado de origem,
// estado de destino e guarda opcional.
// Serve como documentação executável e pode ser usada por
// qualquer mecanismo que precise validar transições em tempo
// de execução ou gerar relatórios de fluxo.

export type DomainEvent =
  | 'REQUEST_CREATED'
  | 'AREA_APPROVED'
  | 'AREA_REJECTED'
  | 'QUOTATION_ADDED'
  | 'QUOTATION_THRESHOLD_REACHED'
  | 'QUOTATION_REMOVED'
  | 'QUOTATION_BELOW_THRESHOLD'
  | 'STOCK_CONFIRMED'
  | 'SUPERVISOR_APPROVED'
  | 'SUPERVISOR_REJECTED'
  | 'FINANCIAL_APPROVED'
  | 'FINANCIAL_REJECTED'

export type TransitionRule = {
  from: RequestStatus
  event: DomainEvent
  to: RequestStatus
  guard?: (ctx: { validQuotationsCount?: number }) => boolean
}

export const TRANSITIONS: TransitionRule[] = [
  // Criação → área ou cotação (dependendo do perfil do solicitante)
  { from: 'draft', event: 'AREA_APPROVED',    to: 'pending_area_approval' }, // n/a: placeholder para not-area-manager
  { from: 'draft', event: 'QUOTATION_ADDED',  to: 'pending_quotation' },     // via submit (area_manager)

  // Aprovação de área
  { from: 'pending_area_approval', event: 'AREA_APPROVED', to: 'pending_quotation' },
  { from: 'pending_area_approval', event: 'AREA_REJECTED', to: 'rejected' },

  // Cotações
  {
    from: 'pending_quotation',
    event: 'QUOTATION_THRESHOLD_REACHED',
    to: 'pending_supervisor',
    guard: (ctx) => (ctx.validQuotationsCount ?? 0) >= MIN_QUOTATIONS_TO_ADVANCE,
  },
  {
    from: 'pending_supervisor',
    event: 'QUOTATION_BELOW_THRESHOLD',
    to: 'pending_quotation',
    guard: (ctx) => (ctx.validQuotationsCount ?? 0) < MIN_QUOTATIONS_TO_ADVANCE,
  },

  // Estoque
  { from: 'pending_quotation',  event: 'STOCK_CONFIRMED', to: 'fulfilled_by_stock' },
  { from: 'pending_supervisor', event: 'STOCK_CONFIRMED', to: 'fulfilled_by_stock' },

  // Supervisor
  { from: 'pending_supervisor', event: 'SUPERVISOR_APPROVED', to: 'pending_financial' },
  { from: 'pending_supervisor', event: 'SUPERVISOR_REJECTED', to: 'rejected' },

  // Financeiro
  { from: 'pending_financial', event: 'FINANCIAL_APPROVED', to: 'approved' },
  { from: 'pending_financial', event: 'FINANCIAL_REJECTED', to: 'rejected' },
]

/** Encontra a regra de transição para um dado estado + evento. */
export function findTransition(
  from: RequestStatus,
  event: DomainEvent
): TransitionRule | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.event === event)
}

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
 * Status inicial de qualquer solicitação criada: sempre 'draft'.
 * O solicitante precisa submeter explicitamente para avançar no fluxo.
 */
export function statusAfterCreation(): RequestStatus {
  return 'draft'
}

/**
 * Calcula o próximo status após o solicitante submeter o rascunho.
 * Se o solicitante é area_manager, vai direto para pending_quotation.
 * Caso contrário, passa por pending_area_approval.
 */
export function statusAfterSubmission(isAreaManager: boolean): RequestStatus {
  return isAreaManager ? 'pending_quotation' : 'pending_area_approval'
}

/** Uma solicitação em rascunho pode ser submetida pelo seu criador */
export function canSubmitRequest(status: RequestStatus): boolean {
  return status === 'draft'
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
