# Sistema de Compras

Sistema web para gerenciamento de solicitações de compra, com fluxo de aprovação em múltiplos níveis: solicitante → comprador → supervisor → financeiro.

## Funcionalidades

- Fluxo completo de solicitação e aprovação de compras
- Cotação com até 3 fornecedores por solicitação
- Aprovação do supervisor com seleção de fornecedor e observação
- Aprovação financeira com data prevista de compra e observação
- Upload e recorte de imagem do item solicitado
- Dashboard com gráficos por período (dia, semana, mês, ano) e filtros por status
- Gerenciamento de usuários com 5 perfis de acesso
- Persistência local via localStorage (sem necessidade de backend)

## Fluxo de uma Solicitação

```
Solicitante cria pedido  →  status: pending_quotation
       ↓ (3 cotações registradas)
Comprador adiciona cotações  →  status: pending_supervisor
       ↓
Supervisor seleciona fornecedor e aprova/reprova
  - Aprovado  →  status: pending_financial
  - Reprovado →  status: rejected
       ↓
Financeiro define data de compra e aprova/reprova
  - Aprovado  →  status: approved
  - Reprovado →  status: rejected
```

## Perfis de Usuário

| Perfil | Permissões |
|---|---|
| **Admin** | Acesso total a todas as telas e ações |
| **Solicitante** | Cria e acompanha suas próprias solicitações |
| **Comprador** | Adiciona e remove cotações das solicitações em pending_quotation |
| **Supervisor** | Aprova ou reprova solicitações em pending_supervisor |
| **Financeiro** | Aprovação final das solicitações em pending_financial |

## Usuários Padrão

| Nome | E-mail | Senha | Perfil |
|---|---|---|---|
| Administrador | admin@empresa.com | 123456 | Admin |
| João Solicitante | joao@empresa.com | 123456 | Solicitante |
| Maria Compradora | maria@empresa.com | 123456 | Comprador |
| Carlos Supervisor | carlos@empresa.com | 123456 | Supervisor |
| Ana Financeiro | ana@empresa.com | 123456 | Financeiro |

> Os usuários são criados no localStorage na primeira execução. Para resetar, limpe o localStorage do navegador.

## Tecnologias

- **React 19** + **TypeScript 6** (strict mode)
- **Vite 8** — build tool
- **Tailwind CSS v3** — estilização
- **React Router DOM v7** — roteamento
- **Recharts** — gráficos do dashboard
- **react-easy-crop** — recorte de imagem
- **lucide-react** — ícones

## Como Rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Gerar build de produção
npm run build

# Verificar tipos TypeScript
npx tsc --noEmit

# Verificar lint
npm run lint
```

## Estrutura de Pastas

```
src/
├── vite-env.d.ts           # Declaração de tipos do Vite (CSS imports, import.meta.env)
├── types.ts                # Tipos TypeScript compartilhados
├── App.tsx                 # Roteamento principal
├── main.tsx                # Entry point React
├── components/
│   ├── Layout.tsx          # Sidebar + header mobile (wrapper das páginas autenticadas)
│   ├── ProtectedRoute.tsx  # Guard de rota por perfil
│   └── ImageCropper.tsx    # Utilitário de recorte de imagem
├── context/
│   ├── AuthContext.tsx     # Sessão, login/logout, CRUD de usuários
│   └── DataContext.tsx     # Solicitações: criação, cotações, aprovações
└── pages/
    ├── login/              # Tela de login
    ├── dashboard/          # Dashboard com gráficos e estatísticas
    ├── requests/
    │   ├── index.tsx       # Lista de solicitações com filtros
    │   ├── new/            # Formulário de nova solicitação
    │   └── detail/         # Detalhe, cotações e histórico de aprovações
    ├── approvals/
    │   ├── supervisor/     # Fila de aprovação do supervisor
    │   └── financial/      # Fila de aprovação financeira
    └── users/              # Gerenciamento de usuários (somente admin)
```

## Limitações do MVP

- Persistência apenas via `localStorage` (sem backend real)
- Autenticação sem token seguro (senha comparada no cliente)
- Máximo de 3 cotações por solicitação
- Sem notificações ou e-mails
- Sem histórico de alterações por solicitação
- Soft delete para usuários (desativação, não exclusão física)
