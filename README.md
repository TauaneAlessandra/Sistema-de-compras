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
Solicitante cria pedido
       ↓
Comprador adiciona 3 cotações
       ↓
Supervisor seleciona fornecedor e aprova/reprova
       ↓
Financeiro define data de compra e aprova/reprova
       ↓
Solicitação finalizada (Aprovada ou Reprovada)
```

## Perfis de Usuário

| Perfil | Permissões |
|---|---|
| **Admin** | Acesso total a todas as telas e ações |
| **Solicitante** | Cria e acompanha suas próprias solicitações |
| **Comprador** | Adiciona cotações às solicitações pendentes |
| **Supervisor** | Aprova ou reprova após cotações registradas |
| **Financeiro** | Aprovação final com data prevista de compra |

## Usuários Padrão

| Nome | E-mail | Senha | Perfil |
|---|---|---|---|
| Admin | admin@empresa.com | admin123 | Admin |
| Ana Souza | ana@empresa.com | 123456 | Solicitante |
| Carlos Lima | carlos@empresa.com | 123456 | Comprador |
| Mariana Costa | mariana@empresa.com | 123456 | Supervisor |
| Roberto Alves | roberto@empresa.com | 123456 | Financeiro |

## Tecnologias

- **React 18** + **TypeScript** (strict)
- **Vite** — build tool
- **Tailwind CSS v3** — estilização
- **React Router DOM v6** — roteamento
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
```

## Estrutura de Pastas

```
src/
├── components/         # Componentes reutilizáveis (ImageCropper)
├── context/            # AuthContext e DataContext (estado global)
├── pages/
│   ├── dashboard/      # Dashboard com gráficos e filtros
│   ├── requests/
│   │   ├── list/       # Lista de solicitações
│   │   ├── new/        # Nova solicitação
│   │   └── detail/     # Detalhe + cotações
│   ├── approvals/
│   │   ├── supervisor/ # Aprovação do supervisor
│   │   └── financial/  # Aprovação financeira
│   ├── users/          # Gerenciamento de usuários
│   └── login/          # Tela de login
└── types.ts            # Tipos TypeScript compartilhados
```
