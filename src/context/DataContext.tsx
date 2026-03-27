// ============================================================
// DataContext.tsx — Contexto de dados (solicitações de compra)
//
// Gerencia todas as operações com as solicitações de compra:
// criar, listar, adicionar cotações, aprovar/reprovar.
//
// A persistência é feita no localStorage com a chave 'sc_requests'.
// Em um sistema real, aqui chamaríamos uma API REST ou banco de dados.
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  PurchaseRequest, Quotation, SupervisorApproval, FinancialApproval, SafeUser,
} from '../types'

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
  // Lista de solicitações em memória (state do React)
  const [requests, setRequests] = useState<PurchaseRequest[]>([])

  // Carrega os dados ao montar o componente
  useEffect(() => { loadRequests() }, [])

  // Lê as solicitações do localStorage e atualiza o state
  function loadRequests() {
    const stored = localStorage.getItem('sc_requests')
    if (stored) setRequests(JSON.parse(stored))
  }

  // Salva o array atualizado no localStorage e no state
  function saveRequests(updated: PurchaseRequest[]) {
    localStorage.setItem('sc_requests', JSON.stringify(updated))
    setRequests(updated)
  }

  // Cria uma nova solicitação com status inicial "pending_quotation"
  function createRequest(
    data: Omit<PurchaseRequest, 'id' | 'status' | 'requesterId' | 'requesterName' | 'createdAt' | 'quotations' | 'supervisorApproval' | 'financialApproval'>,
    user: SafeUser
  ): PurchaseRequest {
    // Lê o array atual direto do localStorage (evita estado desatualizado)
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')
    const newReq: PurchaseRequest = {
      ...data,                                  // copia os campos do formulário
      id: crypto.randomUUID(),                  // ID único
      status: 'pending_quotation',              // sempre começa aqui no fluxo
      requesterId: user.id,
      requesterName: user.name,
      createdAt: new Date().toISOString(),
      quotations: [],                           // começa sem cotações
      supervisorApproval: null,                 // null até o supervisor agir
      financialApproval: null,
    }
    // Adiciona no início do array (mais recente primeiro)
    saveRequests([newReq, ...all])
    return newReq
  }

  // Adiciona uma cotação a uma solicitação existente.
  // Quando atingir 3 cotações, o status avança automaticamente
  // para "pending_supervisor" (regra de negócio do fluxo).
  function addQuotation(
    requestId: string,
    quotation: Omit<Quotation, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>,
    user: SafeUser
  ) {
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')

    // map percorre todas as solicitações.
    // Só modifica a que tem o ID correto, retorna as outras sem alteração.
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

      // Regra de negócio: 3 cotações → avança para aprovação do supervisor
      return { ...r, quotations, status: quotations.length >= 3 ? 'pending_supervisor' : r.status }
    }))
  }

  // Remove uma cotação e, se ficou com menos de 3, volta o status
  function removeQuotation(requestId: string, quotationId: string) {
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      // filter cria um novo array sem o item com o ID a remover
      const quotations = r.quotations.filter((q) => q.id !== quotationId)
      return { ...r, quotations, status: quotations.length < 3 ? 'pending_quotation' : r.status }
    }))
  }

  // Registra a decisão do supervisor e avança o status:
  // approved=true  → 'pending_financial' (vai para o financeiro)
  // approved=false → 'rejected' (reprovado, fim do fluxo)
  function supervisorApprove(
    requestId: string,
    data: Omit<SupervisorApproval, 'supervisorId' | 'supervisorName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      return {
        ...r,
        status: data.approved ? 'pending_financial' : 'rejected',
        supervisorApproval: {
          ...data,
          supervisorId: user.id,
          supervisorName: user.name,
          approvedAt: new Date().toISOString(),
        },
      }
    }))
  }

  // Registra a decisão do financeiro — etapa final do fluxo:
  // approved=true  → 'approved' (compra autorizada!)
  // approved=false → 'rejected' (reprovado pelo financeiro)
  function financialApprove(
    requestId: string,
    data: Omit<FinancialApproval, 'financialId' | 'financialName' | 'approvedAt'>,
    user: SafeUser
  ) {
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')
    saveRequests(all.map((r) => {
      if (r.id !== requestId) return r
      return {
        ...r,
        status: data.approved ? 'approved' : 'rejected',
        financialApproval: {
          ...data,
          financialId: user.id,
          financialName: user.name,
          approvedAt: new Date().toISOString(),
        },
      }
    }))
  }

  // Busca uma solicitação pelo ID — retorna null se não encontrar
  // O operador "??" significa: "se find retornar undefined, retorne null"
  function getRequestById(id: string): PurchaseRequest | null {
    const all: PurchaseRequest[] = JSON.parse(localStorage.getItem('sc_requests') || '[]')
    return all.find((r) => r.id === id) ?? null
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
