# Fluxos Principais do Sistema

## 1. Fluxo de Conversa WhatsApp

```
WhatsApp User → WAHA → Webhook → CRM
                                   ├─ Salva mensagem no banco
                                   ├─ Atualiza conversa (lastMessageAt)
                                   ├─ Cria/atualiza contato
                                   ├─ Cria lead (se não existir)
                                   ├─ Broadcast WebSocket (tempo real)
                                   └─ Processa resposta:
                                       ├─ Se IA ativa → AI Service
                                       │   ├─ Busca contexto (histórico + contato + RAG)
                                       │   ├─ Detecta handoff
                                       │   └─ Gera e envia resposta
                                       └─ Se waiting_human → Fila de atendimento
```

## 2. Fluxo de Vendas (Kanban)

```
Lead criado → Estágio inicial
    ├─ Atendente move card (drag-and-drop)
    │   └─ moveLeadToStage() → AuditLog
    ├─ Automação move baseado em trigger
    │   └─ Ex: "sim" → move para próximo estágio
    └─ Pipeline completo: 8 estágios
        └─ Ganho → Taxa de conversão atualizada
        └─ Perdido → Registrado como perdido
```

## 3. Fluxo de Atendimento Humano

```
Conversa ativa
├─ IA detecta handoff → status: waiting_human
├─ Usuário solicita atendente (UI)
└─ Sistema enfileira → Attendance Queue
    ├─ Distribuição automática (round-robin)
    │   └─ Menos atendimentos → Próximo agente
    ├─ Atribuição manual (supervisor)
    └─ Atendente assume → status: assigned/in_progress
        ├─ Atendente responde (UI)
        ├─ Pode reativar IA
        └─ Pode encerrar conversa
```

## 4. Fluxo de Automações

```
Evento dispara trigger:
├─ message_contains: "palavra-chave" na mensagem
├─ response_yes: cliente responde "sim"
└─ inactivity_hours: X horas sem interação

Se trigger atende → Executa ação:
├─ move_stage: move lead no Kanban
├─ send_message: envia follow-up automático
├─ add_tag: adiciona tag ao lead
└─ assign_user: atribui a atendente específico
```

## 5. Fluxo de Base de Conhecimento (RAG)

```
Upload documento (PDF/DOCX/TXT/CSV)
    ├─ Extração de texto
    ├─ Geração de embeddings (via provedor IA ativo)
    └─ Armazenamento no banco

Busca (durante conversa):
    ├─ Query do usuário → embedding
    ├─ Busca semântica (similaridade)
    ├─ Top-K documentos mais relevantes
    └─ Contexto adicionado ao prompt da IA
```

## 6. Fluxo de Auditoria

```
Toda ação crítica é registrada:
├─ login / logout → auditLogs (user)
├─ create / update / delete → qualquer entidade
├─ move_kanban → movimentação entre estágios
├─ transfer_conversation → transferência de atendente
├─ send_message / receive_message → mensagens
└─ Filtros: por usuário, ação, entidade, data

Acesso: Supervisores e Administradores
Interface: /audit-logs
```

## 7. Fluxo de WebSocket (Tempo Real)

```
Cliente conecta → ws://host/ws
    ├─ auth → associa userId
    ├─ join_conversation → associa conversationId
    ├─ typing → broadcast para outros na conversa
    └─ Servidor broadcast:
        ├─ broadcastToConversation(id, msg) → mensagens na conversa
        └─ broadcastToAll(msg) → notificações globais
```

## 8. Fluxo de Autenticação

```
Registro:
    POST /api/trpc/auth.register
    → Cria usuário (role: Atendente)
    → Gera JWT (7 dias)
    → Cookie httpOnly

Login:
    POST /api/trpc/auth.login
    → Verifica email/senha (bcrypt)
    → Gera JWT
    → Cookie httpOnly + AuditLog(login)

Logout:
    POST /api/trpc/auth.logout
    → Limpa cookie
    → AuditLog(logout)

Middleware:
    Contexto tRPC extrai JWT do cookie/header
    → protectedProcedure: requer token válido
    → adminProcedure: requer role=Administrador
    → supervisorProcedure: requer role=Supervisor ou Administrador
```

## Roles e Permissões

| Funcionalidade | Atendente | Supervisor | Administrador |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Conversas | ✅ | ✅ | ✅ |
| Kanban | ✅ | ✅ | ✅ |
| Configurações IA | ❌ | ❌ | ✅ |
| Base Conhecimento | ✅ | ✅ | ✅ |
| Automações (criar/editar) | ❌ | ❌ | ✅ |
| Filas atendimento | ✅ | ✅ | ✅ |
| Tags (criar/editar) | ❌ | ❌ | ✅ |
| Usuários (CRUD) | ❌ | ❌ | ✅ |
| Equipe | ❌ | ✅ | ✅ |
| Auditoria | ❌ | ✅ | ✅ |
| Sessões WhatsApp | ❌ | ❌ | ✅ |
| Config. WAHA | ❌ | ❌ | ✅ |
