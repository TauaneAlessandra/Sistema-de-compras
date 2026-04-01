# Decision Log

Registro de decisões tomadas durante o desenvolvimento do projeto.

---

| # | Data | Decisão | Motivo | Impacto |
|---|---|---|---|---|
| 001 | 2026-04-01 | Usar `localStorage` como persistência no MVP | Eliminar dependência de backend para validar o fluxo funcional | Dados isolados por browser, senhas em texto plano — aceitável para MVP |
| 002 | 2026-04-01 | Context API como orquestrador, não como camada de domínio | Facilitar testes e futura migração para API | Exige separação gradual do código existente |
| 003 | 2026-04-01 | Sem backend na Fase 1 | Foco no fluxo de negócio sem infraestrutura | Zero segurança real — aceitável para demo interna |
| 004 | 2026-04-01 | Extrair regras de status para `domain/workflow.ts` | Código de domínio testável sem React ou storage | DataContext delega decisões ao domínio |
| 005 | 2026-04-01 | Criar `PurchaseRequestRepository` e `AuthRepository` | Encapsular acesso ao localStorage — preparar para troca por API | Contexts não acessam `localStorage` diretamente |
| 006 | 2026-04-01 | Adotar Vitest como framework de testes | Integração nativa com Vite, zero config extra | Testes de domínio rodam em `node` environment |
| 007 | 2026-04-01 | Mover `SidebarContent` para fora de `Layout` | Violava `react-hooks/static-components` — componente criado durante render | Props explícitas passadas para `SidebarContent` |
| 008 | 2026-04-01 | Usar lazy initializer no `useState` para init de localStorage | Evita `setState` síncrono dentro de `useEffect` (violação do react-hooks/set-state-in-effect v7) | Inicialização mais correta; remove necessidade de `useEffect` para carregar dados iniciais |
| 009 | 2026-04-01 | Configurar ESLint para cobrir `.ts` e `.tsx` com typescript-eslint | ESLint cobria apenas `.js/.jsx` — código TypeScript ficava sem análise | Erros e warnings em contextos e páginas foram identificados e corrigidos |
