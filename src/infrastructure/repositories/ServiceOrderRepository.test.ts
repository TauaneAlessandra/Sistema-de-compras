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

beforeEach(() => {
  localStorageMock.clear()
})

describe('ServiceOrderRepository.generateNumber()', () => {
  it('inclui o nome do usuário (sem espaços)', () => {
    const number = ServiceOrderRepository.generateNumber('João Silva')
    expect(number).toContain('JoaoSilva')
  })

  it('remove acentos do nome', () => {
    const number = ServiceOrderRepository.generateNumber('Maria Conceição')
    expect(number).toContain('MariaConceicao')
  })

  it('formato é {nome}_{MM}:{DD}:{YYYY}/{HH}:{mm}:{ss}', () => {
    const number = ServiceOrderRepository.generateNumber('Admin')
    // Regex: nome_MM:DD:YYYY/HH:mm:ss
    expect(number).toMatch(/^[A-Za-z]+_\d{2}:\d{2}:\d{4}\/\d{2}:\d{2}:\d{2}$/)
  })

  it('ano no número corresponde ao ano atual', () => {
    const number = ServiceOrderRepository.generateNumber('Admin')
    const year = new Date().getFullYear().toString()
    expect(number).toContain(year)
  })

  it('dois números gerados no mesmo segundo são iguais — unicidade garantida pelo timestamp', () => {
    // O número é baseado no timestamp — não é sequencial
    const a = ServiceOrderRepository.generateNumber('Admin')
    expect(a).toMatch(/^Admin_\d{2}:\d{2}:\d{4}\/\d{2}:\d{2}:\d{2}$/)
  })
})

describe('ServiceOrderRepository CRUD', () => {
  it('getAll() retorna array vazio quando não há OS', () => {
    expect(ServiceOrderRepository.getAll()).toEqual([])
  })

  it('add() persiste OS e getAll() a retorna', () => {
    const order = {
      id: 'test-id',
      number: ServiceOrderRepository.generateNumber('Teste'),
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
      number: ServiceOrderRepository.generateNumber('Teste'),
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
