# CRM Omnichannel WAHA

CRM omnichannel com integração WhatsApp via [WAHA](https://waha.devlike.pro/), IA conversacional com múltiplos provedores e pipeline de vendas Kanban.

## Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Wouter
- **Backend:** Express, tRPC v11, WebSocket (ws), Drizzle ORM
- **Banco de Dados:** PostgreSQL
- **WhatsApp:** WAHA (WhatsApp HTTP API)
- **IA:** OpenAI, Claude, Gemini, Ollama, OpenRouter

## Funcionalidades

- Dashboard com métricas e gráficos (vendas, conversas, leads, atendentes)
- Pipeline de vendas Kanban com drag-and-drop
- Conversas WhatsApp em tempo real via WebSocket
- IA conversacional com contexto (multi-provedor)
- Base de conhecimento RAG (PDF, DOCX, TXT, CSV)
- Fila de atendimento humano com distribuição automática
- Automações com triggers e ações configuráveis
- Sistema de tags e filtros
- Auditoria completa de ações
- Gestão de usuários por role (Administrador, Supervisor, Atendente)

## Requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+
- [WAHA](https://waha.devlike.pro/) (WhatsApp HTTP API)

## Instalação Rápida

```bash
# Clone o repositório
git clone <repo-url> crm-waha
cd crm-waha

# Instale as dependências
pnpm install

# Configure o ambiente
cp .env.example .env
# Edite .env com suas credenciais (banco, WAHA, IA)

# Execute as migrações do banco
pnpm run db:push

# Inicie em desenvolvimento
pnpm run dev
```

Acesse: `http://localhost:3000`

## Documentação

- [Guia de Deploy](docs/deploy.md) - Deploy com Docker Compose
- [Configuração WAHA](docs/waha-config.md) - Setup do WhatsApp
- [Configuração IA](docs/ai-config.md) - Provedores de IA
- [Fluxos Principais](docs/fluxos.md) - Fluxos do sistema
- [API Swagger](http://localhost:3000/api/docs) - Documentação da API (após iniciar o servidor)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia servidor de desenvolvimento com hot-reload |
| `pnpm build` | Gera build de produção (client + server) |
| `pnpm start` | Inicia servidor em produção |
| `pnpm test` | Executa todos os testes (Vitest) |
| `pnpm check` | Verificação de tipos TypeScript |
| `pnpm db:push` | Gera e aplica migrações do banco |

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL |
| `JWT_SECRET` | Sim | Segredo para assinatura JWT |
| `WAHA_API_URL` | Opcional | URL da API WAHA (default: http://localhost:3001) |
| `WAHA_API_KEY` | Opcional | Chave de API WAHA |
| `OPENAI_API_KEY` | Opcional | API Key OpenAI |
| `CLAUDE_API_KEY` | Opcional | API Key Anthropic Claude |
| `GEMINI_API_KEY` | Opcional | API Key Google Gemini |
| `PORT` | Opcional | Porta do servidor (default: 3000) |
| `NODE_ENV` | Opcional | Ambiente (development/production) |

## Estrutura do Projeto

```
├── client/           # Frontend React
│   └── src/
│       ├── components/  # Componentes reutilizáveis
│       ├── pages/       # Páginas da aplicação
│       └── lib/         # Utilitários e client tRPC
├── server/           # Backend Express + tRPC
│   ├── _core/          # Core (servidor, tRPC, context)
│   ├── routers/        # tRPC routers
│   ├── services/       # Serviços (IA, RAG, Automação)
│   └── db.ts           # Funções de banco de dados
├── shared/           # Código compartilhado
├── drizzle/          # Schema e migrações Drizzle
└── docs/             # Documentação
```

## Testes

294 testes unitários cobrindo todos os routers:

```bash
pnpm test
```
