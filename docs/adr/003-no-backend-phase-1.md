# ADR 003 — Sem backend na Fase 1

- **Data:** 2026-04-01
- **Status:** Aceito

## Contexto

O sistema de compras requer autenticação, controle de acesso por perfil, fluxo de aprovação e persistência de dados. Em produção, esses requisitos demandam um backend com banco de dados, autenticação segura e API. Porém, na Fase 1 o objetivo é validar o fluxo completo de solicitação → cotação → aprovação sem dependências externas.

## Decisão

Não haverá backend na Fase 1. Toda a lógica de negócio, autenticação e persistência roda no cliente (browser) usando `localStorage`.

Isso inclui:
- Autenticação por comparação direta de senha no cliente
- Controle de acesso baseado em role armazenada no `localStorage`
- Todas as regras de transição de status executadas no cliente
- Nenhuma chamada HTTP a servidor externo

## Consequências

**Positivas:**
- Deploy simplificado (qualquer servidor de arquivos estáticos)
- Desenvolvimento sem dependência de infraestrutura
- Demonstração e onboarding imediatos

**Negativas:**
- Segurança inadequada para produção real:
  - Senhas em texto plano no localStorage
  - Roles manipuláveis pelo usuário via DevTools
  - Sem proteção real de rotas (proteção apenas visual via ProtectedRoute)
- Dados isolados por dispositivo/browser
- Sem possibilidade de colaboração multi-usuário real

## Preparação para Fase 2

Para facilitar a migração futura para backend, esta fase já deve:
- Encapsular persistência em repositórios (TASK-009, TASK-010)
- Isolar regras de domínio fora dos contextos React (TASK-008)
- Definir interfaces de repositório agnósticas ao meio de persistência

## Quando revisar

Revisar quando houver necessidade de:
- Múltiplos usuários colaborando em tempo real
- Auditoria real de aprovações
- Integração com sistemas ERP ou financeiros
- Conformidade com requisitos de segurança corporativa
