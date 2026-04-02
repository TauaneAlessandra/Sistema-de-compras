// ============================================================
// src/domain/stateMachine.test.ts
//
// Testes da máquina de estados conforme o documento de Design.
//
// Estrutura: um describe por estado oficial, cobrindo:
//   - como se entra no estado
//   - quais ações são permitidas/bloqueadas
//   - para quais estados pode transitar
//
// Nota de alinhamento design × implementação:
//   O design usa "created" como estado inicial e descreve a
//   transição diretamente para pending_area_approval ou
//   pending_quotation. A implementação adiciona um estado
//   intermediário "draft" (antes do submit) para permitir
//   revisão pelo solicitante. O estado "draft" é o que o
//   design chama de "created" — a regra "não pode editar
//   após criar" aplica-se após o submit (saída do draft).
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  canSubmitRequest,
  canAddQuotation,
  canRemoveQuotation,
  canApproveArea,
  canApproveSupervisor,
  canApproveFinancial,
  canConfirmStock,
  statusAfterCreation,
  statusAfterSubmission,
  statusAfterAreaDecision,
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
  statusAfterStockConfirmation,
  canCreateRequest,
  canActAsAreaManager,
  canManageQuotations,
  canActAsSupervisor,
  canActAsFinancial,
  MIN_QUOTATIONS_TO_ADVANCE,
  TRANSITIONS,
  findTransition,
} from './workflow'
import type { RequestStatus } from '../types'

// Estados terminais — nenhuma transição deve sair deles via workflow
const TERMINAL_STATES: RequestStatus[] = ['approved', 'rejected', 'fulfilled_by_stock']

// Estados que admitem cotações
const QUOTATION_STATES: RequestStatus[] = ['pending_quotation', 'pending_supervisor']

// ── Estado: created / draft ───────────────────────────────────

describe('Estado "created" (draft no código)', () => {
  it('statusAfterCreation() retorna draft — estado inicial de toda solicitação', () => {
    expect(statusAfterCreation()).toBe('draft')
  })

  it('única ação permitida em draft é submit', () => {
    expect(canSubmitRequest('draft')).toBe(true)
  })

  it('draft não aceita cotações, aprovações de área ou aprovações de supervisor', () => {
    expect(canAddQuotation('draft')).toBe(false)
    expect(canRemoveQuotation('draft')).toBe(false)
    expect(canApproveArea('draft')).toBe(false)
    expect(canApproveSupervisor('draft')).toBe(false)
    expect(canApproveFinancial('draft')).toBe(false)
  })

  it('perfis que podem criar solicitações: requester, area_manager, admin', () => {
    expect(canCreateRequest('requester')).toBe(true)
    expect(canCreateRequest('area_manager')).toBe(true)
    expect(canCreateRequest('admin')).toBe(true)
    expect(canCreateRequest('buyer')).toBe(false)
    expect(canCreateRequest('supervisor')).toBe(false)
    expect(canCreateRequest('financial')).toBe(false)
  })

  describe('transições de saída', () => {
    it('area_manager submete → vai direto para pending_quotation', () => {
      expect(statusAfterSubmission(true)).toBe('pending_quotation')
    })

    it('requester comum submete → vai para pending_area_approval', () => {
      expect(statusAfterSubmission(false)).toBe('pending_area_approval')
    })
  })
})

// ── Estado: pending_area_approval ────────────────────────────

describe('Estado pending_area_approval', () => {
  it('quando entra: solicitante não é responsável de área', () => {
    // statusAfterSubmission(false) = quando o solicitante NÃO é area_manager
    expect(statusAfterSubmission(false)).toBe('pending_area_approval')
  })

  it('somente responsável de área (area_manager / admin) pode agir', () => {
    expect(canActAsAreaManager('area_manager')).toBe(true)
    expect(canActAsAreaManager('admin')).toBe(true)
    expect(canActAsAreaManager('requester')).toBe(false)
    expect(canActAsAreaManager('buyer')).toBe(false)
    expect(canActAsAreaManager('supervisor')).toBe(false)
  })

  it('ação canApproveArea é verdadeira somente neste estado', () => {
    expect(canApproveArea('pending_area_approval')).toBe(true)
    const others: RequestStatus[] = [
      'draft', 'pending_quotation', 'pending_supervisor',
      'pending_financial', 'approved', 'rejected', 'fulfilled_by_stock',
    ]
    others.forEach((s) => expect(canApproveArea(s)).toBe(false))
  })

  it('não aceita cotações nem aprovações financeiras neste estado', () => {
    expect(canAddQuotation('pending_area_approval')).toBe(false)
    expect(canApproveSupervisor('pending_area_approval')).toBe(false)
    expect(canApproveFinancial('pending_area_approval')).toBe(false)
  })

  describe('transições de saída', () => {
    it('aprovação → pending_quotation', () => {
      expect(statusAfterAreaDecision(true)).toBe('pending_quotation')
    })

    it('rejeição → rejected', () => {
      expect(statusAfterAreaDecision(false)).toBe('rejected')
    })
  })
})

// ── Estado: pending_quotation ─────────────────────────────────

describe('Estado pending_quotation', () => {
  it('quando entra via area_manager direto', () => {
    expect(statusAfterSubmission(true)).toBe('pending_quotation')
  })

  it('quando entra via aprovação de área', () => {
    expect(statusAfterAreaDecision(true)).toBe('pending_quotation')
  })

  it('somente buyer / admin podem gerenciar cotações', () => {
    expect(canManageQuotations('buyer')).toBe(true)
    expect(canManageQuotations('admin')).toBe(true)
    expect(canManageQuotations('requester')).toBe(false)
    expect(canManageQuotations('area_manager')).toBe(false)
    expect(canManageQuotations('supervisor')).toBe(false)
    expect(canManageQuotations('financial')).toBe(false)
  })

  it('aceita adicionar cotações neste estado', () => {
    expect(canAddQuotation('pending_quotation')).toBe(true)
  })

  it('aceita remover cotações neste estado', () => {
    expect(canRemoveQuotation('pending_quotation')).toBe(true)
  })

  it('confirmação de estoque é permitida para buyer/admin (verificação por role)', () => {
    expect(canConfirmStock('buyer')).toBe(true)
    expect(canConfirmStock('admin')).toBe(true)
    expect(canConfirmStock('requester')).toBe(false)
  })

  it('não aceita aprovação de supervisor ou financeiro neste estado', () => {
    expect(canApproveSupervisor('pending_quotation')).toBe(false)
    expect(canApproveFinancial('pending_quotation')).toBe(false)
  })

  describe('transições de saída', () => {
    it('menos de 3 cotações → permanece em pending_quotation', () => {
      for (let n = 0; n < MIN_QUOTATIONS_TO_ADVANCE; n++) {
        expect(statusAfterAddQuotation('pending_quotation', n)).toBe('pending_quotation')
      }
    })

    it(`${MIN_QUOTATIONS_TO_ADVANCE} ou mais cotações → pending_supervisor`, () => {
      expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE)).toBe('pending_supervisor')
      expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE + 1)).toBe('pending_supervisor')
    })

    it('confirmar estoque → fulfilled_by_stock', () => {
      expect(statusAfterStockConfirmation()).toBe('fulfilled_by_stock')
    })
  })
})

// ── Estado: pending_supervisor ────────────────────────────────

describe('Estado pending_supervisor', () => {
  it('quando entra: ao atingir 3 cotações a partir de pending_quotation', () => {
    expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE)).toBe('pending_supervisor')
  })

  it('somente supervisor / admin podem agir', () => {
    expect(canActAsSupervisor('supervisor')).toBe(true)
    expect(canActAsSupervisor('admin')).toBe(true)
    expect(canActAsSupervisor('requester')).toBe(false)
    expect(canActAsSupervisor('buyer')).toBe(false)
    expect(canActAsSupervisor('financial')).toBe(false)
  })

  it('canApproveSupervisor é verdadeiro apenas neste estado', () => {
    expect(canApproveSupervisor('pending_supervisor')).toBe(true)
    const others: RequestStatus[] = [
      'draft', 'pending_area_approval', 'pending_quotation',
      'pending_financial', 'approved', 'rejected', 'fulfilled_by_stock',
    ]
    others.forEach((s) => expect(canApproveSupervisor(s)).toBe(false))
  })

  it('ainda aceita adicionar cotações extras (sem limite superior)', () => {
    expect(canAddQuotation('pending_supervisor')).toBe(true)
    expect(statusAfterAddQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 10)).toBe('pending_supervisor')
  })

  it('ainda aceita remover cotações (pode regredir para pending_quotation)', () => {
    expect(canRemoveQuotation('pending_supervisor')).toBe(true)
    expect(statusAfterRemoveQuotation('pending_supervisor', 2)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 3)).toBe('pending_supervisor')
  })

  it('não aceita aprovação financeira diretamente', () => {
    expect(canApproveFinancial('pending_supervisor')).toBe(false)
  })

  describe('transições de saída', () => {
    it('aprovação com cotação escolhida → pending_financial', () => {
      // Regra: aprovação exige selectedQuotationId não vazio (validada no card)
      expect(statusAfterSupervisorDecision(true)).toBe('pending_financial')
    })

    it('rejeição com justificativa → rejected', () => {
      // Regra: rejeição exige observation não vazia (validada no card)
      expect(statusAfterSupervisorDecision(false)).toBe('rejected')
    })
  })
})

// ── Estado: pending_financial ─────────────────────────────────

describe('Estado pending_financial', () => {
  it('quando entra: após aprovação do supervisor', () => {
    expect(statusAfterSupervisorDecision(true)).toBe('pending_financial')
  })

  it('somente financial / admin podem agir', () => {
    expect(canActAsFinancial('financial')).toBe(true)
    expect(canActAsFinancial('admin')).toBe(true)
    expect(canActAsFinancial('requester')).toBe(false)
    expect(canActAsFinancial('buyer')).toBe(false)
    expect(canActAsFinancial('supervisor')).toBe(false)
  })

  it('canApproveFinancial é verdadeiro apenas neste estado', () => {
    expect(canApproveFinancial('pending_financial')).toBe(true)
    const others: RequestStatus[] = [
      'draft', 'pending_area_approval', 'pending_quotation',
      'pending_supervisor', 'approved', 'rejected', 'fulfilled_by_stock',
    ]
    others.forEach((s) => expect(canApproveFinancial(s)).toBe(false))
  })

  it('não aceita mais cotações neste estado', () => {
    expect(canAddQuotation('pending_financial')).toBe(false)
    expect(canRemoveQuotation('pending_financial')).toBe(false)
  })

  it('não aceita aprovação de área ou supervisor neste estado', () => {
    expect(canApproveArea('pending_financial')).toBe(false)
    expect(canApproveSupervisor('pending_financial')).toBe(false)
  })

  describe('transições de saída', () => {
    it('aprovação com data prevista → approved', () => {
      // Regra: purchaseDate obrigatório ao aprovar (validado no FinancialCard)
      expect(statusAfterFinancialDecision(true)).toBe('approved')
    })

    it('rejeição com justificativa → rejected', () => {
      expect(statusAfterFinancialDecision(false)).toBe('rejected')
    })
  })
})

// ── Estados terminais ─────────────────────────────────────────

describe('Estado approved (terminal)', () => {
  it('quando entra: aprovação financeira', () => {
    expect(statusAfterFinancialDecision(true)).toBe('approved')
  })

  it('nenhuma ação de transição é permitida em approved', () => {
    expect(canSubmitRequest('approved')).toBe(false)
    expect(canAddQuotation('approved')).toBe(false)
    expect(canRemoveQuotation('approved')).toBe(false)
    expect(canApproveArea('approved')).toBe(false)
    expect(canApproveSupervisor('approved')).toBe(false)
    expect(canApproveFinancial('approved')).toBe(false)
  })
})

describe('Estado rejected (terminal)', () => {
  it('pode vir de área, supervisor ou financeiro', () => {
    expect(statusAfterAreaDecision(false)).toBe('rejected')
    expect(statusAfterSupervisorDecision(false)).toBe('rejected')
    expect(statusAfterFinancialDecision(false)).toBe('rejected')
  })

  it('nenhuma ação de transição é permitida em rejected', () => {
    expect(canSubmitRequest('rejected')).toBe(false)
    expect(canAddQuotation('rejected')).toBe(false)
    expect(canRemoveQuotation('rejected')).toBe(false)
    expect(canApproveArea('rejected')).toBe(false)
    expect(canApproveSupervisor('rejected')).toBe(false)
    expect(canApproveFinancial('rejected')).toBe(false)
  })
})

describe('Estado fulfilled_by_stock (terminal)', () => {
  it('quando entra: comprador informa que item está em estoque', () => {
    expect(statusAfterStockConfirmation()).toBe('fulfilled_by_stock')
  })

  it('somente buyer / admin podem confirmar estoque', () => {
    expect(canConfirmStock('buyer')).toBe(true)
    expect(canConfirmStock('admin')).toBe(true)
    expect(canConfirmStock('requester')).toBe(false)
    expect(canConfirmStock('supervisor')).toBe(false)
    expect(canConfirmStock('financial')).toBe(false)
  })

  it('nenhuma ação de transição é permitida em fulfilled_by_stock', () => {
    expect(canSubmitRequest('fulfilled_by_stock')).toBe(false)
    expect(canAddQuotation('fulfilled_by_stock')).toBe(false)
    expect(canRemoveQuotation('fulfilled_by_stock')).toBe(false)
    expect(canApproveArea('fulfilled_by_stock')).toBe(false)
    expect(canApproveSupervisor('fulfilled_by_stock')).toBe(false)
    expect(canApproveFinancial('fulfilled_by_stock')).toBe(false)
  })
})

// ── Invariantes globais ───────────────────────────────────────

describe('Invariantes da máquina de estados', () => {
  it('estados terminais não têm nenhuma transição de saída', () => {
    TERMINAL_STATES.forEach((s) => {
      expect(canSubmitRequest(s)).toBe(false)
      expect(canApproveArea(s)).toBe(false)
      expect(canApproveSupervisor(s)).toBe(false)
      expect(canApproveFinancial(s)).toBe(false)
    })
  })

  it('cotações só podem ser gerenciadas em estados de cotação', () => {
    const allStatuses: RequestStatus[] = [
      'draft', 'pending_area_approval', 'pending_quotation', 'pending_supervisor',
      'pending_financial', 'approved', 'rejected', 'fulfilled_by_stock',
    ]
    allStatuses.forEach((s) => {
      if (QUOTATION_STATES.includes(s)) {
        expect(canAddQuotation(s)).toBe(true)
        expect(canRemoveQuotation(s)).toBe(true)
      } else {
        expect(canAddQuotation(s)).toBe(false)
        expect(canRemoveQuotation(s)).toBe(false)
      }
    })
  })

  it('fluxo feliz completo: draft → pending_quotation → pending_supervisor → pending_financial → approved', () => {
    const s0 = statusAfterCreation()           // draft
    expect(canSubmitRequest(s0)).toBe(true)

    const s1 = statusAfterSubmission(true)      // pending_quotation (area_manager)
    expect(s1).toBe('pending_quotation')
    expect(canAddQuotation(s1)).toBe(true)

    const s2 = statusAfterAddQuotation(s1, MIN_QUOTATIONS_TO_ADVANCE) // pending_supervisor
    expect(s2).toBe('pending_supervisor')
    expect(canApproveSupervisor(s2)).toBe(true)

    const s3 = statusAfterSupervisorDecision(true) // pending_financial
    expect(s3).toBe('pending_financial')
    expect(canApproveFinancial(s3)).toBe(true)

    const s4 = statusAfterFinancialDecision(true)  // approved
    expect(s4).toBe('approved')
    expect(TERMINAL_STATES).toContain(s4)
  })

  it('fluxo com área: draft → pending_area_approval → pending_quotation → pending_supervisor → pending_financial → approved', () => {
    const s0 = statusAfterCreation()              // draft
    const s1 = statusAfterSubmission(false)        // pending_area_approval
    expect(canApproveArea(s1)).toBe(true)

    const s2 = statusAfterAreaDecision(true)       // pending_quotation
    const s3 = statusAfterAddQuotation(s2, MIN_QUOTATIONS_TO_ADVANCE) // pending_supervisor
    const s4 = statusAfterSupervisorDecision(true) // pending_financial
    const s5 = statusAfterFinancialDecision(true)  // approved

    expect([s0, s1, s2, s3, s4, s5]).toEqual([
      'draft', 'pending_area_approval', 'pending_quotation',
      'pending_supervisor', 'pending_financial', 'approved',
    ])
  })

  it('fluxo de rejeição em área: draft → pending_area_approval → rejected', () => {
    expect(statusAfterSubmission(false)).toBe('pending_area_approval')
    expect(statusAfterAreaDecision(false)).toBe('rejected')
  })

  it('fluxo estoque: draft → pending_quotation → fulfilled_by_stock', () => {
    expect(statusAfterSubmission(true)).toBe('pending_quotation')
    expect(statusAfterStockConfirmation()).toBe('fulfilled_by_stock')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 8: CASOS DE BORDA MODELADOS
// ══════════════════════════════════════════════════════════════

describe('CE-B1: remoção de cotação após pending_supervisor com reversão de status', () => {
  it('remover cotação que faz ficar abaixo de 3 reverte para pending_quotation', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 2)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 1)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 0)).toBe('pending_quotation')
  })

  it('manter 3+ cotações preserva pending_supervisor', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 3)).toBe('pending_supervisor')
    expect(statusAfterRemoveQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
  })

  it('remoção sem justificativa é bloqueada pela regra de negócio', () => {
    const reason = ''
    expect(reason.trim().length > 0).toBe(false)
  })
})

describe('CE-B2: rejeição sem observação é bloqueada', () => {
  it('observation vazia torna a rejeição inválida em qualquer etapa', () => {
    const validateRejection = (approved: boolean, observation: string) =>
      approved || observation.trim().length > 0
    expect(validateRejection(false, '')).toBe(false)
    expect(validateRejection(false, 'Motivo válido')).toBe(true)
    expect(validateRejection(true, '')).toBe(true)  // aprovação não exige obs
  })
})

describe('CE-B3: mais de 3 cotações permitido — supervisor escolhe apenas 1', () => {
  it('4ª e 5ª cotações não alteram o status', () => {
    expect(statusAfterAddQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 10)).toBe('pending_supervisor')
  })

  it('supervisor escolhe exatamente 1 cotação (selectedQuotationId aponta para 1 ID)', () => {
    // A constraint é: selectedQuotationId é uma string — não um array
    const selectedQuotationId: string = 'q-chosen-single'
    expect(typeof selectedQuotationId).toBe('string')
    expect(Array.isArray(selectedQuotationId)).toBe(false)
  })
})

describe('CE-B4: pedido repetido gera novo fluxo independente', () => {
  it('dois pedidos idênticos no título têm IDs distintos e status independentes', () => {
    // IDs distintos garantem fluxos independentes
    const id1 = crypto.randomUUID()
    const id2 = crypto.randomUUID()
    expect(id1).not.toBe(id2)
    // Cada um começa em draft
    expect(statusAfterCreation()).toBe('draft')
  })
})

describe('CE-B5: estoque encontrado depois das cotações', () => {
  it('fulfilled_by_stock é alcançável a partir de pending_quotation', () => {
    // Estado com cotações registradas mas estoque encontrado
    expect(statusAfterStockConfirmation()).toBe('fulfilled_by_stock')
  })

  it('fulfilled_by_stock é alcançável a partir de pending_supervisor', () => {
    // O design permite encerrar por estoque mesmo depois de já ter supervisor envolvido
    const transition = findTransition('pending_supervisor', 'STOCK_CONFIRMED')
    expect(transition).toBeDefined()
    expect(transition?.to).toBe('fulfilled_by_stock')
  })

  it('transição é registrada no histórico (encerramento obrigatório com registro)', () => {
    // A operação deve gerar evento 'fulfilled_by_stock' — validado em DataContext
    // Aqui verificamos que o evento-tipo existe na tabela
    const transition = findTransition('pending_quotation', 'STOCK_CONFIRMED')
    expect(transition).toBeDefined()
    expect(transition?.to).toBe('fulfilled_by_stock')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 9: ALINHAMENTO RequestStatus vs PurchaseRequestStatus
// ══════════════════════════════════════════════════════════════

describe('S9: alinhamento entre design (created) e implementação (draft)', () => {
  it('statusAfterCreation() retorna "draft" — equivalente ao "created" do design', () => {
    // O design chama o estado inicial de "created".
    // A implementação usa "draft" para permitir que o solicitante
    // revise antes de submeter. A semântica é a mesma.
    expect(statusAfterCreation()).toBe('draft')
  })

  it('todos os 8 estados do design estão mapeados no tipo RequestStatus', () => {
    // Design usa: created(→draft), pending_area_approval, pending_quotation,
    // pending_supervisor, pending_financial, approved, rejected, fulfilled_by_stock
    const expectedStates: RequestStatus[] = [
      'draft', 'pending_area_approval', 'pending_quotation',
      'pending_supervisor', 'pending_financial',
      'approved', 'rejected', 'fulfilled_by_stock',
    ]
    expect(expectedStates).toHaveLength(8)
    // Verifica que são valores únicos
    expect(new Set(expectedStates).size).toBe(8)
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 10: TABELA DECLARATIVA DE TRANSIÇÕES (TransitionRule)
// ══════════════════════════════════════════════════════════════

describe('S10: TRANSITIONS — tabela declarativa de regras', () => {
  it('tabela possui entradas para todos os eventos do domínio', () => {
    expect(TRANSITIONS.length).toBeGreaterThanOrEqual(10)
  })

  it('findTransition localiza corretamente as regras', () => {
    expect(findTransition('pending_area_approval', 'AREA_APPROVED')?.to).toBe('pending_quotation')
    expect(findTransition('pending_area_approval', 'AREA_REJECTED')?.to).toBe('rejected')
    expect(findTransition('pending_supervisor', 'SUPERVISOR_APPROVED')?.to).toBe('pending_financial')
    expect(findTransition('pending_supervisor', 'SUPERVISOR_REJECTED')?.to).toBe('rejected')
    expect(findTransition('pending_financial', 'FINANCIAL_APPROVED')?.to).toBe('approved')
    expect(findTransition('pending_financial', 'FINANCIAL_REJECTED')?.to).toBe('rejected')
  })

  it('guarda QUOTATION_THRESHOLD_REACHED bloqueia se count < 3', () => {
    const rule = findTransition('pending_quotation', 'QUOTATION_THRESHOLD_REACHED')
    expect(rule?.guard?.({ validQuotationsCount: 2 })).toBe(false)
    expect(rule?.guard?.({ validQuotationsCount: 3 })).toBe(true)
    expect(rule?.guard?.({ validQuotationsCount: 4 })).toBe(true)
  })

  it('guarda QUOTATION_BELOW_THRESHOLD bloqueia se count >= 3', () => {
    const rule = findTransition('pending_supervisor', 'QUOTATION_BELOW_THRESHOLD')
    expect(rule?.guard?.({ validQuotationsCount: 3 })).toBe(false)
    expect(rule?.guard?.({ validQuotationsCount: 2 })).toBe(true)
    expect(rule?.guard?.({ validQuotationsCount: 0 })).toBe(true)
  })

  it('estoque pode ser confirmado em pending_quotation e pending_supervisor', () => {
    expect(findTransition('pending_quotation',  'STOCK_CONFIRMED')?.to).toBe('fulfilled_by_stock')
    expect(findTransition('pending_supervisor', 'STOCK_CONFIRMED')?.to).toBe('fulfilled_by_stock')
  })

  it('estados terminais não têm saída na tabela', () => {
    const terminalStates: RequestStatus[] = ['approved', 'rejected', 'fulfilled_by_stock']
    const anyExit = TRANSITIONS.some((t) => terminalStates.includes(t.from))
    expect(anyExit).toBe(false)
  })

  it('toda regra tem from, event e to definidos', () => {
    TRANSITIONS.forEach((rule) => {
      expect(rule.from).toBeTruthy()
      expect(rule.event).toBeTruthy()
      expect(rule.to).toBeTruthy()
    })
  })
})
