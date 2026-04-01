import { describe, it, expect } from 'vitest'
import {
  canAddQuotation,
  canRemoveQuotation,
  canApproveArea,
  canApproveSupervisor,
  canApproveFinancial,
  statusAfterCreation,
  statusAfterAreaDecision,
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
  statusAfterStockConfirmation,
  canCreateRequest,
  canActAsAreaManager,
  canManageQuotations,
  canConfirmStock,
  canActAsSupervisor,
  canActAsFinancial,
  canManageUsers,
  MIN_QUOTATIONS_TO_ADVANCE,
} from './workflow'
import type { AuditEvent, AuditEventType } from '../types'

// ── Transições de status ────────────────────────────────────

describe('statusAfterCreation', () => {
  it('vai para pending_quotation quando solicitante é area_manager', () => {
    expect(statusAfterCreation(true)).toBe('pending_quotation')
  })

  it('vai para pending_area_approval quando solicitante não é area_manager', () => {
    expect(statusAfterCreation(false)).toBe('pending_area_approval')
  })
})

describe('statusAfterAreaDecision', () => {
  it('aprovação leva para pending_quotation', () => {
    expect(statusAfterAreaDecision(true)).toBe('pending_quotation')
  })

  it('reprovação leva para rejected', () => {
    expect(statusAfterAreaDecision(false)).toBe('rejected')
  })
})

describe('statusAfterAddQuotation', () => {
  it('permanece em pending_quotation enquanto tiver menos de 3 cotações', () => {
    expect(statusAfterAddQuotation('pending_quotation', 1)).toBe('pending_quotation')
    expect(statusAfterAddQuotation('pending_quotation', 2)).toBe('pending_quotation')
  })

  it('avança para pending_supervisor ao atingir MIN_QUOTATIONS_TO_ADVANCE', () => {
    expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE)).toBe('pending_supervisor')
  })

  it('permanece em pending_supervisor ao adicionar cotação extra (mais de 3 permitido)', () => {
    expect(statusAfterAddQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 5)).toBe('pending_supervisor')
  })
})

describe('statusAfterRemoveQuotation', () => {
  it('reverte para pending_quotation se cair abaixo de 3 cotações', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 2)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 0)).toBe('pending_quotation')
  })

  it('mantém o status atual se ainda tiver 3 ou mais cotações', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 3)).toBe('pending_supervisor')
    expect(statusAfterRemoveQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
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

// ── Predicados de estado ────────────────────────────────────

describe('canAddQuotation', () => {
  it('permite adicionar em pending_quotation', () => {
    expect(canAddQuotation('pending_quotation')).toBe(true)
  })

  it('permite adicionar em pending_supervisor (cotação extra)', () => {
    expect(canAddQuotation('pending_supervisor')).toBe(true)
  })

  it('bloqueia adicionar em outros status', () => {
    expect(canAddQuotation('created')).toBe(false)
    expect(canAddQuotation('pending_area_approval')).toBe(false)
    expect(canAddQuotation('pending_financial')).toBe(false)
    expect(canAddQuotation('approved')).toBe(false)
    expect(canAddQuotation('rejected')).toBe(false)
    expect(canAddQuotation('fulfilled_by_stock')).toBe(false)
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
    expect(canRemoveQuotation('fulfilled_by_stock')).toBe(false)
  })
})

describe('canApproveArea', () => {
  it('permite agir apenas em pending_area_approval', () => {
    expect(canApproveArea('pending_area_approval')).toBe(true)
  })

  it('bloqueia em qualquer outro status', () => {
    expect(canApproveArea('created')).toBe(false)
    expect(canApproveArea('pending_quotation')).toBe(false)
    expect(canApproveArea('pending_supervisor')).toBe(false)
    expect(canApproveArea('approved')).toBe(false)
    expect(canApproveArea('rejected')).toBe(false)
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

// ── Permissões por role ────────────────────────────────────

describe('canCreateRequest', () => {
  it('permite requester, area_manager e admin', () => {
    expect(canCreateRequest('requester')).toBe(true)
    expect(canCreateRequest('area_manager')).toBe(true)
    expect(canCreateRequest('admin')).toBe(true)
  })

  it('bloqueia buyer, supervisor e financial', () => {
    expect(canCreateRequest('buyer')).toBe(false)
    expect(canCreateRequest('supervisor')).toBe(false)
    expect(canCreateRequest('financial')).toBe(false)
  })
})

describe('canActAsAreaManager', () => {
  it('permite area_manager e admin', () => {
    expect(canActAsAreaManager('area_manager')).toBe(true)
    expect(canActAsAreaManager('admin')).toBe(true)
  })

  it('bloqueia requester, buyer, supervisor e financial', () => {
    expect(canActAsAreaManager('requester')).toBe(false)
    expect(canActAsAreaManager('buyer')).toBe(false)
    expect(canActAsAreaManager('supervisor')).toBe(false)
    expect(canActAsAreaManager('financial')).toBe(false)
  })
})

describe('canManageQuotations', () => {
  it('permite buyer e admin', () => {
    expect(canManageQuotations('buyer')).toBe(true)
    expect(canManageQuotations('admin')).toBe(true)
  })

  it('bloqueia requester, area_manager, supervisor e financial', () => {
    expect(canManageQuotations('requester')).toBe(false)
    expect(canManageQuotations('area_manager')).toBe(false)
    expect(canManageQuotations('supervisor')).toBe(false)
    expect(canManageQuotations('financial')).toBe(false)
  })
})

describe('canConfirmStock', () => {
  it('permite buyer e admin', () => {
    expect(canConfirmStock('buyer')).toBe(true)
    expect(canConfirmStock('admin')).toBe(true)
  })

  it('bloqueia requester, area_manager, supervisor e financial', () => {
    expect(canConfirmStock('requester')).toBe(false)
    expect(canConfirmStock('area_manager')).toBe(false)
    expect(canConfirmStock('supervisor')).toBe(false)
    expect(canConfirmStock('financial')).toBe(false)
  })
})

describe('canActAsSupervisor', () => {
  it('permite supervisor e admin', () => {
    expect(canActAsSupervisor('supervisor')).toBe(true)
    expect(canActAsSupervisor('admin')).toBe(true)
  })

  it('bloqueia requester, area_manager, buyer e financial', () => {
    expect(canActAsSupervisor('requester')).toBe(false)
    expect(canActAsSupervisor('area_manager')).toBe(false)
    expect(canActAsSupervisor('buyer')).toBe(false)
    expect(canActAsSupervisor('financial')).toBe(false)
  })
})

describe('canActAsFinancial', () => {
  it('permite financial e admin', () => {
    expect(canActAsFinancial('financial')).toBe(true)
    expect(canActAsFinancial('admin')).toBe(true)
  })

  it('bloqueia requester, area_manager, buyer e supervisor', () => {
    expect(canActAsFinancial('requester')).toBe(false)
    expect(canActAsFinancial('area_manager')).toBe(false)
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
    expect(canManageUsers('area_manager')).toBe(false)
    expect(canManageUsers('buyer')).toBe(false)
    expect(canManageUsers('supervisor')).toBe(false)
    expect(canManageUsers('financial')).toBe(false)
  })
})

// ── T15: statusAfterStockConfirmation ──────────────────────

describe('statusAfterStockConfirmation', () => {
  it('retorna fulfilled_by_stock', () => {
    expect(statusAfterStockConfirmation()).toBe('fulfilled_by_stock')
  })
})

// ── T16: AuditEvent — estrutura do tipo ────────────────────

describe('AuditEvent type', () => {
  it('aceita todos os campos obrigatórios', () => {
    const event: AuditEvent = {
      id: 'abc-123',
      type: 'created',
      actorId: 'user-1',
      actorName: 'Ana',
      actorRole: 'requester',
      timestamp: new Date().toISOString(),
    }
    expect(event.id).toBe('abc-123')
    expect(event.type).toBe('created')
    expect(event.actorRole).toBe('requester')
    expect(event.observation).toBeUndefined()
    expect(event.metadata).toBeUndefined()
  })

  it('aceita campos opcionais observation e metadata', () => {
    const event: AuditEvent = {
      id: 'xyz',
      type: 'quotation_added',
      actorId: 'buyer-1',
      actorName: 'Carlos',
      actorRole: 'buyer',
      timestamp: new Date().toISOString(),
      observation: 'Cotação do fornecedor X',
      metadata: { quotationId: 'q-1', supplier: 'Fornecedor X' },
    }
    expect(event.observation).toBe('Cotação do fornecedor X')
    expect(event.metadata?.supplier).toBe('Fornecedor X')
  })

  it('cobre todos os valores de AuditEventType', () => {
    const allTypes: AuditEventType[] = [
      'created', 'area_approved', 'area_rejected',
      'quotation_added', 'quotation_removed',
      'supervisor_approved', 'supervisor_rejected',
      'financial_approved', 'financial_rejected',
      'fulfilled_by_stock',
    ]
    expect(allTypes).toHaveLength(10)
    allTypes.forEach((type) => {
      const e: AuditEvent = { id: '1', type, actorId: '1', actorName: 'X', actorRole: 'admin', timestamp: '' }
      expect(e.type).toBe(type)
    })
  })
})
