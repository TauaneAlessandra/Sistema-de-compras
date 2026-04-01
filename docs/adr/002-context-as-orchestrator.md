# ADR 002 — Context API como orquestrador de estado, não como camada de domínio

- **Data:** 2026-04-01
- **Status:** Aceito (com ressalva — ver problema conhecido)

## Contexto

O sistema usa React Context API (`AuthContext` e `DataContext`) para gerenciar estado global. Na versão atual, esses contextos acumulam responsabilidades de:

- Persistência (leitura/escrita no localStorage)
- Regras de negócio (transições de status, validações)
- Sessão e autenticação
- Mutação de estado global

Isso dificulta testes, manutenção e futura migração para backend.

## Decisão

Adotar a Context API **apenas como orquestrador de estado global** — sem lógica de domínio embutida nos contextos. O objetivo é:

1. Contextos expõem dados e chamam serviços/casos de uso
2. Regras de negócio (transições, validações, permissões) moram em módulos de domínio puros
3. Persistência (localStorage ou futura API) é encapsulada em repositórios

```
Componente React
    ↓ chama hook (useAuth, useData)
Context (orquestrador)
    ↓ chama caso de uso ou repositório
Domain / Application layer
    ↓ lê/escreve
Infrastructure (localStorage, API)
```

## Problema conhecido

A implementação atual (MVP inicial) **ainda não segue completamente esta decisão**. Os contextos contêm regras de negócio diretamente. As tarefas TASK-008, TASK-009 e TASK-010 são responsáveis por executar esta separação.

## Consequências

**Positivas:**
- Contextos mais simples e testáveis
- Domínio isolado — testável sem React
- Migração para backend não exige reescrever os contextos

**Negativas:**
- Maior quantidade de arquivos e camadas
- Indireção adicional na leitura do código
