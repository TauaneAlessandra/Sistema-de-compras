// ============================================================
// types.ts — Tipos compartilhados de todo o sistema
//
// Em TypeScript, centralizamos os tipos em um arquivo separado
// para que todos os componentes "falem a mesma língua".
// Isso evita erros de digitação e facilita a manutenção.
// ============================================================

// "type" define um tipo que é uma união de strings literais.
// O TypeScript vai garantir que só esses valores sejam usados.
export type UserRole = 'admin' | 'requester' | 'area_manager' | 'buyer' | 'supervisor' | 'financial'

// Os status possíveis de uma solicitação, seguindo o fluxo completo do sistema:
// created → pending_area_approval? → pending_quotation → pending_supervisor → pending_financial → approved/rejected
// Saída alternativa: fulfilled_by_stock (compras informa estoque disponível)
export type RequestStatus =
  | 'created'
  | 'pending_area_approval'
  | 'pending_quotation'
  | 'pending_supervisor'
  | 'pending_financial'
  | 'approved'
  | 'rejected'
  | 'fulfilled_by_stock'

// Nível de urgência da solicitação
export type UrgencyLevel = 'low' | 'medium' | 'urgent'

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

// Tipos de evento de auditoria — cada ação de negócio gera um desses
export type AuditEventType =
  | 'created'
  | 'area_approved'
  | 'area_rejected'
  | 'quotation_added'
  | 'quotation_removed'
  | 'supervisor_approved'
  | 'supervisor_rejected'
  | 'financial_approved'
  | 'financial_rejected'
  | 'fulfilled_by_stock'
  | 'os_generated'

// Entrada na linha do tempo de uma solicitação
export interface AuditEvent {
  id: string
  type: AuditEventType
  actorId: string
  actorName: string
  actorRole: UserRole
  timestamp: string                    // ISO 8601
  observation?: string                 // aprovações, rejeições, estoque
  metadata?: Record<string, string>    // ex: { quotationId, supplier }
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
  supplier: string          // Nome do fornecedor
  price: number             // Preço total (number, não string)
  deliveryDays: number      // Prazo de entrega em dias
  observations: string
  supplierAddress?: string  // Endereço/localização do fornecedor (opcional)
  buyerId: string           // Quem registrou a cotação
  buyerName: string
  createdAt: string
}

// Dados da aprovação feita pelo Responsável da Área
export interface AreaApproval {
  approved: boolean
  observation: string
  approverId: string
  approverName: string
  approvedAt: string
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
  purchaseDate: string     // Data prevista para a compra (formato YYYY-MM-DD)
  paymentMethod: string    // Forma de pagamento (ex: "PIX", "Boleto", "Cartão")
  paymentTerms: string     // Prazo de pagamento (ex: "À vista", "30 dias")
  supplierBankInfo?: string // Dados bancários do fornecedor (opcional)
  observation: string
  financialId: string
  financialName: string
  approvedAt: string
}

// Ordem de Serviço gerada automaticamente na aprovação financeira
export interface ServiceOrder {
  id: string
  number: string          // Formato: OS-YYYY-NNN (ex: OS-2026-001)
  requestId: string       // Referência à solicitação de compra
  generatedAt: string     // ISO 8601
  generatedById: string
  generatedByName: string
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

  deliveryLocation: string                      // Local de entrega
  deliveryDeadline: string                      // Prazo de entrega desejado (YYYY-MM-DD)

  // Controle do fluxo de aprovação da área
  needsAreaApproval: boolean                    // true se solicitante não é area_manager
  areaApproval: AreaApproval | null             // null até o responsável da área agir

  // Controle de estoque
  stockFulfilled: boolean                       // true se compras encerrou por estoque
  stockObservation?: string                     // observação quando encerrado por estoque

  quotations: Quotation[]                       // Array de cotações (mín. 3 para avançar)
  supervisorApproval: SupervisorApproval | null // null até o supervisor agir
  financialApproval: FinancialApproval | null   // null até o financeiro agir

  history: AuditEvent[]                         // linha do tempo cronológica de todos os eventos
}
