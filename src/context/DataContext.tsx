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
  PurchaseRequest, Quotation, SupervisorApproval, FinancialApproval, SafeUser,
} from '../types'
import {
  statusAfterAddQuotation,
  statusAfterRemoveQuotation,
  statusAfterSupervisorDecision,
  statusAfterFinancialDecision,
} from '../domain/workflow'
import { PurchaseRequestRepository } from '../infrastructure/repositories/PurchaseRequestRepository'

// Interface que descreve tudo o que o contexto fornece aos componentes
interface DataContextValue {
  requests: PurchaseRequest[]
  loadRequests: () => void

  // Omit remove campos que são gerados automaticamente — quem cria
  // não precisa informar id, status, requesterId, etc.
  createRequest: (data: Omit<PurchaseRequest, 'id' | 'status' | 'requesterId' | 'requesterName' | 'createdAt' | 'quotations' | 'supervisorApproval' | 'financialApproval'>, user: SafeUser) => PurchaseRequest
  addQuotation: (requestId: string, quotation: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>, user: SafeUser) => void
  removeQuotation: (requestId: string, quotationId: string) => void
  supervisorApprove: (requestId: string, data: Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>, user: SafeUser) => void
  financialApprove: (requestId: string, data: Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>, user: SafeUser) => void
  getRequestById: (id: string) => PurchaseRequest | null
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  // Lista de solicitações em memória — lazy initializer via repositório
  const [requests, setRequests] = useState<PurchaseRequest[]>(() =>
    PurchaseRequestRepository.getAll()
  )

  // Lê as solicitações do repositório e atualiza o state
  function loadRequests() {
    setRequests(PurchaseRequestRepository.getAll())
  }

  // Salva o array atualizado via repositório e no state
  function saveRequests(updated: PurchaseRequest[]) {
    PurchaseRequestRepository.saveAll(updated)
    setRequests(updated)
  }

  // Cria uma nova solicitação com status inicial "pending_quotation"
  function createRequest(
    data: Omit<PurchaseRequest, 'id' | 'status' | 'requesterId' | 'requesterName' | 'createdAt' | 'quotations' | 'supervisorApproval' | 'financialApproval'>,
    user: SafeUser
  ): PurchaseRequest {
    const newReq: PurchaseRequest = {
      ...data,
      id: crypto.randomUUID(),
      status: 'pending_quotation',
      requesterId: user.id,
      requesterName: user.name,
      createdAt: new Date().toISOString(),
      quotations: [],
      supervisorApproval: null,
      financialApproval: null,
    }
    PurchaseRequestRepository.add(newReq)
    setRequests(PurchaseRequestRepository.getAll())
    return newReq
  }

  // Adiciona uma cotação a uma solicitação existente.
  // Quando atingir MAX_QUOTATIONS, o status avança para pending_supervisor.
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
      return { ...r, quotations, status: statusAfterAddQuotation(r.status, quotations.length) }
    }))
  }

  // Remove uma cotação e, se ficou abaixo do mínimo, reverte o status
  function removeQuotation(requestId: string, quotationId: string) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      const quotations = r.quotations.filter((q) => q.id !== quotationId)
      return { ...r, quotations, status: statusAfterRemoveQuotation(r.status, quotations.length) }
    }))
  }

  // Registra a decisão do supervisor
  function supervisorApprove(
    requestId: string,
    data: Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      return {
        ...r,
        status: statusAfterSupervisorDecision(data.approved),
        supervisorApproval: {
          ...data,
          supervisorId: user.id,
          supervisorName: user.name,
          approvedAt: new Date().toISOString(),
        },
      }
    }))
  }

  // Registra a decisão do financeiro — etapa final do fluxo
  function financialApprove(
    requestId: string,
    data: Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all = PurchaseRequestRepository.getAll()
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      return {
        ...r,
        status: statusAfterFinancialDecision(data.approved),
        financialApproval: {
          ...data,
          financialId: user.id,
          financialName: user.name,
          approvedAt: new Date().toISOString(),
        },
      }
    }))
  }

  // Busca uma solicitação pelo ID via repositório
  function getRequestById(id: string): PurchaseRequest | null {
    return PurchaseRequestRepository.getById(id)
  }

  return (
    <DataContext.Provider value={{ requests, loadRequests, createRequest, addQuotation, removeQuotation, supervisorApprove, financialApprove, getRequestById }}>
      {children}
    </DataContext.Provider>
  )
}

// Hook customizado para acessar o DataContext
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
