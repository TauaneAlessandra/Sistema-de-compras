// ============================================================
// types.ts — Tipos compartilhados de todo o sistema
//
// Em TypeScript, centralizamos os tipos em um arquivo separado
// para que todos os componentes "falem a mesma língua".
// Isso evita erros de digitação e facilita a manutenção.
// ============================================================

// "type" define um tipo que é uma união de strings literais.
// O TypeScript vai garantir que só esses valores sejam usados.
export type UserRole = 'admin' | 'requester' | 'buyer' | 'supervisor' | 'financial'

// Os status possíveis de uma solicitação, seguindo o fluxo do sistema:
// pending_quotation → pending_supervisor → pending_financial → approved/rejected
export type RequestStatus = 'pending_quotation' | 'pending_supervisor' | 'pending_financial' | 'approved' | 'rejected'

// Nível de urgência da solicitação
export type UrgencyLevel = 'low' | 'medium' | 'high'

// "interface" define a forma (shape) de um objeto.
// Cada campo tem um nome e um tipo.
export interface User {
  id: string           // ID único gerado com crypto.randomUUID()
  name: string
  email: string
  password: string     // Senha em texto plano (apenas no banco/localStorage)
  role: UserRole       // Usa o tipo definido acima
  active: boolean      // Usuários desativados não conseguem logar
  createdAt: string    // Data no formato ISO 8601 (ex: "2024-01-15T10:30:00.000Z")
}

// SafeUser é o User SEM a senha — usamos esse tipo no estado da sessão.
// Assim a senha nunca fica exposta no React State ou no sessionStorage.
// "Omit<User, 'password'>" seria outra forma de escrever isso.
export interface SafeUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  createdAt: string
}

// Uma cotação feita pelo Comprador com dados de um fornecedor
export interface Quotation {
  id: string
  supplier: string       // Nome do fornecedor
  price: number          // Preço total (number, não string)
  deliveryDays: number   // Prazo de entrega em dias
  observations: string
  buyerId: string        // Quem registrou a cotação
  buyerName: string
  createdAt: string
}

// Dados da aprovação feita pelo Supervisor
export interface SupervisorApproval {
  approved: boolean              // true = aprovado, false = reprovado
  selectedQuotationId: string   // ID da cotação escolhida
  observation: string
  supervisorId: string
  supervisorName: string
  approvedAt: string
}

// Dados da aprovação feita pelo Financeiro
export interface FinancialApproval {
  approved: boolean
  purchaseDate: string   // Data prevista para a compra (formato YYYY-MM-DD)
  observation: string
  financialId: string
  financialName: string
  approvedAt: string
}

// A solicitação de compra principal — agrega tudo
export interface PurchaseRequest {
  id: string
  title: string
  description: string
  quantity: number
  unit: string                // Ex: "un", "kg", "cx"
  urgency: UrgencyLevel
  justification: string
  imageUrl?: string            // O "?" torna o campo opcional — pode ser undefined

  status: RequestStatus        // Status atual no fluxo

  requesterId: string          // Quem criou
  requesterName: string
  createdAt: string

  quotations: Quotation[]                       // Array de cotações (máx. 3)
  supervisorApproval: SupervisorApproval | null // null até o supervisor agir
  financialApproval: FinancialApproval | null   // null até o financeiro agir
}
