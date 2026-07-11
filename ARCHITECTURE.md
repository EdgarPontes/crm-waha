# Arquitetura - CRM Omnichannel WAHA

## Visão Geral

Sistema completo de CRM omnichannel com integração nativa ao WhatsApp via WAHA, automação por IA conversacional, gerenciamento de funil de vendas em Kanban e suporte a atendimento humano com fila de distribuição.

---

## Stack Técnico

### Backend
- **Node.js 22+** com Express 4
- **tRPC 11** para comunicação type-safe
- **PostgreSQL** como banco de dados
- **Drizzle ORM** para gerenciamento de schema
- **Socket.IO** para comunicação em tempo real
- **JWT** para autenticação

### Frontend
- **React 19** com Vite
- **TypeScript** para tipagem
- **Tailwind CSS 4** para estilos
- **shadcn/ui** para componentes
- **React Query** para cache de dados
- **Zustand** para state management
- **Socket.IO Client** para eventos em tempo real

### Infraestrutura
- **Docker** para containerização
- **WAHA** como API do WhatsApp
- **Manus Forge API** para LLM e storage

---

## Modelo de Dados (Drizzle Schema)

### Tabelas Principais

#### Users (Autenticação)
- `id` (PK)
- `openId` (Manus OAuth)
- `name`, `email`
- `role` (Administrador, Supervisor, Atendente)
- `createdAt`, `updatedAt`, `lastSignedIn`

#### Contacts (Contatos)
- `id` (PK)
- `whatsappNumber` (UNIQUE)
- `name`, `avatar`
- `email`, `phone`
- `companyId` (FK)
- `createdAt`, `updatedAt`, `lastInteractionAt`

#### Leads (Leads/Oportunidades)
- `id` (PK)
- `contactId` (FK)
- `companyId` (FK)
- `stageId` (FK → Stages)
- `assignedToUserId` (FK → Users)
- `tags` (JSON array)
- `notes` (text)
- `createdAt`, `updatedAt`, `closedAt`

#### Conversations (Conversas)
- `id` (PK)
- `contactId` (FK)
- `companyId` (FK)
- `leadId` (FK)
- `currentAssignedUserId` (FK)
- `status` (active, waiting_human, closed)
- `aiProvider` (openai, claude, gemini, ollama, openrouter)
- `unreadCount`
- `lastMessageAt`
- `createdAt`, `updatedAt`

#### Messages (Mensagens)
- `id` (PK)
- `conversationId` (FK)
- `senderId` (FK → Users, NULL se for contato)
- `senderPhone` (para mensagens de contatos)
- `type` (text, image, audio, video, document, location)
- `content` (text)
- `mediaUrl` (para mídias)
- `metadata` (JSON)
- `waMessageId` (ID do WAHA)
- `status` (sent, delivered, read)
- `createdAt`

#### Pipelines (Funis de Vendas)
- `id` (PK)
- `companyId` (FK)
- `name`
- `description`
- `isDefault`
- `createdAt`, `updatedAt`

#### Stages (Colunas do Kanban)
- `id` (PK)
- `pipelineId` (FK)
- `name` (Novo Lead, Primeiro Contato, Qualificação, Proposta, Negociação, Fechamento, Ganho, Perdido)
- `order` (posição na ordem)
- `createdAt`

#### Tags (Etiquetas)
- `id` (PK)
- `companyId` (FK)
- `name`
- `color`
- `createdAt`

#### WhatsAppSessions (Sessões WAHA)
- `id` (PK)
- `companyId` (FK)
- `sessionName` (UNIQUE per company)
- `status` (disconnected, connecting, connected, error)
- `qrCode` (text, armazenar QR code em base64)
- `phoneNumber` (preenchido após conexão)
- `lastErrorMessage`
- `createdAt`, `updatedAt`

#### AIConfigurations (Configurações de IA)
- `id` (PK)
- `companyId` (FK)
- `provider` (openai, claude, gemini, ollama, openrouter)
- `apiKey` (encrypted)
- `model` (nome do modelo)
- `systemPrompt` (instrução do sistema)
- `temperature`, `maxTokens`
- `isActive`
- `createdAt`, `updatedAt`

#### KnowledgeBaseDocuments (Base de Conhecimento)
- `id` (PK)
- `companyId` (FK)
- `fileName`
- `fileType` (pdf, docx, txt, csv)
- `fileUrl` (S3)
- `content` (texto extraído)
- `embeddings` (para RAG)
- `uploadedBy` (FK → Users)
- `createdAt`

#### Automations (Regras de Automação)
- `id` (PK)
- `companyId` (FK)
- `name`
- `trigger` (message_contains, response_yes, inactivity_hours)
- `triggerValue` (string/number)
- `action` (move_stage, send_message, add_tag)
- `actionValue` (JSON)
- `isActive`
- `createdAt`, `updatedAt`

#### AuditLogs (Auditoria)
- `id` (PK)
- `companyId` (FK)
- `userId` (FK)
- `action` (login, logout, create, update, delete, move_kanban, transfer_conversation)
- `entityType` (lead, conversation, message)
- `entityId`
- `changes` (JSON)
- `createdAt`

#### Notes (Notas Internas)
- `id` (PK)
- `conversationId` (FK)
- `userId` (FK)
- `content` (text)
- `createdAt`, `updatedAt`

---

## Fluxos Principais

### 1. Recebimento de Mensagem WhatsApp
```
WAHA Webhook (message event)
  ↓
Validar assinatura
  ↓
Buscar/Criar Contact (por whatsappNumber)
  ↓
Buscar/Criar Lead (se não existir)
  ↓
Buscar/Criar Conversation
  ↓
Armazenar Message
  ↓
Se IA ativa e status != "Aguardando Atendente":
  - Recuperar histórico
  - Buscar contexto do lead
  - Consultar Knowledge Base (RAG)
  - Enviar para IA
  - Gerar resposta
  - Armazenar resposta
  - Enviar via WAHA
  ↓
Emitir evento via Socket.IO para atualização em tempo real
```

### 2. Handoff para Atendente Humano
```
IA detecta trigger (cliente pediu humano, reclamação, etc)
  ↓
Alterar status da Conversation para "Aguardando Atendente"
  ↓
Parar respostas automáticas
  ↓
Adicionar à fila de atendimento
  ↓
Distribuir para atendente disponível (automático ou manual)
  ↓
Notificar atendente
  ↓
Emitir evento Socket.IO
```

### 3. Drag-and-Drop no Kanban
```
Usuário arrasta Lead entre colunas
  ↓
Validar permissão (Administrador/Supervisor)
  ↓
Atualizar stageId do Lead
  ↓
Registrar em AuditLogs
  ↓
Emitir evento Socket.IO para todos os usuários
```

### 4. Configuração de IA
```
Administrador acessa painel de configurações
  ↓
Seleciona provider (OpenAI, Claude, etc)
  ↓
Insere API key (criptografada)
  ↓
Define modelo, temperatura, max tokens
  ↓
Define system prompt
  ↓
Testa conexão
  ↓
Salva configuração
```

---

## Endpoints tRPC Principais

### Auth
- `auth.me` - Obter usuário atual
- `auth.logout` - Fazer logout

### Contacts
- `contacts.list` - Listar contatos com filtros
- `contacts.get` - Obter detalhes de um contato
- `contacts.create` - Criar contato manualmente
- `contacts.update` - Atualizar contato

### Leads
- `leads.list` - Listar leads com filtros
- `leads.get` - Obter detalhes de um lead
- `leads.update` - Atualizar lead
- `leads.moveStage` - Mover lead entre colunas
- `leads.addTag` - Adicionar tag
- `leads.removeTag` - Remover tag

### Conversations
- `conversations.list` - Listar conversas
- `conversations.get` - Obter conversa com histórico
- `conversations.markAsRead` - Marcar como lida
- `conversations.assignToUser` - Atribuir a um atendente
- `conversations.requestHuman` - Solicitar atendente humano
- `conversations.close` - Encerrar conversa

### Messages
- `messages.send` - Enviar mensagem
- `messages.list` - Listar mensagens de uma conversa

### WhatsApp Sessions
- `whatsapp.sessions.list` - Listar sessões
- `whatsapp.sessions.create` - Criar nova sessão
- `whatsapp.sessions.getQR` - Obter QR code
- `whatsapp.sessions.disconnect` - Desconectar sessão
- `whatsapp.sessions.status` - Obter status

### Kanban
- `kanban.stages.list` - Listar colunas
- `kanban.leads.byStage` - Listar leads por coluna

### AI Configuration
- `ai.config.get` - Obter configuração atual
- `ai.config.update` - Atualizar configuração
- `ai.config.testConnection` - Testar conexão

### Knowledge Base
- `kb.documents.list` - Listar documentos
- `kb.documents.upload` - Upload de documento
- `kb.documents.delete` - Deletar documento

### Automations
- `automations.list` - Listar automações
- `automations.create` - Criar automação
- `automations.update` - Atualizar automação
- `automations.delete` - Deletar automação

### Dashboard
- `dashboard.metrics` - Obter métricas do dashboard

### Users
- `users.list` - Listar usuários (admin only)
- `users.create` - Criar usuário (admin only)
- `users.update` - Atualizar usuário (admin only)
- `users.delete` - Deletar usuário (admin only)

---

## Eventos Socket.IO

### Real-time Updates
- `conversation:new` - Nova conversa criada
- `conversation:message` - Nova mensagem
- `conversation:status_changed` - Status alterado
- `conversation:assigned` - Conversa atribuída
- `lead:moved` - Lead movido no Kanban
- `lead:updated` - Lead atualizado
- `session:status_changed` - Status da sessão WhatsApp alterado
- `queue:updated` - Fila de atendimento atualizada

---

## Segurança

- **Autenticação:** Manus OAuth
- **Autorização:** Role-based (Administrador, Supervisor, Atendente)
- **Criptografia:** API keys de IA armazenadas criptografadas
- **Validação:** Todas as entradas validadas com Zod
- **Auditoria:** Todas as ações registradas em AuditLogs
- **LGPD:** Suporte a exclusão de dados do contato

---

## Fases de Implementação

### Fase 1: Fundação
- Schema Drizzle completo
- Autenticação e autorização
- Integração básica WAHA (conexão, envio/recebimento)

### Fase 2: CRM Base
- Cadastro automático de contatos e leads
- Tela de conversação básica
- Kanban de vendas funcional

### Fase 3: IA e Automação
- Integração com provedores de IA
- Sistema de automações
- Base de Conhecimento (RAG)

### Fase 4: Atendimento Humano
- Fila de atendimento
- Distribuição automática
- Notas internas

### Fase 5: Dashboard e Refinamentos
- Dashboard com métricas
- Auditoria completa
- Testes e otimizações

---

## Considerações de Performance

- **Caching:** React Query para cache de dados no frontend
- **Paginação:** Implementar paginação para listas grandes
- **Índices:** Adicionar índices no PostgreSQL para queries frequentes
- **WebSocket:** Usar Socket.IO com rooms por company/conversation
- **Uploads:** Armazenar arquivos em S3, não no banco

---

## Próximos Passos

1. Criar schema Drizzle completo
2. Gerar migrações SQL
3. Implementar procedures tRPC
4. Construir UI do dashboard
5. Integrar WAHA
6. Implementar IA conversacional
7. Adicionar atendimento humano
8. Criar dashboard com métricas
