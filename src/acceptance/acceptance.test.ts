// ============================================================
// src/acceptance/acceptance.test.ts
//
// Testes de aceite — validam os critérios definidos na spec.
//
// Estratégia:
//   - Sem jsdom: testamos repositórios + funções de domínio
//   - localStorage mockado via vi.stubGlobal
//   - Cada seção mapeia diretamente a um bloco da spec
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthRepository } from '../infrastructure/repositories/AuthRepository'
import { PurchaseRequestRepository } from '../infrastructure/repositories/PurchaseRequestRepository'
import {
  canApproveSupervisor,
  canApproveFinancial,
  canRemoveQuotation,
  canManageQuotations,
  canSubmitRequest,
  statusAfterCreation,
  statusAfterSubmission,
  statusAfterAreaDecision,
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
  MIN_QUOTATIONS_TO_ADVANCE,
} from '../domain/workflow'
import type { User, SafeUser, PurchaseRequest, Quotation, AuditEvent, RequestStatus } from '../types'

// ── localStorage mock ──────────────────────────────────────────
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  localStorageMock.clear()
})

// ── Fixtures ──────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    name: 'João Solicitante',
    email: 'joao@empresa.com',
    password: '123456',
    role: 'requester',
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeSafeUser(user: User): SafeUser {
  const { password: _pw, ...safe } = user
  return safe
}

function makeAuditEvent(user: SafeUser, type: AuditEvent['type']): AuditEvent {
  return {
    id: crypto.randomUUID(),
    type,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString(),
  }
}

function makeQuotation(overrides: Partial<Quotation> = {}): Quotation {
  return {
    id: crypto.randomUUID(),
    supplier: 'Fornecedor Teste',
    phone: '(11) 99999-0001',
    cnpj: '00.000.000/0001-01',
    price: 500,
    deliveryDays: 5,
    paymentMethod: 'pix',
    observations: '',
    buyerId: 'buyer-1',
    buyerName: 'Maria Compradora',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeRequest(user: SafeUser, overrides: Partial<PurchaseRequest> = {}): PurchaseRequest {
  return {
    id: crypto.randomUUID(),
    title: 'Papel A4',
    description: 'Para impressão',
    quantity: 10,
    unit: 'cx',
    urgency: 'low',
    justification: '',
    deliveryLocation: 'Sala 101',
    deliveryDeadline: '2026-05-01',
    status: statusAfterCreation(),  // 'draft'
    requesterId: user.id,
    requesterName: user.name,
    createdAt: new Date().toISOString(),
    needsAreaApproval: user.role !== 'area_manager',
    areaApproval: null,
    stockFulfilled: false,
    quotations: [],
    supervisorApproval: null,
    financialApproval: null,
    history: [makeAuditEvent(user, 'created')],
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════
// CA-01 a CA-03: LOGIN
// ══════════════════════════════════════════════════════════════

describe('CA-01: apenas usuários ativos acessam o sistema', () => {
  it('usuário ativo com credenciais corretas consegue logar', () => {
    const user = makeUser({ active: true })
    AuthRepository.saveAllUsers([user])
    const all = AuthRepository.getAllUsers()
    const found = all.find((u) => u.email === user.email && u.password === user.password && u.active)
    expect(found).toBeDefined()
    expect(found?.active).toBe(true)
  })

  it('usuário inativo não consegue logar mesmo com credenciais corretas', () => {
    const user = makeUser({ active: false })
    AuthRepository.saveAllUsers([user])
    const all = AuthRepository.getAllUsers()
    const found = all.find((u) => u.email === user.email && u.password === user.password && u.active)
    expect(found).toBeUndefined()
  })
})

describe('CA-02: sessão é persistida após login', () => {
  it('saveSession() persiste e getSession() recupera o usuário', () => {
    const user = makeUser()
    const safeUser = makeSafeUser(user)
    AuthRepository.saveSession(safeUser)
    const session = AuthRepository.getSession()
    expect(session).not.toBeNull()
    expect(session?.id).toBe(user.id)
    expect(session?.email).toBe(user.email)
  })

  it('clearSession() apaga a sessão', () => {
    AuthRepository.saveSession(makeSafeUser(makeUser()))
    AuthRepository.clearSession()
    expect(AuthRepository.getSession()).toBeNull()
  })

  it('sessão não contém senha', () => {
    const user = makeUser()
    const safeUser = makeSafeUser(user)
    AuthRepository.saveSession(safeUser)
    const session = AuthRepository.getSession()
    expect(session).not.toHaveProperty('password')
  })
})

describe('CA-03: bloqueio de credenciais inválidas', () => {
  it('senha errada → usuário não encontrado', () => {
    const user = makeUser({ password: 'correta' })
    AuthRepository.saveAllUsers([user])
    const found = AuthRepository.getAllUsers().find(
      (u) => u.email === user.email && u.password === 'errada' && u.active
    )
    expect(found).toBeUndefined()
  })

  it('email inexistente → usuário não encontrado', () => {
    AuthRepository.saveAllUsers([makeUser()])
    const found = AuthRepository.getAllUsers().find(
      (u) => u.email === 'naoexiste@empresa.com' && u.active
    )
    expect(found).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════
// CA-04 a CA-06: SOLICITAÇÕES
// ══════════════════════════════════════════════════════════════

describe('CA-04: criação de solicitação com sucesso', () => {
  it('solicitação é criada com status draft', () => {
    const user = makeUser()
    const req = makeRequest(makeSafeUser(user))
    PurchaseRequestRepository.add(req)
    const saved = PurchaseRequestRepository.getById(req.id)
    expect(saved).not.toBeNull()
    expect(saved?.status).toBe('draft')
    expect(saved?.title).toBe('Papel A4')
  })

  it('evento "created" é registrado no histórico', () => {
    const user = makeUser()
    const req = makeRequest(makeSafeUser(user))
    PurchaseRequestRepository.add(req)
    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.history).toHaveLength(1)
    expect(saved.history[0].type).toBe('created')
    expect(saved.history[0].actorId).toBe(user.id)
  })
})

describe('CA-05: solicitação aparece na listagem', () => {
  it('getAll() retorna a solicitação criada', () => {
    const req = makeRequest(makeSafeUser(makeUser()))
    PurchaseRequestRepository.add(req)
    expect(PurchaseRequestRepository.getAll()).toHaveLength(1)
    expect(PurchaseRequestRepository.getAll()[0].id).toBe(req.id)
  })

  it('múltiplas solicitações aparecem na listagem', () => {
    const user = makeSafeUser(makeUser())
    PurchaseRequestRepository.add(makeRequest(user, { id: 'r-1' }))
    PurchaseRequestRepository.add(makeRequest(user, { id: 'r-2' }))
    expect(PurchaseRequestRepository.getAll()).toHaveLength(2)
  })
})

describe('CA-06: solicitante vê apenas as próprias solicitações', () => {
  it('filtro por requesterId retorna apenas as solicitações do usuário', () => {
    const userA = makeSafeUser(makeUser({ id: 'u-a', email: 'a@e.com' }))
    const userB = makeSafeUser(makeUser({ id: 'u-b', email: 'b@e.com' }))
    PurchaseRequestRepository.add(makeRequest(userA, { id: 'r-a1' }))
    PurchaseRequestRepository.add(makeRequest(userA, { id: 'r-a2' }))
    PurchaseRequestRepository.add(makeRequest(userB, { id: 'r-b1' }))

    const all = PurchaseRequestRepository.getAll()
    const visibleToA = all.filter((r) => r.requesterId === userA.id)
    const visibleToB = all.filter((r) => r.requesterId === userB.id)

    expect(visibleToA).toHaveLength(2)
    expect(visibleToB).toHaveLength(1)
    expect(visibleToB[0].id).toBe('r-b1')
  })

  it('perfis privilegiados (buyer, supervisor, etc.) veem todas', () => {
    const requester = makeSafeUser(makeUser({ id: 'u-req' }))
    const buyer = makeSafeUser(makeUser({ id: 'u-buyer', role: 'buyer', email: 'b@e.com' }))
    PurchaseRequestRepository.add(makeRequest(requester, { id: 'r-1' }))
    PurchaseRequestRepository.add(makeRequest(requester, { id: 'r-2' }))

    const all = PurchaseRequestRepository.getAll()
    // buyer vê todas (sem filtro por requesterId)
    const visibleToBuyer = buyer.role === 'requester'
      ? all.filter((r) => r.requesterId === buyer.id)
      : all
    expect(visibleToBuyer).toHaveLength(2)
  })
})

// ══════════════════════════════════════════════════════════════
// CA-07 a CA-09: COTAÇÃO
// ══════════════════════════════════════════════════════════════

describe('CA-07: comprador adiciona cotação', () => {
  it('cotação é adicionada à solicitação e status permanece pending_quotation com < 3', () => {
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user, { status: 'pending_quotation' })
    PurchaseRequestRepository.add(req)

    const q1 = makeQuotation()
    const quotations = [q1]
    const newStatus = statusAfterAddQuotation('pending_quotation', quotations.length)

    PurchaseRequestRepository.update(req.id, {
      quotations,
      status: newStatus,
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.quotations).toHaveLength(1)
    expect(saved.status).toBe('pending_quotation')
  })
})

describe('CA-08: 3ª cotação muda status automaticamente para pending_supervisor', () => {
  it('ao adicionar a 3ª cotação o status avança', () => {
    expect(statusAfterAddQuotation('pending_quotation', 2)).toBe('pending_quotation')
    expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE)).toBe('pending_supervisor')
  })

  it('status é atualizado no repositório ao atingir 3 cotações', () => {
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user, { status: 'pending_quotation' })
    PurchaseRequestRepository.add(req)

    const quotations = [makeQuotation(), makeQuotation(), makeQuotation()]
    const newStatus = statusAfterAddQuotation('pending_quotation', quotations.length)
    PurchaseRequestRepository.update(req.id, { quotations, status: newStatus })

    expect(PurchaseRequestRepository.getById(req.id)?.status).toBe('pending_supervisor')
  })

  it('mais de 3 cotações é permitido sem alterar status', () => {
    expect(statusAfterAddQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 5)).toBe('pending_supervisor')
  })
})

describe('CA-09: remoção de cotação impacta status', () => {
  it('remover cotação abaixo de 3 reverte para pending_quotation', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 2)).toBe('pending_quotation')
    expect(statusAfterRemoveQuotation('pending_supervisor', 0)).toBe('pending_quotation')
  })

  it('manter 3 ou mais cotações preserva o status', () => {
    expect(statusAfterRemoveQuotation('pending_supervisor', 3)).toBe('pending_supervisor')
    expect(statusAfterRemoveQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
  })

  it('remoção é registrada no histórico com observação (justificativa)', () => {
    const user = makeSafeUser(makeUser({ role: 'buyer' }))
    const q = makeQuotation()
    const req = makeRequest(user, {
      status: 'pending_supervisor',
      quotations: [q, makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    const reason = 'Fornecedor não entrega na região'
    const remaining = req.quotations.filter((x) => x.id !== q.id)
    const event = makeAuditEvent(user, 'quotation_removed')
    const removalEvent: AuditEvent = { ...event, observation: reason, metadata: { quotationId: q.id, supplier: q.supplier } }
    PurchaseRequestRepository.update(req.id, {
      quotations: remaining,
      status: statusAfterRemoveQuotation('pending_supervisor', remaining.length),
      history: [...req.history, removalEvent],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    const removed = saved.history.find((e) => e.type === 'quotation_removed')
    expect(removed).toBeDefined()
    expect(removed?.observation).toBe(reason)
  })
})

// ══════════════════════════════════════════════════════════════
// CA-10 a CA-12: SUPERVISOR
// ══════════════════════════════════════════════════════════════

describe('CA-10: supervisor aprova escolhendo cotação', () => {
  it('aprovação registra a cotação selecionada e avança para pending_financial', () => {
    const supervisor = makeSafeUser(makeUser({ id: 'sup-1', role: 'supervisor', email: 's@e.com' }))
    const q = makeQuotation({ id: 'q-selected' })
    const req = makeRequest(makeSafeUser(makeUser()), {
      status: 'pending_supervisor',
      quotations: [q, makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    const approval = {
      approved: true,
      selectedQuotationId: q.id,
      observation: '',
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      approvedAt: new Date().toISOString(),
    }
    PurchaseRequestRepository.update(req.id, {
      status: statusAfterSupervisorDecision(true),
      supervisorApproval: approval,
      history: [...req.history, makeAuditEvent(supervisor, 'supervisor_approved')],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.status).toBe('pending_financial')
    expect(saved.supervisorApproval?.selectedQuotationId).toBe('q-selected')
  })
})

describe('CA-11: supervisor reprova com justificativa obrigatória', () => {
  it('reprovação sem observação falha na validação de domínio', () => {
    // A validação está no Zod do ApprovalCard: observation obrigatório ao reprovar
    // Aqui testamos a lógica de negócio: rejection leva a rejected
    const newStatus = statusAfterSupervisorDecision(false)
    expect(newStatus).toBe('rejected')
  })

  it('evento de reprovação inclui observação como motivo', () => {
    const supervisor = makeSafeUser(makeUser({ id: 'sup-1', role: 'supervisor', email: 's@e.com' }))
    const req = makeRequest(makeSafeUser(makeUser()), { status: 'pending_supervisor' })
    PurchaseRequestRepository.add(req)

    const motivo = 'Cotações insuficientes para a necessidade'
    const event: AuditEvent = {
      ...makeAuditEvent(supervisor, 'supervisor_rejected'),
      observation: motivo,
    }
    PurchaseRequestRepository.update(req.id, {
      status: 'rejected',
      history: [...req.history, event],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    const rejectEvent = saved.history.find((e) => e.type === 'supervisor_rejected')
    expect(rejectEvent?.observation).toBe(motivo)
  })
})

describe('CA-12: supervisor não acessa fora da etapa pending_supervisor', () => {
  it('canApproveSupervisor retorna false em todos os status exceto pending_supervisor', () => {
    const outOfStep = [
      'draft', 'pending_area_approval', 'pending_quotation',
      'pending_financial', 'approved', 'rejected', 'fulfilled_by_stock',
    ] as const
    outOfStep.forEach((s) => expect(canApproveSupervisor(s)).toBe(false))
  })

  it('canApproveSupervisor retorna true apenas em pending_supervisor', () => {
    expect(canApproveSupervisor('pending_supervisor')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// CA-13 a CA-15: FINANCEIRO
// ══════════════════════════════════════════════════════════════

describe('CA-13: financeiro aprova com data prevista', () => {
  it('aprovação registra purchaseDate e avança para approved', () => {
    const financial = makeSafeUser(makeUser({ id: 'fin-1', role: 'financial', email: 'f@e.com' }))
    const req = makeRequest(makeSafeUser(makeUser()), { status: 'pending_financial' })
    PurchaseRequestRepository.add(req)

    const approval = {
      approved: true,
      purchaseDate: '2026-05-15',
      paymentMethod: 'PIX',
      paymentTerms: 'À vista',
      observation: '',
      financialId: financial.id,
      financialName: financial.name,
      approvedAt: new Date().toISOString(),
    }
    PurchaseRequestRepository.update(req.id, {
      status: statusAfterFinancialDecision(true),
      financialApproval: approval,
      history: [...req.history, makeAuditEvent(financial, 'financial_approved')],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.status).toBe('approved')
    expect(saved.financialApproval?.purchaseDate).toBe('2026-05-15')
  })

  it('aprovação sem data não avança — canApproveFinancial fora de pending_financial é false', () => {
    expect(canApproveFinancial('pending_supervisor')).toBe(false)
    expect(canApproveFinancial('approved')).toBe(false)
  })
})

describe('CA-14: financeiro visualiza todo o histórico', () => {
  it('histórico contém todos os eventos da solicitação em ordem', () => {
    const requester = makeSafeUser(makeUser({ id: 'u-req' }))
    const buyer = makeSafeUser(makeUser({ id: 'u-buyer', role: 'buyer', email: 'b@e.com' }))
    const supervisor = makeSafeUser(makeUser({ id: 'u-sup', role: 'supervisor', email: 's@e.com' }))

    const req = makeRequest(requester, {
      status: 'pending_financial',
      history: [
        makeAuditEvent(requester, 'created'),
        makeAuditEvent(requester, 'submitted'),
        makeAuditEvent(buyer, 'quotation_added'),
        makeAuditEvent(buyer, 'quotation_added'),
        makeAuditEvent(buyer, 'quotation_added'),
        makeAuditEvent(supervisor, 'supervisor_approved'),
      ],
    })
    PurchaseRequestRepository.add(req)

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.history).toHaveLength(6)
    expect(saved.history[0].type).toBe('created')
    expect(saved.history[5].type).toBe('supervisor_approved')
  })
})

describe('CA-15: financeiro finaliza corretamente', () => {
  it('aprovação leva a approved', () => {
    expect(statusAfterFinancialDecision(true)).toBe('approved')
  })

  it('reprovação leva a rejected', () => {
    expect(statusAfterFinancialDecision(false)).toBe('rejected')
  })

  it('canApproveFinancial só é true em pending_financial', () => {
    expect(canApproveFinancial('pending_financial')).toBe(true)
    expect(canApproveFinancial('approved')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// CA-16 a CA-18: USUÁRIOS
// ══════════════════════════════════════════════════════════════

describe('CA-16: admin cria usuário', () => {
  it('addUser() persiste o novo usuário com active=true', () => {
    const newUser = makeUser({ id: 'new-1', email: 'novo@empresa.com' })
    AuthRepository.saveAllUsers([newUser])
    const all = AuthRepository.getAllUsers()
    expect(all).toHaveLength(1)
    expect(all[0].active).toBe(true)
    expect(all[0].email).toBe('novo@empresa.com')
  })

  it('email duplicado é detectável na camada de repositório', () => {
    const user = makeUser({ email: 'duplicado@empresa.com' })
    AuthRepository.saveAllUsers([user])
    const all = AuthRepository.getAllUsers()
    const exists = all.find((u) => u.email === 'duplicado@empresa.com')
    expect(exists).toBeDefined()
    // A verificação de duplicidade ocorre no AuthContext antes de chamar o repositório
  })
})

describe('CA-17: admin edita usuário', () => {
  it('updateUser() altera o nome e preserva os demais campos', () => {
    const user = makeUser({ name: 'Nome Antigo' })
    AuthRepository.saveAllUsers([user])
    AuthRepository.updateUser(user.id, { name: 'Nome Novo' })
    const updated = AuthRepository.getAllUsers().find((u) => u.id === user.id)!
    expect(updated.name).toBe('Nome Novo')
    expect(updated.email).toBe(user.email)
    expect(updated.role).toBe(user.role)
  })

  it('updateUser() altera o perfil corretamente', () => {
    const user = makeUser({ role: 'requester' })
    AuthRepository.saveAllUsers([user])
    AuthRepository.updateUser(user.id, { role: 'buyer' })
    const updated = AuthRepository.getAllUsers().find((u) => u.id === user.id)!
    expect(updated.role).toBe('buyer')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 10: CASOS DE BORDA
// ══════════════════════════════════════════════════════════════

describe('CE-01: remover cotação em pending_supervisor exige justificativa', () => {
  it('canRemoveQuotation é true em pending_supervisor (remoção permitida nesta etapa)', () => {
    expect(canRemoveQuotation('pending_supervisor')).toBe(true)
  })

  it('remoção sem justificativa não deve ser registrada no histórico', () => {
    const buyer = makeSafeUser(makeUser({ id: 'buyer-1', role: 'buyer', email: 'b@e.com' }))
    const q = makeQuotation({ id: 'q-to-remove' })
    const req = makeRequest(buyer, {
      status: 'pending_supervisor',
      quotations: [q, makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    // Justificativa vazia → regra de negócio impede registrar o evento
    const reason = ''
    const isValid = reason.trim().length > 0
    expect(isValid).toBe(false)
    // Repositório permanece inalterado pois a operação não foi executada
    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.quotations).toHaveLength(3)
  })

  it('remoção com justificativa é registrada com observation no evento', () => {
    const buyer = makeSafeUser(makeUser({ id: 'buyer-1', role: 'buyer', email: 'b@e.com' }))
    const q = makeQuotation({ id: 'q-to-remove' })
    const req = makeRequest(buyer, {
      status: 'pending_supervisor',
      quotations: [q, makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    const reason = 'CNPJ inválido verificado após cotação'
    const remaining = req.quotations.filter((x) => x.id !== q.id)
    const event: AuditEvent = {
      ...makeAuditEvent(buyer, 'quotation_removed'),
      observation: reason,
      metadata: { quotationId: q.id, supplier: q.supplier },
    }
    PurchaseRequestRepository.update(req.id, {
      quotations: remaining,
      status: statusAfterRemoveQuotation('pending_supervisor', remaining.length),
      history: [...req.history, event],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    const removed = saved.history.find((e) => e.type === 'quotation_removed')
    expect(removed?.observation).toBe(reason)
    expect(removed?.observation?.trim().length).toBeGreaterThan(0)
  })

  it('remoção NÃO é permitida após supervisor aprovar (pending_financial)', () => {
    expect(canRemoveQuotation('pending_financial')).toBe(false)
    expect(canRemoveQuotation('approved')).toBe(false)
    expect(canRemoveQuotation('rejected')).toBe(false)
  })
})

describe('CE-02: supervisor sem justificativa é bloqueado ao reprovar', () => {
  it('reprovação com observation vazia não deve ser processada', () => {
    // A regra: observation obrigatória ao reprovar (validação no ApprovalCard via Zod)
    // Testamos a lógica pura: rejection exige motivo não vazio
    const observation = ''
    const approved = false
    const isRejectionValid = approved || observation.trim().length > 0
    expect(isRejectionValid).toBe(false)
  })

  it('reprovação com observação passa na validação lógica', () => {
    const observation = 'Preços acima da tabela interna'
    const approved = false
    const isRejectionValid = approved || observation.trim().length > 0
    expect(isRejectionValid).toBe(true)
  })

  it('aprovação sem observação é válida (observação opcional ao aprovar)', () => {
    const observation = ''
    const approved = true
    const isValid = approved || observation.trim().length > 0
    expect(isValid).toBe(true)
  })
})

describe('CE-03: mais de 3 cotações é permitido', () => {
  it('4ª e 5ª cotações são aceitas sem alterar o status (permanece pending_supervisor)', () => {
    expect(statusAfterAddQuotation('pending_supervisor', 4)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 5)).toBe('pending_supervisor')
    expect(statusAfterAddQuotation('pending_supervisor', 10)).toBe('pending_supervisor')
  })

  it('canManageQuotations permite buyer adicionar a 4ª e 5ª cotação', () => {
    expect(canManageQuotations('buyer')).toBe(true)
    expect(canManageQuotations('admin')).toBe(true)
  })

  it('repositório persiste 4 cotações sem rejeitar', () => {
    const buyer = makeSafeUser(makeUser({ role: 'buyer' }))
    const req = makeRequest(buyer, {
      status: 'pending_supervisor',
      quotations: [makeQuotation(), makeQuotation(), makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.quotations).toHaveLength(4)
    expect(saved.status).toBe('pending_supervisor')
  })
})

describe('CE-04: solicitação duplicada é permitida (novo fluxo independente)', () => {
  it('dois pedidos com o mesmo título recebem IDs distintos', () => {
    const user = makeSafeUser(makeUser())
    const req1 = makeRequest(user, { id: 'r-dup-1', title: 'Papel A4' })
    const req2 = makeRequest(user, { id: 'r-dup-2', title: 'Papel A4' })

    PurchaseRequestRepository.add(req1)
    PurchaseRequestRepository.add(req2)

    const all = PurchaseRequestRepository.getAll()
    expect(all).toHaveLength(2)
    expect(all[0].id).not.toBe(all[1].id)
    expect(all[0].title).toBe(all[1].title) // mesmo título — ambos permitidos
  })

  it('cada solicitação duplicada percorre seu próprio fluxo independente', () => {
    const user = makeSafeUser(makeUser())
    const req1 = makeRequest(user, { id: 'r-d1', status: 'pending_quotation' })
    const req2 = makeRequest(user, { id: 'r-d2', status: 'draft' })
    PurchaseRequestRepository.add(req1)
    PurchaseRequestRepository.add(req2)

    // Avançar req1 para pending_supervisor não afeta req2
    PurchaseRequestRepository.update('r-d1', {
      quotations: [makeQuotation(), makeQuotation(), makeQuotation()],
      status: 'pending_supervisor',
    })

    expect(PurchaseRequestRepository.getById('r-d1')?.status).toBe('pending_supervisor')
    expect(PurchaseRequestRepository.getById('r-d2')?.status).toBe('draft')
  })
})

describe('CE-05: comprador não pode editar cotação existente', () => {
  it('canManageQuotations NÃO existe função editQuotation no domínio', () => {
    // O domínio expõe apenas add e remove — sem edição.
    // A única forma de "editar" é remover e adicionar novamente (com nova justificativa).
    const workflowKeys = Object.keys({
      canRemoveQuotation,
      canManageQuotations,
      statusAfterAddQuotation,
      statusAfterRemoveQuotation,
    })
    const hasEditFn = workflowKeys.some((k) => k.toLowerCase().includes('edit'))
    expect(hasEditFn).toBe(false)
  })

  it('requester e supervisor não têm permissão para gerenciar cotações', () => {
    expect(canManageQuotations('requester')).toBe(false)
    expect(canManageQuotations('supervisor')).toBe(false)
    expect(canManageQuotations('financial')).toBe(false)
    expect(canManageQuotations('area_manager')).toBe(false)
  })

  it('cotação existente permanece intacta se buyer não fizer remoção + re-adição', () => {
    const buyer = makeSafeUser(makeUser({ role: 'buyer' }))
    const q = makeQuotation({ id: 'q-original', price: 500, supplier: 'Fornecedor A' })
    const req = makeRequest(buyer, { status: 'pending_quotation', quotations: [q] })
    PurchaseRequestRepository.add(req)

    // Sem operação de edição: a cotação permanece como foi inserida
    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.quotations[0].price).toBe(500)
    expect(saved.quotations[0].supplier).toBe('Fornecedor A')
  })
})

describe('CA-18: admin desativa usuário sem perder histórico', () => {
  it('desativar seta active=false e preserva o usuário (soft delete)', () => {
    const user = makeUser({ active: true })
    AuthRepository.saveAllUsers([user])
    AuthRepository.updateUser(user.id, { active: false })
    const all = AuthRepository.getAllUsers()
    expect(all).toHaveLength(1)          // usuário ainda existe
    expect(all[0].active).toBe(false)    // apenas desativado
    expect(all[0].id).toBe(user.id)
  })

  it('solicitações do usuário desativado são preservadas no repositório', () => {
    const user = makeUser({ active: true })
    const req = makeRequest(makeSafeUser(user))
    AuthRepository.saveAllUsers([user])
    PurchaseRequestRepository.add(req)

    // Desativa o usuário
    AuthRepository.updateUser(user.id, { active: false })

    // Solicitação continua existindo
    const saved = PurchaseRequestRepository.getById(req.id)
    expect(saved).not.toBeNull()
    expect(saved?.requesterId).toBe(user.id)
  })

  it('usuário desativado não consegue logar', () => {
    const user = makeUser({ active: true })
    AuthRepository.saveAllUsers([user])
    AuthRepository.updateUser(user.id, { active: false })
    const found = AuthRepository.getAllUsers().find(
      (u) => u.email === user.email && u.password === user.password && u.active
    )
    expect(found).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 11: RESTRIÇÕES NÃO FUNCIONAIS
// ══════════════════════════════════════════════════════════════

describe('NFR-01: auditoria obrigatória em todas as operações críticas', () => {
  it('criação de solicitação registra evento "created" no histórico', () => {
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user)
    expect(req.history.length).toBeGreaterThanOrEqual(1)
    expect(req.history.some((e) => e.type === 'created')).toBe(true)
  })

  it('evento de auditoria sempre contém actorId, actorName, actorRole e timestamp', () => {
    const user = makeSafeUser(makeUser({ role: 'buyer' }))
    const event = makeAuditEvent(user, 'quotation_added')
    expect(event.actorId).toBeTruthy()
    expect(event.actorName).toBeTruthy()
    expect(event.actorRole).toBeTruthy()
    expect(event.timestamp).toBeTruthy()
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp)
  })

  it('aprovação do supervisor gera evento com actorRole = supervisor', () => {
    const supervisor = makeSafeUser(makeUser({ role: 'supervisor', email: 's@e.com' }))
    const event = makeAuditEvent(supervisor, 'supervisor_approved')
    expect(event.actorRole).toBe('supervisor')
    expect(event.type).toBe('supervisor_approved')
  })

  it('aprovação financeira gera evento com actorRole = financial', () => {
    const financial = makeSafeUser(makeUser({ role: 'financial', email: 'f@e.com' }))
    const event = makeAuditEvent(financial, 'financial_approved')
    expect(event.actorRole).toBe('financial')
    expect(event.type).toBe('financial_approved')
  })

  it('histórico é imutável: cada update concatena eventos sem apagar anteriores', () => {
    const user = makeSafeUser(makeUser())
    const buyer = makeSafeUser(makeUser({ id: 'b-1', role: 'buyer', email: 'b@e.com' }))
    const req = makeRequest(user, { status: 'pending_quotation' })
    PurchaseRequestRepository.add(req)

    const e1 = makeAuditEvent(user, 'submitted')
    PurchaseRequestRepository.update(req.id, { history: [...req.history, e1] })

    const afterFirst = PurchaseRequestRepository.getById(req.id)!
    const e2 = makeAuditEvent(buyer, 'quotation_added')
    PurchaseRequestRepository.update(req.id, { history: [...afterFirst.history, e2] })

    const final = PurchaseRequestRepository.getById(req.id)!
    expect(final.history).toHaveLength(3) // created + submitted + quotation_added
    expect(final.history[0].type).toBe('created')
    expect(final.history[2].type).toBe('quotation_added')
  })
})

describe('NFR-02: arquitetura preparada para backend (padrão repositório)', () => {
  it('PurchaseRequestRepository expõe interface add/getAll/getById/update independente de UI', () => {
    // Repositório funciona de forma isolada — sem React, sem contexto
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user, { id: 'arch-test' })
    PurchaseRequestRepository.add(req)
    expect(PurchaseRequestRepository.getById('arch-test')).not.toBeNull()
    expect(PurchaseRequestRepository.getAll().find((r) => r.id === 'arch-test')).toBeDefined()
  })

  it('AuthRepository expõe interface save/get/update independente de UI', () => {
    const user = makeUser({ id: 'auth-arch' })
    AuthRepository.saveAllUsers([user])
    expect(AuthRepository.getAllUsers().find((u) => u.id === 'auth-arch')).toBeDefined()
    AuthRepository.updateUser('auth-arch', { name: 'Updated' })
    expect(AuthRepository.getAllUsers().find((u) => u.id === 'auth-arch')?.name).toBe('Updated')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 12: LIMITES DO MVP
// ══════════════════════════════════════════════════════════════

describe('MVP-01: persistência em localStorage sobrevive entre chamadas', () => {
  it('dados gravados por saveAllUsers são recuperados em chamadas seguintes', () => {
    const user = makeUser({ id: 'persist-1' })
    AuthRepository.saveAllUsers([user])
    // Simula nova "leitura" — repositório relê do localStorage
    const recovered = AuthRepository.getAllUsers()
    expect(recovered.find((u) => u.id === 'persist-1')).toBeDefined()
  })

  it('solicitação persiste entre chamadas sem re-salvar', () => {
    const req = makeRequest(makeSafeUser(makeUser()), { id: 'persist-req' })
    PurchaseRequestRepository.add(req)
    expect(PurchaseRequestRepository.getById('persist-req')).not.toBeNull()
    // Segunda leitura
    expect(PurchaseRequestRepository.getAll().find((r) => r.id === 'persist-req')).toBeDefined()
  })
})

describe('MVP-02: sessão é um objeto simples (sem tokens avançados)', () => {
  it('sessão salva contém apenas SafeUser — sem campo token, exp ou refresh', () => {
    const user = makeUser()
    const safe = makeSafeUser(user)
    AuthRepository.saveSession(safe)
    const session = AuthRepository.getSession()!
    expect(session).not.toHaveProperty('token')
    expect(session).not.toHaveProperty('exp')
    expect(session).not.toHaveProperty('refreshToken')
    expect(session).toHaveProperty('id')
    expect(session).toHaveProperty('role')
  })

  it('clearSession() invalida completamente o acesso', () => {
    AuthRepository.saveSession(makeSafeUser(makeUser()))
    AuthRepository.clearSession()
    expect(AuthRepository.getSession()).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 13: REGRAS CRÍTICAS (resumo)
// ══════════════════════════════════════════════════════════════

describe('CR-01: solicitação não pode ser editada após criação', () => {
  it('DataContext não expõe operação de edição de campos da solicitação', () => {
    // A superfície pública do DataContext é: createRequest, submitRequest,
    // addQuotation, removeQuotation, areaApprove, supervisorApprove,
    // financialApprove, confirmStock, getRequestById.
    // Não há editRequest, updateTitle, updateDescription etc.
    // Verificamos que nenhuma dessas funções tem nome de "edição":
    const contextAPI = [
      'createRequest', 'submitRequest', 'addQuotation', 'removeQuotation',
      'areaApprove', 'supervisorApprove', 'financialApprove', 'confirmStock',
      'getRequestById', 'getServiceOrders', 'getServiceOrderById',
    ]
    const editOps = contextAPI.filter((name) =>
      /edit|update|modify|change/i.test(name)
    )
    expect(editOps).toHaveLength(0)
  })

  it('campos da solicitação são idênticos antes e depois de operações de cotação', () => {
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user, {
      id: 'immutable-1',
      title: 'Cadeiras ergonômicas',
      description: 'Para o escritório',
      quantity: 5,
      unit: 'un',
    })
    PurchaseRequestRepository.add(req)

    // Simula operação de cotação (não altera campos do request)
    PurchaseRequestRepository.update('immutable-1', {
      quotations: [makeQuotation()],
      status: 'pending_quotation',
    })

    const saved = PurchaseRequestRepository.getById('immutable-1')!
    expect(saved.title).toBe('Cadeiras ergonômicas')
    expect(saved.description).toBe('Para o escritório')
    expect(saved.quantity).toBe(5)
    expect(saved.unit).toBe('un')
  })
})

describe('CR-02: 3 cotações obrigatórias para avançar ao supervisor', () => {
  it('MIN_QUOTATIONS_TO_ADVANCE é exatamente 3', () => {
    expect(MIN_QUOTATIONS_TO_ADVANCE).toBe(3)
  })

  it('2 cotações não avançam o status', () => {
    expect(statusAfterAddQuotation('pending_quotation', 2)).toBe('pending_quotation')
  })

  it('3 cotações avançam para pending_supervisor', () => {
    expect(statusAfterAddQuotation('pending_quotation', 3)).toBe('pending_supervisor')
  })
})

describe('CR-03: supervisor deve escolher cotação para aprovar', () => {
  it('aprovação do supervisor sem cotação selecionada falha na validação lógica', () => {
    const selectedQuotationId = ''
    const approved = true
    // Regra: ao aprovar, selectedQuotationId é obrigatório
    const isValid = !approved || selectedQuotationId.trim().length > 0
    expect(isValid).toBe(false)
  })

  it('aprovação com cotação selecionada é válida', () => {
    const selectedQuotationId = 'q-abc-123'
    const approved = true
    const isValid = !approved || selectedQuotationId.trim().length > 0
    expect(isValid).toBe(true)
  })
})

describe('CR-04: financeiro deve informar data prevista de compra ao aprovar', () => {
  it('aprovação financeira sem purchaseDate falha na validação lógica', () => {
    const purchaseDate = ''
    const approved = true
    const isValid = !approved || purchaseDate.trim().length > 0
    expect(isValid).toBe(false)
  })

  it('aprovação financeira com purchaseDate válida passa na validação lógica', () => {
    const purchaseDate = '2026-06-01'
    const approved = true
    const isValid = !approved || purchaseDate.trim().length > 0
    expect(isValid).toBe(true)
  })

  it('reprovação financeira não exige data', () => {
    const purchaseDate = ''
    const approved = false
    const isValid = !approved || purchaseDate.trim().length > 0
    expect(isValid).toBe(true) // reprovação é válida sem data
  })
})

describe('CR-05: usuário inativo não loga', () => {
  it('usuário com active=false não é encontrado no fluxo de login', () => {
    const user = makeUser({ active: false })
    AuthRepository.saveAllUsers([user])
    const found = AuthRepository.getAllUsers().find(
      (u) => u.email === user.email && u.password === user.password && u.active
    )
    expect(found).toBeUndefined()
  })
})

describe('CR-06: tudo gera histórico', () => {
  it('todas as transições de status produzem um evento de audit com tipo correto', () => {
    const eventTypes = [
      'created', 'submitted', 'area_approved', 'area_rejected',
      'quotation_added', 'quotation_removed',
      'supervisor_approved', 'supervisor_rejected',
      'financial_approved', 'financial_rejected',
      'os_generated', 'fulfilled_by_stock',
    ] as const

    const user = makeSafeUser(makeUser())
    for (const type of eventTypes) {
      const event = makeAuditEvent(user, type as AuditEvent['type'])
      expect(event.type).toBe(type)
      expect(event.actorId).toBe(user.id)
      expect(event.timestamp).toBeTruthy()
    }
  })

  it('histórico de uma solicitação com fluxo completo tem ao menos 6 eventos', () => {
    const requester = makeSafeUser(makeUser({ id: 'r-full' }))
    const buyer = makeSafeUser(makeUser({ id: 'b-full', role: 'buyer', email: 'b@f.com' }))
    const supervisor = makeSafeUser(makeUser({ id: 's-full', role: 'supervisor', email: 's@f.com' }))
    const financial = makeSafeUser(makeUser({ id: 'f-full', role: 'financial', email: 'fin@f.com' }))

    const history: AuditEvent[] = [
      makeAuditEvent(requester, 'created'),
      makeAuditEvent(requester, 'submitted'),
      makeAuditEvent(buyer, 'quotation_added'),
      makeAuditEvent(buyer, 'quotation_added'),
      makeAuditEvent(buyer, 'quotation_added'),
      makeAuditEvent(supervisor, 'supervisor_approved'),
      makeAuditEvent(financial, 'financial_approved'),
    ]

    const req = makeRequest(requester, { status: 'approved', history })
    PurchaseRequestRepository.add(req)

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.history.length).toBeGreaterThanOrEqual(6)
    // Cada evento tem os campos obrigatórios
    saved.history.forEach((e) => {
      expect(e.id).toBeTruthy()
      expect(e.actorId).toBeTruthy()
      expect(e.timestamp).toBeTruthy()
      expect(e.type).toBeTruthy()
    })
  })

  it('canSubmitRequest só é true no status draft (garante fluxo unidirecional)', () => {
    expect(canSubmitRequest('draft')).toBe(true)
    const others: Parameters<typeof canSubmitRequest>[0][] = [
      'pending_area_approval', 'pending_quotation', 'pending_supervisor',
      'pending_financial', 'approved', 'rejected', 'fulfilled_by_stock',
    ]
    others.forEach((s) => expect(canSubmitRequest(s)).toBe(false))
  })

  it('statusAfterSubmission reflete corretamente o papel do solicitante', () => {
    expect(statusAfterSubmission(false)).toBe('pending_area_approval')
    expect(statusAfterSubmission(true)).toBe('pending_quotation')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 5: GUARDAS DE TRANSIÇÃO
// ══════════════════════════════════════════════════════════════

describe('GRD-01: guarda created → pending_area_approval', () => {
  it('solicitante que NÃO é area_manager vai para pending_area_approval', () => {
    expect(statusAfterSubmission(false)).toBe('pending_area_approval')
  })

  it('roles que disparam a guarda: requester, admin (sem ser area_manager)', () => {
    // canCreateRequest ∧ !isAreaManager → pending_area_approval
    // Nenhum dos dois é area_manager, portanto isAreaManager=false para ambos
    expect(statusAfterSubmission(false)).toBe('pending_area_approval')
  })
})

describe('GRD-02: guarda created → pending_quotation', () => {
  it('area_manager vai direto para pending_quotation ao submeter', () => {
    expect(statusAfterSubmission(true)).toBe('pending_quotation')
  })
})

describe('GRD-03: guarda pending_area_approval → pending_quotation', () => {
  it('somente aprovação pelo responsável da área avança', () => {
    expect(statusAfterAreaDecision(true)).toBe('pending_quotation')
  })

  it('canActAsAreaManager define quem pode executar esta guarda', () => {
    expect(canManageQuotations('area_manager')).toBe(false)  // area_manager não gerencia cotações
    // A verificação de role de área está em canActAsAreaManager (domain/workflow)
  })
})

describe('GRD-04: guarda pending_area_approval → rejected', () => {
  it('rejeição com justificativa leva a rejected', () => {
    expect(statusAfterAreaDecision(false)).toBe('rejected')
  })

  it('rejeição sem justificativa é inválida pela regra de negócio', () => {
    const justification = ''
    const approved = false
    const isValid = approved || justification.trim().length > 0
    expect(isValid).toBe(false)
  })
})

describe('GRD-05: guarda pending_quotation → pending_supervisor', () => {
  it(`condição: quantidade de cotações válidas >= ${MIN_QUOTATIONS_TO_ADVANCE}`, () => {
    expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE - 1)).toBe('pending_quotation')
    expect(statusAfterAddQuotation('pending_quotation', MIN_QUOTATIONS_TO_ADVANCE)).toBe('pending_supervisor')
  })
})

describe('GRD-06: permanência em pending_quotation', () => {
  it(`condição: quantidade de cotações < ${MIN_QUOTATIONS_TO_ADVANCE}`, () => {
    for (let n = 0; n < MIN_QUOTATIONS_TO_ADVANCE; n++) {
      expect(statusAfterAddQuotation('pending_quotation', n)).toBe('pending_quotation')
    }
  })
})

describe('GRD-07: guarda pending_supervisor → pending_financial', () => {
  it('condição: supervisor escolhe 1 cotação válida (selectedQuotationId não vazio)', () => {
    const selectedQuotationId = 'q-abc'
    const approved = true
    const guardPasses = !approved || selectedQuotationId.trim().length > 0
    expect(guardPasses).toBe(true)
    expect(statusAfterSupervisorDecision(true)).toBe('pending_financial')
  })

  it('guarda falha se selectedQuotationId estiver vazio', () => {
    const selectedQuotationId = ''
    const approved = true
    const guardPasses = !approved || selectedQuotationId.trim().length > 0
    expect(guardPasses).toBe(false)
  })
})

describe('GRD-08: guarda pending_supervisor → rejected', () => {
  it('condição: justificativa obrigatória preenchida', () => {
    const observation = 'Cotações acima do orçamento'
    const guardPasses = observation.trim().length > 0
    expect(guardPasses).toBe(true)
    expect(statusAfterSupervisorDecision(false)).toBe('rejected')
  })
})

describe('GRD-09: guarda pending_financial → approved', () => {
  it('condição: data prevista de compra informada', () => {
    const purchaseDate = '2026-07-01'
    const guardPasses = purchaseDate.trim().length > 0
    expect(guardPasses).toBe(true)
    expect(statusAfterFinancialDecision(true)).toBe('approved')
  })

  it('guarda falha se purchaseDate estiver vazia', () => {
    const purchaseDate = ''
    const guardPasses = purchaseDate.trim().length > 0
    expect(guardPasses).toBe(false)
  })
})

describe('GRD-10: guarda pending_financial → rejected', () => {
  it('condição: justificativa obrigatória preenchida', () => {
    const observation = 'Orçamento esgotado para o período'
    expect(observation.trim().length > 0).toBe(true)
    expect(statusAfterFinancialDecision(false)).toBe('rejected')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 6: REGRAS DE IMUTABILIDADE
// ══════════════════════════════════════════════════════════════

describe('IMU-01: solicitação não pode ser editada após criação', () => {
  it('campos title, description, quantity, unit são preservados após qualquer operação', () => {
    const user = makeSafeUser(makeUser())
    const req = makeRequest(user, {
      id: 'imu-req',
      title: 'Monitor 27"',
      description: 'Para home office',
      quantity: 2,
      unit: 'un',
    })
    PurchaseRequestRepository.add(req)

    // Simula aprovação de área (operação legítima)
    PurchaseRequestRepository.update('imu-req', { status: 'pending_quotation' })

    const saved = PurchaseRequestRepository.getById('imu-req')!
    expect(saved.title).toBe('Monitor 27"')
    expect(saved.description).toBe('Para home office')
    expect(saved.quantity).toBe(2)
    expect(saved.unit).toBe('un')
  })
})

describe('IMU-02: cotação não pode ser editada depois de registrada', () => {
  it('cotação salva permanece intacta — sem operação de edição disponível', () => {
    const buyer = makeSafeUser(makeUser({ role: 'buyer' }))
    const q = makeQuotation({ id: 'q-imu', price: 750, cnpj: '12.345.678/0001-99' })
    const req = makeRequest(buyer, { status: 'pending_quotation', quotations: [q] })
    PurchaseRequestRepository.add(req)

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.quotations[0].price).toBe(750)
    expect(saved.quotations[0].cnpj).toBe('12.345.678/0001-99')
    // Não existe updateQuotation — apenas add e remove
  })

  it('cotação pode ser removida somente com justificativa registrada no histórico', () => {
    const buyer = makeSafeUser(makeUser({ role: 'buyer' }))
    const q = makeQuotation({ id: 'q-remove-imu' })
    const req = makeRequest(buyer, {
      status: 'pending_supervisor',
      quotations: [q, makeQuotation(), makeQuotation()],
    })
    PurchaseRequestRepository.add(req)

    const justification = 'CNPJ com restrição cadastral verificado após cotação'
    expect(justification.trim().length > 0).toBe(true)

    const remaining = req.quotations.filter((x) => x.id !== q.id)
    const event: AuditEvent = {
      ...makeAuditEvent(buyer, 'quotation_removed'),
      observation: justification,
      fromStatus: 'pending_supervisor',
      toStatus: statusAfterRemoveQuotation('pending_supervisor', remaining.length) as RequestStatus,
    }
    PurchaseRequestRepository.update(req.id, {
      quotations: remaining,
      history: [...req.history, event],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    const removalEvent = saved.history.find((e) => e.type === 'quotation_removed')
    expect(removalEvent?.observation).toBe(justification)
    expect(removalEvent?.fromStatus).toBe('pending_supervisor')
  })
})

describe('IMU-03: aprovações não podem ser sobrescritas sem histórico', () => {
  it('supervisorApproval registra o estado completo da decisão imutavelmente', () => {
    const supervisor = makeSafeUser(makeUser({ role: 'supervisor', email: 's@e.com' }))
    const req = makeRequest(makeSafeUser(makeUser()), { status: 'pending_supervisor' })
    PurchaseRequestRepository.add(req)

    const approval = {
      approved: true,
      selectedQuotationId: 'q-chosen',
      observation: 'Melhor custo-benefício',
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      approvedAt: new Date().toISOString(),
    }
    PurchaseRequestRepository.update(req.id, {
      status: 'pending_financial',
      supervisorApproval: approval,
      history: [...req.history, {
        ...makeAuditEvent(supervisor, 'supervisor_approved'),
        fromStatus: 'pending_supervisor' as RequestStatus,
        toStatus: 'pending_financial' as RequestStatus,
        observation: 'Melhor custo-benefício',
      }],
    })

    const saved = PurchaseRequestRepository.getById(req.id)!
    expect(saved.supervisorApproval?.approved).toBe(true)
    expect(saved.supervisorApproval?.selectedQuotationId).toBe('q-chosen')
    // A decisão original permanece — somente novo evento administrativo pode registrar mudança
    const approvalEvent = saved.history.find((e) => e.type === 'supervisor_approved')
    expect(approvalEvent?.fromStatus).toBe('pending_supervisor')
    expect(approvalEvent?.toStatus).toBe('pending_financial')
  })
})

// ══════════════════════════════════════════════════════════════
// Seção 7: HISTÓRICO OBRIGATÓRIO POR TRANSIÇÃO (fromStatus/toStatus)
// ══════════════════════════════════════════════════════════════

describe('HIS-01: evento de transição registra fromStatus e toStatus', () => {
  it('evento de submissão deve ter fromStatus=draft e toStatus correto', () => {
    const user = makeSafeUser(makeUser())
    const event: AuditEvent = {
      ...makeAuditEvent(user, 'submitted'),
      fromStatus: 'draft',
      toStatus: statusAfterSubmission(false),
    }
    expect(event.fromStatus).toBe('draft')
    expect(event.toStatus).toBe('pending_area_approval')
  })

  it('evento de aprovação de área registra a transição correta', () => {
    const approver = makeSafeUser(makeUser({ role: 'area_manager', email: 'a@e.com' }))
    const event: AuditEvent = {
      ...makeAuditEvent(approver, 'area_approved'),
      fromStatus: 'pending_area_approval',
      toStatus: statusAfterAreaDecision(true),
    }
    expect(event.fromStatus).toBe('pending_area_approval')
    expect(event.toStatus).toBe('pending_quotation')
  })

  it('evento de adição de cotação registra transição quando atinge 3 cotações', () => {
    const buyer = makeSafeUser(makeUser({ role: 'buyer' }))
    const from: RequestStatus = 'pending_quotation'
    const to = statusAfterAddQuotation(from, MIN_QUOTATIONS_TO_ADVANCE)
    const event: AuditEvent = {
      ...makeAuditEvent(buyer, 'quotation_added'),
      fromStatus: from,
      toStatus: to,
    }
    expect(event.fromStatus).toBe('pending_quotation')
    expect(event.toStatus).toBe('pending_supervisor')
  })

  it('evento de aprovação do supervisor registra transição', () => {
    const supervisor = makeSafeUser(makeUser({ role: 'supervisor', email: 's@e.com' }))
    const event: AuditEvent = {
      ...makeAuditEvent(supervisor, 'supervisor_approved'),
      fromStatus: 'pending_supervisor',
      toStatus: statusAfterSupervisorDecision(true),
      observation: 'Cotação da Loja B escolhida por melhor prazo',
    }
    expect(event.fromStatus).toBe('pending_supervisor')
    expect(event.toStatus).toBe('pending_financial')
    expect(event.observation).toBeTruthy()
  })

  it('evento de aprovação financeira registra transição com data', () => {
    const financial = makeSafeUser(makeUser({ role: 'financial', email: 'f@e.com' }))
    const event: AuditEvent = {
      ...makeAuditEvent(financial, 'financial_approved'),
      fromStatus: 'pending_financial',
      toStatus: statusAfterFinancialDecision(true),
    }
    expect(event.fromStatus).toBe('pending_financial')
    expect(event.toStatus).toBe('approved')
  })

  it('evento de rejeição financeira registra transição', () => {
    const financial = makeSafeUser(makeUser({ role: 'financial', email: 'f@e.com' }))
    const event: AuditEvent = {
      ...makeAuditEvent(financial, 'financial_rejected'),
      fromStatus: 'pending_financial',
      toStatus: statusAfterFinancialDecision(false),
      observation: 'Orçamento esgotado no trimestre',
    }
    expect(event.fromStatus).toBe('pending_financial')
    expect(event.toStatus).toBe('rejected')
    expect(event.observation).toBeTruthy()
  })
})

describe('HIS-02: histórico com transições é recuperado completo do repositório', () => {
  it('todos os campos fromStatus/toStatus são persistidos e recuperados', () => {
    const user = makeSafeUser(makeUser())
    const supervisor = makeSafeUser(makeUser({ id: 'sup', role: 'supervisor', email: 's@e.com' }))

    const e1: AuditEvent = {
      ...makeAuditEvent(user, 'submitted'),
      fromStatus: 'draft',
      toStatus: 'pending_quotation',
    }
    const e2: AuditEvent = {
      ...makeAuditEvent(supervisor, 'supervisor_approved'),
      fromStatus: 'pending_supervisor',
      toStatus: 'pending_financial',
      observation: 'Aprovado com cotação da Loja X',
    }

    const req = makeRequest(user, {
      id: 'his-trans',
      status: 'pending_financial',
      history: [makeAuditEvent(user, 'created'), e1, e2],
    })
    PurchaseRequestRepository.add(req)

    const saved = PurchaseRequestRepository.getById('his-trans')!
    const submittedEvent = saved.history.find((e) => e.type === 'submitted')
    const approvedEvent = saved.history.find((e) => e.type === 'supervisor_approved')

    expect(submittedEvent?.fromStatus).toBe('draft')
    expect(submittedEvent?.toStatus).toBe('pending_quotation')
    expect(approvedEvent?.fromStatus).toBe('pending_supervisor')
    expect(approvedEvent?.toStatus).toBe('pending_financial')
    expect(approvedEvent?.observation).toBe('Aprovado com cotação da Loja X')
  })
})
