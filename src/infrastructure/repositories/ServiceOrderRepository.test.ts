import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ServiceOrderRepository } from './ServiceOrderRepository'

// Mock de localStorage para rodar no ambiente Node (Vitest usa node por default)
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

// Limpa o store antes de cada teste para garantir isolamento
beforeEach(() => {
  localStorageMock.clear()
})

describe('ServiceOrderRepository.nextNumber()', () => {
  it('retorna formato OS-YYYY-NNN', () => {
    const number = ServiceOrderRepository.nextNumber()
    expect(number).toMatch(/^OS-\d{4}-\d{3}$/)
  })

  it('ano corresponde ao ano atual', () => {
    const number = ServiceOrderRepository.nextNumber()
    const year = new Date().getFullYear().toString()
    expect(number).toContain(`OS-${year}-`)
  })

  it('incrementa sequencialmente', () => {
    const first = ServiceOrderRepository.nextNumber()
    const second = ServiceOrderRepository.nextNumber()
    const third = ServiceOrderRepository.nextNumber()

    const n1 = parseInt(first.split('-')[2])
    const n2 = parseInt(second.split('-')[2])
    const n3 = parseInt(third.split('-')[2])

    expect(n2).toBe(n1 + 1)
    expect(n3).toBe(n2 + 1)
  })

  it('primeiro número é OS-YYYY-001', () => {
    const number = ServiceOrderRepository.nextNumber()
    const year = new Date().getFullYear()
    expect(number).toBe(`OS-${year}-001`)
  })
})

describe('ServiceOrderRepository CRUD', () => {
  it('getAll() retorna array vazio quando não há OS', () => {
    expect(ServiceOrderRepository.getAll()).toEqual([])
  })

  it('add() persiste OS e getAll() a retorna', () => {
    const order = {
      id: 'test-id',
      number: 'OS-2026-001',
      requestId: 'req-1',
      generatedAt: new Date().toISOString(),
      generatedById: 'user-1',
      generatedByName: 'Teste',
    }
    ServiceOrderRepository.add(order)
    expect(ServiceOrderRepository.getAll()).toHaveLength(1)
    expect(ServiceOrderRepository.getAll()[0].id).toBe('test-id')
  })

  it('getById() retorna a OS correta', () => {
    const order = {
      id: 'find-me',
      number: 'OS-2026-001',
      requestId: 'req-1',
      generatedAt: new Date().toISOString(),
      generatedById: 'user-1',
      generatedByName: 'Teste',
    }
    ServiceOrderRepository.add(order)
    expect(ServiceOrderRepository.getById('find-me')).not.toBeNull()
    expect(ServiceOrderRepository.getById('nao-existe')).toBeNull()
  })
})
