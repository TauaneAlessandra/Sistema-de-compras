# ADR 001 — localStorage como camada de persistência no MVP

- **Data:** 2026-04-01
- **Status:** Aceito

## Contexto

O projeto é um sistema web de solicitações de compra que precisa persistir dados entre sessões do navegador. Em uma solução de produção, seria necessário um backend com banco de dados, autenticação segura e API REST. Porém, o objetivo do MVP é validar o fluxo funcional sem a complexidade de infraestrutura.

## Decisão

Utilizar `localStorage` como única camada de persistência do MVP, com as seguintes chaves:

| Chave | Conteúdo |
|---|---|
| `sc_users` | Array de usuários (`User[]`) incluindo senhas |
| `sc_current_user` | Usuário logado (`SafeUser`) sem senha |
| `sc_requests` | Array de solicitações (`PurchaseRequest[]`) com cotações e aprovações aninhadas |

## Consequências

**Positivas:**
- Zero dependência de infraestrutura — roda sem backend, servidor ou banco de dados
- Desenvolvimento e demonstração simplificados
- Fácil de resetar (limpar localStorage)

**Negativas:**
- Dados não são compartilhados entre dispositivos ou usuários
- Senhas armazenadas em texto plano no localStorage (apenas aceitável para MVP/demo)
- Capacidade limitada (~5MB por domínio)
- Sem transações, sem consistência garantida
- Não escalável para múltiplos usuários simultâneos

## Quando revisar

Esta decisão deve ser revisada quando:
- O sistema precisar suportar múltiplos usuários acessando simultaneamente
- For necessária autenticação segura com tokens
- Os dados precisarem ser persistidos em servidor
