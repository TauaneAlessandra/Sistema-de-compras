import { describe, it, expect } from 'vitest'
import {
  canAddQuotation,
  canRemoveQuotation,
  canApproveSupervisor,
  canApproveFinancial,
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
  canCreateRequest,
  canManageQuotations,
  canActAsSupervisor,
  canActAsFinancial,
  canManageUsers,
  MAX_QUOTATIONS,
} from './workflow'

// ── TASK-012: Testes de regras do workflow ──────────────────

describe('statusAfterAddQuotation', () => {
  it('permanece em pending_quotation enquanto tiver menos de 3 cotações', () => {
    expect(statusAfterAddQuotation('pending_quotation', 1)).toBe('pending_quotation')
    expect(statusAfterAddQuotation('pending_quotation', 2)).toBe('pending_quotation')
  })

  it('avança para pending_supervisor ao atingir 3 cotações', () => {
    expect(statusAfterAddQuotation('pending_quotation', 3)).toBe('pending_supervisor')
  })

  it('avança para pending_supervisor se count exceder MAX_QUOTATIONS', () => {
    expect(statusAfterAddQuotation('pending_quotation', MAX_QUOTATIONS)).toBe('pending_supervisor')
  })
})

describe('statusAfterRemoveQuotation', () => {
  it('reverte para pending_quotation se cair abaixo de 3 cotações', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 2)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 0)).toBe('pending_quotation')
  })

  it('mantém o status atual se ainda tiver 3 ou mais cotações', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 3)).toBe('pending_supervisor')
  })
})

describe('statusAfterSupervisorDecision', () => {
  it('aprovação leva para pending_financial', () => {
    expect(statusAfterSupervisorDecision(true)).toBe('pending_financial')
  })

  it('reprovação leva para rejected', () => {
    expect(statusAfterSupervisorDecision(false)).toBe('rejected')
  })
})

describe('statusAfterFinancialDecision', () => {
  it('aprovação leva para approved', () => {
    expect(statusAfterFinancialDecision(true)).toBe('approved')
  })

  it('reprovação leva para rejected', () => {
    expect(statusAfterFinancialDecision(false)).toBe('rejected')
  })
})

// ── TASK-012: Predicados de estado ─────────────────────────

describe('canAddQuotation', () => {
  it('permite adicionar em pending_quotation com menos de 3 cotações', () => {
    expect(canAddQuotation('pending_quotation', 0)).toBe(true)
    expect(canAddQuotation('pending_quotation', 2)).toBe(true)
  })

  it('bloqueia adicionar quando já tem 3 cotações', () => {
    expect(canAddQuotation('pending_quotation', 3)).toBe(false)
  })

  it('bloqueia adicionar em outros status', () => {
    expect(canAddQuotation('pending_supervisor', 2)).toBe(false)
    expect(canAddQuotation('approved', 0)).toBe(false)
    expect(canAddQuotation('rejected', 0)).toBe(false)
  })
})

describe('canRemoveQuotation', () => {
  it('permite remover em pending_quotation', () => {
    expect(canRemoveQuotation('pending_quotation')).toBe(true)
  })

  it('permite remover em pending_supervisor (reversão de status)', () => {
    expect(canRemoveQuotation('pending_supervisor')).toBe(true)
  })

  it('bloqueia remover em estados finais ou avançados', () => {
    expect(canRemoveQuotation('pending_financial')).toBe(false)
    expect(canRemoveQuotation('approved')).toBe(false)
    expect(canRemoveQuotation('rejected')).toBe(false)
  })
})

describe('canApproveSupervisor', () => {
  it('permite agir apenas em pending_supervisor', () => {
    expect(canApproveSupervisor('pending_supervisor')).toBe(true)
  })

  it('bloqueia em qualquer outro status', () => {
    expect(canApproveSupervisor('pending_quotation')).toBe(false)
    expect(canApproveSupervisor('pending_financial')).toBe(false)
    expect(canApproveSupervisor('approved')).toBe(false)
    expect(canApproveSupervisor('rejected')).toBe(false)
  })
})

describe('canApproveFinancial', () => {
  it('permite agir apenas em pending_financial', () => {
    expect(canApproveFinancial('pending_financial')).toBe(true)
  })

  it('bloqueia em qualquer outro status', () => {
    expect(canApproveFinancial('pending_quotation')).toBe(false)
    expect(canApproveFinancial('pending_supervisor')).toBe(false)
    expect(canApproveFinancial('approved')).toBe(false)
    expect(canApproveFinancial('rejected')).toBe(false)
  })
})

// ── TASK-013: Testes de permissões por role ─────────────────

describe('canCreateRequest', () => {
  it('permite requester e admin', () => {
    expect(canCreateRequest('requester')).toBe(true)
    expect(canCreateRequest('admin')).toBe(true)
  })

  it('bloqueia buyer, supervisor e financial', () => {
    expect(canCreateRequest('buyer')).toBe(false)
    expect(canCreateRequest('supervisor')).toBe(false)
    expect(canCreateRequest('financial')).toBe(false)
  })
})

describe('canManageQuotations', () => {
  it('permite buyer e admin', () => {
    expect(canManageQuotations('buyer')).toBe(true)
    expect(canManageQuotations('admin')).toBe(true)
  })

  it('bloqueia requester, supervisor e financial', () => {
    expect(canManageQuotations('requester')).toBe(false)
    expect(canManageQuotations('supervisor')).toBe(false)
    expect(canManageQuotations('financial')).toBe(false)
  })
})

describe('canActAsSupervisor', () => {
  it('permite supervisor e admin', () => {
    expect(canActAsSupervisor('supervisor')).toBe(true)
    expect(canActAsSupervisor('admin')).toBe(true)
  })

  it('bloqueia requester, buyer e financial', () => {
    expect(canActAsSupervisor('requester')).toBe(false)
    expect(canActAsSupervisor('buyer')).toBe(false)
    expect(canActAsSupervisor('financial')).toBe(false)
  })
})

describe('canActAsFinancial', () => {
  it('permite financial e admin', () => {
    expect(canActAsFinancial('financial')).toBe(true)
    expect(canActAsFinancial('admin')).toBe(true)
  })

  it('bloqueia requester, buyer e supervisor', () => {
    expect(canActAsFinancial('requester')).toBe(false)
    expect(canActAsFinancial('buyer')).toBe(false)
    expect(canActAsFinancial('supervisor')).toBe(false)
  })
})

describe('canManageUsers', () => {
  it('permite somente admin', () => {
    expect(canManageUsers('admin')).toBe(true)
  })

  it('bloqueia todos os outros perfis', () => {
    expect(canManageUsers('requester')).toBe(false)
    expect(canManageUsers('buyer')).toBe(false)
    expect(canManageUsers('supervisor')).toBe(false)
    expect(canManageUsers('financial')).toBe(false)
  })
})
