// ============================================================
// DataContext.tsx — Contexto de dados (solicitações de compra)
//
// Gerencia todas as operações com as solicitações de compra:
// criar, listar, adicionar cotações, aprovar/reprovar.
//
// A persistência é feita no localStorage com a chave 'sc_requests'.
// Em um sistema real, aqui chamaríamos uma API REST ou banco de dados.
// ============================================================

import { createContext, useContext, useState, ReactNode } from 'react'
import {
  PurchaseRequest, Quotation, SupervisorApproval, FinancialApproval,
  SafeUser, AuditEvent, AuditEventType, ServiceOrder,
} from '../types'
import {
  statusAfterCreation,
  statusAfterSubmission,
  statusAfterAreaDecision,
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
  statusAfterStockConfirmation,
} from '../domain/workflow'
import { PurchaseRequestRepository } from '../infrastructure/repositories/PurchaseRequestRepository'
import { ServiceOrderRepository } from '../infrastructure/repositories/ServiceOrderRepository'

// Interface que descreve tudo o que o contexto fornece aos componentes
interface DataContextValue {
  requests: PurchaseRequest[]
  loadRequests: () => void

  createRequest: (data: Omit<PurchaseRequest, 'id' | 'status' | 'requesterId' | 'requesterName' | 'createdAt' | 'quotations' | 'needsAreaApproval' | 'areaApproval' | 'stockFulfilled' | 'supervisorApproval' | 'financialApproval' | 'history'>, user: SafeUser) => PurchaseRequest
  addQuotation: (requestId: string, quotation: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>, user: SafeUser) => void
  removeQuotation: (requestId: string, quotationId: string, user: SafeUser) => void
  areaApprove: (requestId: string, data: { approved: boolean; observation: string }, user: SafeUser) => void
  supervisorApprove: (requestId: string, data: Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>, user: SafeUser) => void
  financialApprove: (requestId: string, data: Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>, user: SafeUser) => void
  submitRequest: (requestId: string, user: SafeUser) => void
  confirmStock: (requestId: string, observation: string, user: SafeUser) => void
  getRequestById: (id: string) => PurchaseRequest | null
  getServiceOrders: () => ServiceOrder[]
  getServiceOrderById: (id: string) => ServiceOrder | null
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<PurchaseRequest[]>(() =>
    PurchaseRequestRepository.getAll()
  )

  // Cria uma entrada de auditoria para qualquer evento de negócio
  function makeEvent(
    type: AuditEventType,
    user: SafeUser,
    observation?: string,
    metadata?: Record<string, string>
  ): AuditEvent {
    return {
      id: crypto.randomUUID(),
      type,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      timestamp: new Date().toISOString(),
      observation,
      metadata,
    }
  }

  function loadRequests() {
    setRequests(PurchaseRequestRepository.getAll())
  }

  function saveRequests(updated: PurchaseRequest[]) {
    PurchaseRequestRepository.saveAll(updated)
    setRequests(updated)
  }

  function createRequest(
    data: Omit<PurchaseRequest, 'id' | 'status' | 'requesterId' | 'requesterName' | 'createdAt' | 'quotations' | 'needsAreaApproval' | 'areaApproval' | 'stockFulfilled' | 'supervisorApproval' | 'financialApproval' | 'history'>,
    user: SafeUser
  ): PurchaseRequest {
    const isAreaManager = user.role === 'area_manager'
    const newReq: PurchaseRequest = {
      ...data,
      id: crypto.randomUUID(),
      status: statusAfterCreation(),        // sempre 'draft'
      requesterId: user.id,
      requesterName: user.name,
      createdAt: new Date().toISOString(),
      needsAreaApproval: !isAreaManager,
      areaApproval: null,
      stockFulfilled: false,
      quotations: [],
      supervisorApproval: null,
      financialApproval: null,
      history: [makeEvent('created', user)],
    }
    PurchaseRequestRepository.add(newReq)
    setRequests(PurchaseRequestRepository.getAll())
    return newReq
  }

  function submitRequest(requestId: string, user: SafeUser) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const isAreaManager = user.role === 'area_manager'
      const event = makeEvent('submitted', user)
      return {
        ...r,
        status: statusAfterSubmission(isAreaManager),
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function addQuotation(
    requestId: string,
    quotation: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>,
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const newQuotation: Quotation = {
        ...quotation,
        id: crypto.randomUUID(),
        buyerId: user.id,
        buyerName: user.name,
        createdAt: new Date().toISOString(),
      }
      const quotations = [...r.quotations, newQuotation]
      const event = makeEvent('quotation_added', user, undefined, {
        quotationId: newQuotation.id,
        supplier: newQuotation.supplier,
      })
      return {
        ...r,
        quotations,
        status: statusAfterAddQuotation(r.status, quotations.length),
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function removeQuotation(requestId: string, quotationId: string, user: SafeUser) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const removed = r.quotations.find((q) => q.id === quotationId)
      const quotations = r.quotations.filter((q) => q.id !== quotationId)
      const event = makeEvent('quotation_removed', user, undefined, {
        quotationId,
        supplier: removed?.supplier ?? '',
      })
      return {
        ...r,
        quotations,
        status: statusAfterRemoveQuotation(r.status, quotations.length),
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function areaApprove(
    requestId: string,
    data: { approved: boolean; observation: string },
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const event = makeEvent(
        data.approved ? 'area_approved' : 'area_rejected',
        user,
        data.observation
      )
      return {
        ...r,
        status: statusAfterAreaDecision(data.approved),
        areaApproval: {
          approved: data.approved,
          observation: data.observation,
          approverId: user.id,
          approverName: user.name,
          approvedAt: new Date().toISOString(),
        },
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function supervisorApprove(
    requestId: string,
    data: Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const event = makeEvent(
        data.approved ? 'supervisor_approved' : 'supervisor_rejected',
        user,
        data.observation
      )
      return {
        ...r,
        status: statusAfterSupervisorDecision(data.approved),
        supervisorApproval: {
          ...data,
          supervisorId: user.id,
          supervisorName: user.name,
          approvedAt: new Date().toISOString(),
        },
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function financialApprove(
    requestId: string,
    data: Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    const financialEvent = makeEvent(
      data.approved ? 'financial_approved' : 'financial_rejected',
      user,
      data.observation
    )

    let osEvent: AuditEvent | null = null
    if (data.approved) {
      const order: ServiceOrder = {
        id: crypto.randomUUID(),
        number: ServiceOrderRepository.generateNumber(user.name),
        requestId,
        generatedAt: new Date().toISOString(),
        generatedById: user.id,
        generatedByName: user.name,
      }
      ServiceOrderRepository.add(order)
      osEvent = makeEvent('os_generated', user, undefined, { osNumber: order.number, osId: order.id })
    }

    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const newHistory = [...(r.history ?? []), financialEvent]
      if (osEvent) newHistory.push(osEvent)
      return {
        ...r,
        status: statusAfterFinancialDecision(data.approved),
        financialApproval: {
          ...data,
          financialId: user.id,
          financialName: user.name,
          approvedAt: new Date().toISOString(),
        },
        history: newHistory,
      }
    }))
  }

  function confirmStock(requestId: string, observation: string, user: SafeUser) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const event = makeEvent('fulfilled_by_stock', user, observation)
      return {
        ...r,
        status: statusAfterStockConfirmation(),
        stockFulfilled: true,
        stockObservation: observation,
        history: [...(r.history ?? []), event],
      }
    }))
  }

  function getRequestById(id: string): PurchaseRequest | null {
    return PurchaseRequestRepository.getById(id)
  }

  function getServiceOrders(): ServiceOrder[] {
    return ServiceOrderRepository.getAll()
  }

  function getServiceOrderById(id: string): ServiceOrder | null {
    return ServiceOrderRepository.getById(id)
  }

  return (
    <DataContext.Provider value={{
      requests, loadRequests,
      createRequest, submitRequest, addQuotation, removeQuotation,
      areaApprove, supervisorApprove, financialApprove, confirmStock,
      getRequestById, getServiceOrders, getServiceOrderById,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
